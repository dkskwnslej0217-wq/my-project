-- 콘텐츠 성과 수집 테이블 (데이터 플라이휠)
CREATE TABLE IF NOT EXISTS content_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('threads','instagram','youtube','other')),
  title TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  posted_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_stats_user_id ON content_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_content_stats_project_id ON content_stats(project_id);
CREATE INDEX IF NOT EXISTS idx_content_stats_platform ON content_stats(platform);
