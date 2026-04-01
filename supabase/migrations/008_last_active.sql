-- 이탈 감지용 마지막 접속 시간
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
