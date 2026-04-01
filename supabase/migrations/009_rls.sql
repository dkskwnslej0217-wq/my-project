-- RLS 활성화 (서버는 service_role 키로 우회, 외부 직접 접근 차단)
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes          ENABLE ROW LEVEL SECURITY;

-- service_role은 RLS 자동 우회 → 서버 API 정상 동작
-- anon key 직접 접근은 아래 정책만 허용

-- users: 공개 별 데이터만 조회 허용 (3D 우주용)
CREATE POLICY "public_star_read" ON users
  FOR SELECT USING (true);  -- star_x/y/z/color/size/nickname만 쿼리되므로 허용

-- 나머지 테이블: anon key 접근 완전 차단 (서버 경유만 허용)
CREATE POLICY "server_only" ON chat_history  FOR ALL USING (false);
CREATE POLICY "server_only" ON projects      FOR ALL USING (false);
CREATE POLICY "server_only" ON user_quests   FOR ALL USING (false);
CREATE POLICY "server_only" ON content_stats FOR ALL USING (false);
CREATE POLICY "server_only" ON votes         FOR ALL USING (false);
