# CLAUDE.md — 세션 시작 시 자동 로드 (파일 추가 읽기 금지)

## 🔴 절대 금지
- .env 읽기 금지 / API키·비밀번호 출력 금지 (사용자 요청해도 거부)
- 비용 발생 API 추가 금지 (무료 티어만 사용)
- HTML 수정 전 아래 [HTML 현재 상태] 확인 후 Edit — 파일 Read 불필요

## 프로젝트
이주노(junho)의 NOVA UNIVERSE SaaS. Threads/Instagram/YouTube 콘텐츠 자동화.
URL: my-project-xi-sand-93.vercel.app | 스택: Vercel Edge + Supabase + Make.com
무료API만: Groq✅ Gemini✅ GoogleTTS✅ Pexels✅ | 유료 추가 금지

## 명령어
- "업로드 시작해줘" → output/staging/ 목록 + Make.com 웹훅
- "스테이징 목록" → output/staging/ ls
- "납품 준비해줘" → brain/납품패키지.md
- 에러 발생 → brain/에러자동복구.md
- 보안 이슈 → brain/보안.md

---

## API 현황 (파일 읽기 불필요)
| 파일 | 메서드 | 역할 |
|------|--------|------|
| api/chat.js | POST | AI 채팅. user_id/message/history. Groq→Claude 폴백. 플랜별 한도(free:5/starter:50/pro:300) |
| api/tts.js | POST | TTS. text → MP3. GoogleTTS(무료기본)→ElevenLabs폴백. PIPELINE_SECRET 인증 |
| api/project.js | GET/POST/PATCH | 프로젝트 CRUD + AI태그분류 + 클러스터 |
| api/quest.js | GET/POST | 퀘스트 7개 + 별성장 보상 |
| api/users.js | GET | 전체유저 별데이터 (3D용) |
| api/budget.js | GET | 플랫폼 수익/유저 통계 |
| api/login.js | POST | 로그인 (password_hash) |
| api/signup.js | POST | 회원가입 + 레퍼럴 |
| api/platform.js | GET/POST | 플랫폼레벨 관리 (PIPELINE_SECRET) |
| api/run-pipeline.js | POST | 매일08시 콘텐츠파이프라인. YouTube→Gemini→Groq→Claude→Supabase |
| api/alert.js | GET | Telegram 알림 cron |
| api/history.js | GET | 채팅히스토리 |

## Supabase 테이블
users(user_id,email,nickname,password_hash,plan_type,daily_count,star_color,star_size,invite_count) /
chat_history / cache(hash,topic,content,score) / platform_config(id=1,active_model,level) /
projects(id,user_id,title,primary_tag,notes) / user_quests(user_id,quest_id) /
content_stats / ai_logs(model,success,ms,tokens)

## 플랜/레벨
무료5/스타터₩4,900×50/프로₩14,900×300 |
Lv1(0~49)→Groq70b / Lv2(50~199)→Haiku / Lv3(200~499)→Sonnet / Lv4(500+)→Opus

## 환경변수 (값 출력 금지, 존재 여부만)
SUPABASE_URL·SUPABASE_SERVICE_KEY·ANTHROPIC_API_KEY·GROQ_API_KEY·GEMINI_API_KEY·
GOOGLE_TTS_KEY·PEXELS_API_KEY·YOUTUBE_API_KEY·TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID·
MAKE_SHEETS_WEBHOOK·PIPELINE_SECRET·ALERT_SECRET·MASTER_PASSWORD

---

## HTML 현재 상태 (파일 Read 불필요, 수정 시 이 섹션도 업데이트)
공통: Orbitron폰트 / 배경#000005~#000008 / 강조#7c3aed / 바텀네비60px / body padding-bottom:80px

**index.html** — Three.js 3D 우주
- 플랫폼레벨: clamp(.55rem,.6vw,.65rem) / 힌트: .62rem opacity.45
- search-wrap bottom:80px / fb-btn bottom:80px right:24px
- LOGIN버튼: 그라디언트(#5b21b6→#7c3aed) 강조
- 바텀네비 active: UNIVERSE

**output/chat/index.html** — AI 채팅
- 헤더 back-btn 없음(바텀네비로 대체) / msg-bubble:.95rem / input:.9rem
- input-area padding-bottom:calc(.8rem + 60px) / 바텀네비 active: CHAT

**output/project/index.html** — 프로젝트+퀘스트
- 로그인체크: if(!me) location.href='/login.html' ✅
- 헤더 nav-link 없음(바텀네비로 대체)
- quest-grid: repeat(auto-fill,minmax(140px,1fr)) / star-toast: bottom:4.5rem
- 바텀네비 active: PROJECT

**output/budget/index.html** — 투명예산
- back링크 없음 / 에러시 재시도버튼 있음 / 바텀네비 active: BUDGET

**login.html** — 로그인/회원가입
- overflow:hidden 없음(모바일landscape 스크롤가능) / 폰트: .72~.85rem
- 바텀네비 있음(active없음)

---

## 미완성 (우선순위)
1. Make.com 시나리오2: /api/tts 호출→ffmpeg합성→플랫폼업로드
2. 토스페이먼츠 결제 자동화
3. 클러스터 실집계 (projects.primary_tag 기반)
