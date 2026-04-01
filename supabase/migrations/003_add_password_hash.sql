-- users 테이블 password_hash 컬럼 추가 (없을 경우만)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
