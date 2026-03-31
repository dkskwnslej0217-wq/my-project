## ⚠️ 세션 시작 시 필수 체크
1. memory/오늘요약.md 파일 열기
2. 파일 맨 위 날짜 확인
3. 오늘 날짜(실행 당일)와 다르면 → 아래 경고 출력 후 중단:
   "⚠️ 오늘요약.md가 오래됐어. 날짜: [파일날짜] / 오늘: [오늘날짜]. run_core.md 실행해서 먼저 갱신해줘."
4. 날짜 일치하면 → 정상 진행

## AI 파이프라인 (chat.js)
| 순서 | 모델 | 조건 |
|------|------|------|
| 1 | groq-70b (llama-3.3-70b-versatile) | 메인 — 최대 2회 시도 |
| 2 | groq-8b (llama-3.1-8b-instant) | fallback — 최대 2회 시도 |
| 3 | hardcoded 안내 메시지 | 모든 모델 실패 시 |
- 실패 조건: HTTP 비-200, 네트워크 오류
- Observability: Supabase `ai_logs` 테이블 (model, success, response_ms, tokens, error)

새 세션 시작 시 이것만 읽으면 됨:
1. memory/오늘요약.md 읽기 (6줄)
2. 위 Notion 페이지 읽기
https://www.notion.so/33226c2a3eab81a1947ae6fa1d874bc1
3. 바로 이어서 진행
