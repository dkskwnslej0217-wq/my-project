#!/bin/bash
# 인증 스크립트 — run_core.md / run_weekly.md 실행 전 반드시 통과

source .env

# 잠금 상태 확인
if [ "$LOCKOUT" = "true" ]; then
  echo "❌ 시스템 잠금 상태입니다. .env에서 LOCKOUT=false로 변경하세요."
  exit 1
fi

# 비밀번호 입력받기 (인수로 전달 또는 프롬프트)
if [ -z "$1" ]; then
  read -s -p "MASTER PASSWORD: " INPUT
  echo
else
  INPUT="$1"
fi

# 해시 비교
INPUT_HASH=$(echo -n "$INPUT" | sha256sum | cut -d' ' -f1)
STORED_HASH=$(echo -n "$MASTER_PASSWORD" | sha256sum | cut -d' ' -f1)

# 실패 횟수 파일
FAIL_FILE=".auth_fails"
FAIL_COUNT=0
if [ -f "$FAIL_FILE" ]; then
  FAIL_COUNT=$(cat "$FAIL_FILE")
fi

if [ "$INPUT_HASH" != "$STORED_HASH" ]; then
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "$FAIL_COUNT" > "$FAIL_FILE"
  echo "❌ 인증 실패 ($FAIL_COUNT/3)"

  # 3회 연속 실패 시 잠금
  if [ "$FAIL_COUNT" -ge 3 ]; then
    sed -i 's/LOCKOUT=false/LOCKOUT=true/' .env
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "## $TIMESTAMP — 비인가 접근 감지 (3회 실패 → 자동 잠금)" >> brain/보안로그.md
    echo "❌ 비인가 접근 감지 — 시스템 잠금됨"
    rm -f "$FAIL_FILE"
  fi

  exit 1
fi

# 인증 성공
rm -f "$FAIL_FILE"
echo "✅ 인증 성공 — 실행을 계속합니다."
exit 0
