-- 플랫폼 레벨 + 성장 펀드 관리
CREATE TABLE IF NOT EXISTS platform_config (
  id int PRIMARY KEY DEFAULT 1,
  level int DEFAULT 1,
  user_count int DEFAULT 0,
  monthly_revenue int DEFAULT 0,    -- 원 단위
  api_cost int DEFAULT 0,
  growth_fund int DEFAULT 0,        -- 성장 펀드 누적 (원)
  active_model text DEFAULT 'groq-70b',
  unlocked_tools text[] DEFAULT '{}',
  next_unlock_goal int DEFAULT 50,  -- 다음 레벨 목표 유저 수
  updated_at timestamptz DEFAULT now()
);
INSERT INTO platform_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 월별 수익 스냅샷
CREATE TABLE IF NOT EXISTS platform_budget (
  id bigserial PRIMARY KEY,
  month text NOT NULL,              -- 'YYYY-MM'
  revenue int DEFAULT 0,
  api_cost int DEFAULT 0,
  junho_profit int DEFAULT 0,       -- revenue * 0.6
  growth_fund int DEFAULT 0,        -- revenue * 0.2
  user_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_budget_month_idx ON platform_budget(month);
