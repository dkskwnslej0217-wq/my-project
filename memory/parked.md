<!-- 보류 항목 — 나중에 필요할 때 찾기 -->

## 이메일 인증 (도메인 구매 후 활성화)

**현황:** 비활성화 (signup.js — 가입 시 바로 세션 발급)
**이유:** Resend `onboarding@resend.dev`는 계정 소유자 이메일만 수신 가능. 다른 유저 발송 불가.

**활성화 방법:**
1. 도메인 구매
2. Resend 도메인 인증 → `RESEND_FROM` Vercel 환경변수 추가
3. signup.js 복원 — 아래 흐름으로:
   - 인증 코드 생성 → email_verifications 테이블 INSERT
   - Resend로 코드 발송
   - `needs_verification: true` 반환
   - 프론트에서 6자리 코드 입력 → `/api/verify-email` 호출

**관련 파일:**
- `api/signup.js` — 발송 로직 (주석 처리됨)
- `api/verify-email.js` — 인증 완료 처리 (그대로 유지)
- `output/login.html` — verify 탭 UI (그대로 유지)
- Supabase: `email_verifications` 테이블 (그대로 유지)
