-- 프로젝트 테이블
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  primary_tag TEXT DEFAULT 'other',
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 유저 퀘스트 완료 테이블
CREATE TABLE IF NOT EXISTS user_quests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, quest_id)
);

-- users 테이블에 total_chat_count 추가 (퀘스트용, 리셋 없음)
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_chat_count INTEGER DEFAULT 0;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_primary_tag ON projects(primary_tag);
CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON user_quests(user_id);
