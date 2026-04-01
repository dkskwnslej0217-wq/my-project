-- chat_history 테이블: 유저별 대화 저장
CREATE TABLE IF NOT EXISTS chat_history (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_history_user_id_idx ON chat_history(user_id, created_at DESC);
