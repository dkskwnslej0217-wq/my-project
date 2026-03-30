# run_core — 매번 실행 (가벼움)

## 준비 단계
0. Supabase keep-alive: `SELECT count(*) FROM memory LIMIT 1;`
   → 연결 유지 (정지 방지) — 응답 없으면 에러 로그 후 계속 진행

1. brain/파일맵.md → 감사관 체크리스트 실행
   → 이상 없으면 진행
   → 이상 있으면 자동 수정 후 진행
   → 심각한 문제 → 즉시 중단 + 보고

2. brain/인증.md → MASTER_PASSWORD 확인
   → 인증 실패 시 즉시 중단

3. Supabase users 테이블에서 user_id 조회
   → 오늘 실행 횟수 확인
   → 플랜별 한도 초과 시 중단 + 업그레이드 안내
   → 한도 이내면 daily_count +1 후 진행
   → 전체 유저 수 조회: `SELECT count(*) FROM users;`
      - 10명 이상 → "⚠️ 유저 10명 돌파 — 폴백 시스템 도입 검토할 때입니다 (brain/폴백시스템.md)"
      - 50명 이상 → "🚨 유저 50명 돌파 — Claude API 연동 강력 권장"

4. skills/토큰최적화.md → 오늘 필요한 파일만 선별
   → 선별된 파일만 로드, 나머지 로드 금지

5. brain/모델선택.md → 작업 복잡도 판단 → 최적 모델 선택

## 콘텐츠 생성 단계
6.  Supabase 최근 5개 불러오기 (user_id 필터)
7.  memory/캘린더.md → 오늘 주제 확인
8.  없으면 멀티소스 수집 → 트렌드.md 저장
9.  brain/판단.md → 주제 확정 (중복 체크 + 카테고리 분류)
10. brain/개인화.md → 성공 패턴 확인
11. 경쟁자 분석 → 차별화 포인트
12. brain/바이럴공식.md → 공식 1개 선택
13. 플랫폼 판단 → 해당 skills/ 1개만 로드
    - Threads → 텍스트 콘텐츠 생성
    - Instagram → 텍스트 생성 후 brain/영상생성.md 체크리스트 확인
      → 체크리스트 ✅ → 영상 생성 / ❌ → 스크립트만 저장
    - YouTube → 텍스트 생성 후 brain/영상생성.md 체크리스트 확인
      → 체크리스트 ✅ → 영상 생성 / ❌ → 스크립트만 저장
14. 콘텐츠 생성 — brain/멀티모델파이프라인.md 실행:
    14a. Gemini Flash → 트렌드 키워드 추출
    14b. Groq → 훅 초안 3개 생성 (빠름)
    14c. Claude → 최종 완성 + 브랜드 톤 적용
15. skills/출력포맷.md → 플랫폼별 포맷 적용
16. brain/감정분석.md → 감정 흐름 체크

## 검증 + 저장 단계
17. 자기검증 + 범죄이용방지 체크
18. output/ 저장
19. memory/context.md 업데이트
20. 자기점수 산정 (score_trend / score_hook / score_comment / score_total)
21. score 5점 이하 → brain/실패감지.md 실행 + brain/에러알림.md (텔레그램 알림)
22. Supabase 저장
23. score_total ≥ 7점일 때만 → output/staging/ 저장 (헤더 포함: platform/topic/score/status:staging)
    score < 7 → output/ 저장만 (staging 제외)
    ※ 업로드는 "업로드 시작해줘" 명령 시 brain/스테이징.md 실행

## 완료
24. 완료 보고 (3줄 이내)
25. 연속실행 ON → 다음 주제 제안

## 조건부 실행
- 5회마다 → brain/자기학습.md
- 10회마다 → brain/댓글분석.md + brain/예측엔진.md + brain/성능모니터.md + brain/피드백루프.md + brain/커뮤니티수집.md

## 종료 전
brain/백업.md → 오늘 변경사항 백업

## 자동 저장
마지막. brain/자동저장.md 규칙에 따라
오늘 한 작업 memory/변경로그.md에 자동 저장

## 오늘 요약 덮어쓰기
매 실행 후 memory/오늘요약.md를 아래 형식으로 덮어쓰기:

=== 세션 컨텍스트 ===
날짜: [오늘날짜]
마지막 작업: [뭐 했는지 한 줄]
다음 할 것: [뭐 할지 한 줄]
시스템 상태: [정상/주의/오류]
현재 단계: [몇 단계까지 완료]
주의사항: [있으면 한 줄]
===================
