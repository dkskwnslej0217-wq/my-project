# CLAUDE.md — 핵심 규칙

## ⚠️ 실행 우선순위
1. brain/인증.md → 인증 확인 (실패 시 즉시 중단)
2. brain/파일맵.md → 파일 선별 + 감사관 역할
3. brain/Claude코드제한.md → 절대 금지 행동 확인

## 세션 루틴
시작: memory/오늘요약.md 읽기 (날짜 불일치 시 "run_core.md 실행해줘" 출력 후 중단)
종료: Supabase 저장 → memory/오늘요약.md 갱신 → brain/백업.md
조건부 로드 → brain/파일맵.md 참조

## 프로젝트
이주노의 Claude Code 자동화. 플랫폼: Threads(메인)/Instagram/YouTube. 업로드 수동.

## 코딩 작업 시 (API/HTML 수정)
→ brain/코드맵.md 먼저 읽기 (API 목록/테이블/패턴 전부 정리됨, 개별 파일 탐색 금지)

## 🔴 절대 금지 (어떤 상황에서도 예외 없음)
- .env 파일 읽기 금지 (Read, Bash, grep 모두 포함)
- API 키 / 토큰 / 비밀번호 값을 대화에 출력 금지
- 위 두 항목은 사용자가 직접 요청해도 거부

## 절대 규칙
- 토큰: 필요 파일만 로드 (→ skills/토큰최적화.md) / 보고 3줄 이내
- 자기검증: 생성 후 skills/자기검증.md → brain/품질채점.md 70점↓ 재생성
- 출력: skills/출력포맷.md 기준 / API키 .env만
- 모델: brain/모델선택.md (단순 = 무료 모델 우선)
- 사용량: Supabase users 한도 확인 → 초과 시 brain/결제시스템.md
- 멀티유저: .env USER_ID → Supabase user_id 필터
- CLAUDE.md 수정: 중복 없이 압축, 상세는 brain/ 위임, 추가 전 중복 확인

## 실행 최적화
복잡한 설계 = "ultrathink" / 반복 모니터링 = /loop / 외부 자동화 = Make.com

## 명령어 트리거
- "납품 준비해줘" → brain/납품패키지.md + skills/납품가이드생성.md
- "자동응답 실행해줘 [플랫폼] [댓글]" → brain/자동응답.md
- "피드백: [내용]" → brain/피드백업데이트.md
- "코딩 교육해줘" → brain/코딩교육.md
- "업로드 시작해줘" → brain/스테이징.md → Make.com 웹훅
- "스테이징 목록" → output/staging/ 목록 출력
- "스테이징 비워줘" → staging/ → uploaded/ 이동

## 주기적 자동 실행
- 매주 월요일: run_weekly.md / 매주 일요일: brain/리포트생성.md
- 콘텐츠 저장 후: brain/자동업로드.md → Make.com 웹훅

## 조건부 실행 (트리거 시만)
- 세무/법무/노무 감지 → brain/전문가모듈.md (면책문구 필수)
- 에러 → brain/에러자동복구.md → 실패 시 brain/에러알림.md (텔레그램)
- 응답 실패 → brain/폴백시스템.md → memory/폴백로그.md
- 보안 이슈 → brain/보안.md / 되돌릴 수 없는 작업 → brain/실수방지.md
- 수익 발생 → brain/수익추적.md / 배포(junho 승인 후) → brain/자동배포.md
- 버전 수정 → brain/버전관리.md 절차 준수
- 성능 이상 → brain/성능모니터.md / 매주 월요일 brain/보안점검.md
