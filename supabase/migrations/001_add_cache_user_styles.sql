-- =============================================
-- 001_add_cache_user_styles.sql
-- 신규 테이블 추가 (기존 테이블 변경 없음)
-- Supabase SQL Editor에서 실행
-- =============================================

-- 1. cache 테이블
CREATE TABLE IF NOT EXISTS cache (
  hash        text PRIMARY KEY,
  topic       text,
  platform    text,
  content     text,
  score       int,
  hit_count   int DEFAULT 0,
  created_at  timestamp DEFAULT now(),
  expires_at  timestamp
);

-- RLS
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cache_read" ON cache FOR SELECT USING (true);
CREATE POLICY "cache_insert" ON cache FOR INSERT WITH CHECK (true);

-- =============================================

-- 2. user_styles 테이블
CREATE TABLE IF NOT EXISTS user_styles (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     text NOT NULL,
  style_type  text NOT NULL, -- 'hook' | 'tone' | 'comment'
  pattern     text NOT NULL, -- 학습된 패턴 텍스트
  score       int DEFAULT 0, -- 평균 품질점수
  usage_count int DEFAULT 0, -- 적용 횟수
  created_at  timestamp DEFAULT now(),
  updated_at  timestamp DEFAULT now()
);

-- user_id 인덱스
CREATE INDEX IF NOT EXISTS user_styles_user_id_idx ON user_styles (user_id);

-- RLS
ALTER TABLE user_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_styles_own" ON user_styles
  USING (user_id = current_setting('app.user_id', true));
