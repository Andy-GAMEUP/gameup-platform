#!/bin/bash
#
# GAMEUP Platform - 전체 서버 재시작 스크립트
# 사용법: ./scripts/restart-all.sh
#
# MongoDB + API 서버 + Web 서버를 한번에 재시작합니다.
#

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  🎮 GAMEUP Platform - 전체 서버 재시작${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── 1. 기존 프로세스 종료 ──────────────────────────
echo -e "${YELLOW}[1/3] 기존 프로세스 종료 중...${NC}"

# Web 서버 (포트 3000) 종료
WEB_PIDS=$(lsof -ti:3000 2>/dev/null || true)
if [ -n "$WEB_PIDS" ]; then
  echo "$WEB_PIDS" | xargs kill -9 2>/dev/null || true
  echo -e "  ✓ Web 서버 (포트 3000) 종료"
else
  echo -e "  - Web 서버 (포트 3000) 미실행"
fi

# API 서버 (포트 5000) 종료
API_PIDS=$(lsof -ti:5000 2>/dev/null || true)
if [ -n "$API_PIDS" ]; then
  echo "$API_PIDS" | xargs kill -9 2>/dev/null || true
  echo -e "  ✓ API 서버 (포트 5000) 종료"
else
  echo -e "  - API 서버 (포트 5000) 미실행"
fi

sleep 1

# ── 2. MongoDB 재시작 ──────────────────────────────
echo ""
echo -e "${YELLOW}[2/3] MongoDB 재시작 중...${NC}"

if command -v brew &>/dev/null && brew services list 2>/dev/null | grep -q "mongodb-community"; then
  brew services restart mongodb-community@7.0 2>/dev/null \
    || brew services restart mongodb-community 2>/dev/null \
    || echo -e "  ${RED}⚠ brew restart 실패, 수동 시작 시도${NC}"
fi

# MongoDB 연결 대기 (최대 15초)
echo -e "  ⏳ MongoDB 연결 대기중..."
MONGO_OK=false
for i in $(seq 1 15); do
  if mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q "1"; then
    MONGO_OK=true
    break
  fi
  sleep 1
done

if [ "$MONGO_OK" = true ]; then
  echo -e "  ${GREEN}✓ MongoDB (포트 27017) 실행 중${NC}"
else
  echo -e "  ${RED}✗ MongoDB 연결 실패 - 수동으로 확인해주세요${NC}"
  echo -e "  ${YELLOW}  brew services start mongodb-community@7.0${NC}"
  exit 1
fi

# ── 3. 개발 서버 시작 (turbo) ──────────────────────
echo ""
echo -e "${YELLOW}[3/3] 개발 서버 시작 중...${NC}"

cd "$PROJECT_ROOT"
pnpm dev &
DEV_PID=$!

# 서버 기동 대기
echo -e "  ⏳ 서버 시작 대기중..."
MAX_WAIT=30
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))

  API_OK=$(curl -s http://localhost:5000/api/health 2>/dev/null | grep -c '"ok"' || true)
  WEB_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || true)

  if [ "$API_OK" -ge 1 ] && [ "$WEB_OK" = "200" ]; then
    break
  fi
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 최종 상태 확인
API_STATUS=$(curl -s http://localhost:5000/api/health 2>/dev/null | grep -c '"ok"' || true)
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || true)
DB_STATUS=$(mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null || echo "0")

if [ "$DB_STATUS" = "1" ]; then
  echo -e "  MongoDB    :27017  ${GREEN}✅ 실행 중${NC}"
else
  echo -e "  MongoDB    :27017  ${RED}❌ 연결 실패${NC}"
fi

if [ "$API_STATUS" -ge 1 ] 2>/dev/null; then
  echo -e "  API 서버   :5000   ${GREEN}✅ 실행 중${NC}"
else
  echo -e "  API 서버   :5000   ${RED}❌ 시작 실패${NC}"
fi

if [ "$WEB_STATUS" = "200" ]; then
  echo -e "  Web 서버   :3000   ${GREEN}✅ 실행 중${NC}"
else
  echo -e "  Web 서버   :3000   ${RED}❌ 시작 실패${NC}"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  🌐 Web:  ${GREEN}http://localhost:3000${NC}"
echo -e "  🔌 API:  ${GREEN}http://localhost:5000${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# foreground로 turbo dev 유지
wait $DEV_PID
