-- Rate limit 테이블 + 함수
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (key)
);

-- check_rate_limit 함수: 초과 시 true 반환
CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_window INTEGER, p_limit INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
  v_start TIMESTAMPTZ;
BEGIN
  SELECT count, window_start INTO v_count, v_start FROM rate_limits WHERE key = p_key;

  IF NOT FOUND THEN
    INSERT INTO rate_limits(key, count, window_start) VALUES (p_key, 1, now())
      ON CONFLICT (key) DO NOTHING;
    RETURN FALSE;
  END IF;

  -- 윈도우 만료 시 리셋
  IF EXTRACT(EPOCH FROM (now() - v_start)) > p_window THEN
    UPDATE rate_limits SET count = 1, window_start = now() WHERE key = p_key;
    RETURN FALSE;
  END IF;

  -- 한도 초과
  IF v_count >= p_limit THEN RETURN TRUE; END IF;

  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN FALSE;
END;
$$;
