# Make.com 시나리오 설계

## 핵심 개념
Claude는 생성만 한다. 저장은 Make.com이 한다.
Claude → /api/log 웹훅 1번 호출 → Make.com이 Supabase + 구글시트 동시 저장

---

## 시나리오 1: 콘텐츠 저장 (NOVA_CONTENT_SAVE)

### 트리거
Webhooks > Custom webhook
이름: nova-content-save

### 받는 데이터 구조
```json
{
  "type": "content",
  "timestamp": "2026-03-30T10:00:00Z",
  "platform": "threads",
  "title": "콘텐츠 제목",
  "body": "본문 내용",
  "score": 8,
  "user_id": "junho"
}
```

### 액션 순서
1. Webhooks (트리거) — 위 데이터 수신
2. Router (분기)
   ├─ 경로 A: Supabase > Insert Row
   │   테이블: contents
   │   필드: platform, title, body, score, user_id, created_at(timestamp)
   └─ 경로 B: Google Sheets > Add Row
       시트: 콘텐츠기록
       열: 날짜 | 플랫폼 | 제목 | 점수 | 상태

---

## 시나리오 2: 구독자 저장 (NOVA_SUBSCRIBER_SAVE)

### 트리거
Webhooks > Custom webhook
이름: nova-subscriber-save

### 받는 데이터
```json
{
  "type": "subscriber",
  "timestamp": "2026-03-30T10:00:00Z",
  "email": "user@example.com",
  "name": "이름",
  "plan": "free",
  "source": "landing"
}
```

### 액션 순서
1. Webhooks (트리거)
2. Router
   ├─ 경로 A: Supabase > Upsert Row (subscribers 테이블, email 기준 중복 방지)
   └─ 경로 B: Google Sheets > Add Row
       시트: 구독자목록
       열: 날짜 | 이메일 | 이름 | 플랜 | 유입경로

---

## 시나리오 3: 결제 기록 (NOVA_PAYMENT_LOG)

### 받는 데이터
```json
{
  "type": "payment",
  "timestamp": "2026-03-30T10:00:00Z",
  "email": "user@example.com",
  "plan": "pro",
  "amount": 14900,
  "method": "toss"
}
```

### 액션 순서
1. Webhooks (트리거)
2. Router
   ├─ 경로 A: Supabase > Update Row (users 테이블, plan_type 업데이트)
   ├─ 경로 B: Google Sheets > Add Row (결제기록 시트)
   └─ 경로 C: Email (Gmail) > junho한테 "결제 완료" 알림

---

## 시나리오 4: 에러 알림 (NOVA_ERROR_ALERT)

### 받는 데이터
```json
{
  "type": "error",
  "timestamp": "2026-03-30T10:00:00Z",
  "source": "api/chat",
  "message": "Groq rate limit exceeded",
  "severity": "high"
}
```

### 액션 순서
1. Webhooks (트리거)
2. Google Sheets > Add Row (에러로그 시트)
3. Telegram > Send Message (junho에게 즉시 알림)

---

## 구글시트 구조 (탭 4개)

| 탭 이름 | 열 구성 |
|---------|--------|
| 콘텐츠기록 | 날짜 / 플랫폼 / 제목 / 점수 / 상태 |
| 구독자목록 | 날짜 / 이메일 / 이름 / 플랜 / 유입경로 |
| 결제기록 | 날짜 / 이메일 / 플랜 / 금액 / 결제수단 |
| 에러로그 | 날짜 / 소스 / 메시지 / 심각도 |

---

## /api/log 호출 방법 (Claude가 사용)

콘텐츠 생성 후:
```
POST /api/log
{ "type":"content", "platform":"threads", "title":"제목", "body":"본문", "score":8 }
```

구독자 신청:
```
POST /api/log
{ "type":"subscriber", "email":"...", "name":"...", "plan":"free" }
```

에러 발생:
```
POST /api/log
{ "type":"error", "source":"api/chat", "message":"오류내용", "severity":"high" }
```

---

## Make.com 설정 순서

1. make.com 접속 → Create new scenario
2. 시나리오 이름: NOVA_SAVE (위 4개 통합 or 분리)
3. 트리거: Webhooks > Custom webhook → URL 복사
4. .env의 MAKE_SHEETS_WEBHOOK 값을 새 URL로 업데이트
5. Router 추가 → type 값으로 분기
   - type == "content" → Supabase + Sheets
   - type == "subscriber" → Supabase + Sheets
   - type == "payment" → Supabase + Sheets + Email
   - type == "error" → Sheets + Telegram
6. 각 경로에 Supabase, Google Sheets 모듈 연결
7. 시나리오 ON

---

## 효과
- Claude 토큰: 저장 관련 0
- Make.com ops: 이벤트당 3~4 ops (무료 1000ops/월)
- 구글시트: junho가 실시간으로 현황 파악 가능
- Supabase: 코드에서 조회 가능
