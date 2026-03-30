#!/bin/bash
# run_safe.sh — 실행 전 보안 강제 레이어
# 텍스트 규칙이 아닌 실제 코드로 차단

source .env 2>/dev/null

LOGFILE="memory/보안로그.md"
NOW=$(date '+%Y-%m-%d %H:%M:%S')
BLOCKED=false

block() {
  echo "🚫 차단: $1"
  echo "- $NOW | 차단 | $1" >> "$LOGFILE"
  # 텔레그램 알림
  if [ -n "$TELEGRAM_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s "https://api.telegram.org/bot$TELEGRAM_TOKEN/sendMessage" \
      --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
      --data-urlencode "text=🚫 BLOCKED: $1" > /dev/null
  fi
  BLOCKED=true
}

warn() {
  echo "⚠️  경고: $1"
  echo "- $NOW | 경고 | $1" >> "$LOGFILE"
}

# ── 1. .env 필수 키 존재 확인 ──────────────────────────
REQUIRED_KEYS=("MASTER_PASSWORD" "SUPABASE_URL" "SUPABASE_KEY" "USER_ID")
for key in "${REQUIRED_KEYS[@]}"; do
  if [ -z "${!key}" ]; then
    block ".env 필수 키 누락: $key"
  fi
done

# ── 2. LOCKOUT 확인 ────────────────────────────────────
if [ "$LOCKOUT" = "true" ]; then
  block "LOCKOUT=true — 시스템 잠금 상태. junho가 직접 해제 필요"
fi

# ── 3. 시간 제한 (새벽 2시~6시 차단) ──────────────────
HOUR=$(date '+%H')
if [ "$HOUR" -ge 2 ] && [ "$HOUR" -lt 6 ]; then
  block "새벽 2시~6시 실행 금지 (현재 ${HOUR}시)"
fi

# ── 4. API Rate Limit 카운터 ───────────────────────────
COUNTER_FILE="memory/api_counter.txt"
if [ ! -f "$COUNTER_FILE" ]; then
  echo "0 $(date '+%Y-%m-%d %H')" > "$COUNTER_FILE"
fi

read COUNT SAVED_DATE SAVED_HOUR < "$COUNTER_FILE"
CURRENT_DATE=$(date '+%Y-%m-%d')
CURRENT_HOUR=$(date '+%H')

if [ "$SAVED_DATE $SAVED_HOUR" = "$CURRENT_DATE $CURRENT_HOUR" ]; then
  COUNT=$((COUNT + 1))
else
  COUNT=1
fi
echo "$COUNT $CURRENT_DATE $CURRENT_HOUR" > "$COUNTER_FILE"

if [ "$COUNT" -gt 10 ]; then
  block "1시간 10회 초과 (현재 ${COUNT}회) — API 한도 보호"
fi

# ── 5. output/ 외부 경로 접근 감지 ────────────────────
ALLOWED_BASE="/c/Users/김서현/Desktop/my-project"
if [ -n "$1" ] && [[ "$1" != ${ALLOWED_BASE}* ]]; then
  block "허용 경로 외 접근 시도: $1"
fi

# ── 6. .env 내용 출력 감지 ────────────────────────────
# (Claude가 .env 읽어서 출력하면 git push 전 스캔)
if [ -f ".env" ]; then
  if git diff --cached -- .env 2>/dev/null | grep -q "^+"; then
    block ".env 파일이 git staging에 포함됨 — 즉시 제거 필요"
  fi
fi

# ── 7. 대용량 삭제 감지 ────────────────────────────────
# 3개 초과 삭제 시 경고 (Claude Code hook에서 호출 시)
if [ "$ACTION" = "delete" ] && [ -n "$FILE_COUNT" ]; then
  if [ "$FILE_COUNT" -gt 3 ]; then
    block "파일 ${FILE_COUNT}개 삭제 시도 — 최대 3개 제한"
  fi
fi

# ── 결과 ──────────────────────────────────────────────
if [ "$BLOCKED" = true ]; then
  echo ""
  echo "실행이 차단되었습니다. memory/보안로그.md 확인하세요."
  exit 1
fi

echo "✅ 보안 체크 통과 ($NOW) | 이번 시간 ${COUNT}회째 실행"
echo "- $NOW | 통과 | ${COUNT}회" >> "$LOGFILE"
exit 0
