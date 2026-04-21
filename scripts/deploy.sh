#!/bin/bash
# ============================================================
# GameUp 배포 스크립트 (서버에서 실행)
# - CI/CD(GitHub Actions)와 수동 배포 모두 지원
# - 변경 경로 분석 → 영향받는 서비스만 재빌드 (빌드 시간 최소화)
# ============================================================

set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/gameup}"
LOG_FILE="${REPO_DIR}/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cd "$REPO_DIR"

log "━━━ 배포 시작 ━━━"

# ─── 1. 현재 커밋 저장 (롤백 대비) ─────────────────────────
PREV_COMMIT=$(git rev-parse HEAD)
log "이전 커밋: ${PREV_COMMIT}"

# ─── 2. 최신 코드 가져오기 ─────────────────────────────────
git fetch origin main
NEW_COMMIT=$(git rev-parse origin/main)

if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
  log "ℹ️  변경 사항 없음 - 배포 건너뜀"
  exit 0
fi

log "신규 커밋: ${NEW_COMMIT}"

# ─── 3. 변경 경로 분석 ────────────────────────────────────
CHANGED_FILES=$(git diff --name-only "${PREV_COMMIT}" "${NEW_COMMIT}")
log "변경 파일 수: $(echo "$CHANGED_FILES" | wc -l)"

REBUILD_API=false
REBUILD_WEB=false
REBUILD_NGINX=false

if echo "$CHANGED_FILES" | grep -qE "^apps/api/|^packages/(db|types|utils)/"; then
  REBUILD_API=true
fi
if echo "$CHANGED_FILES" | grep -qE "^apps/web/|^packages/(db|types|ui|utils)/"; then
  REBUILD_WEB=true
fi
if echo "$CHANGED_FILES" | grep -qE "^nginx/"; then
  REBUILD_NGINX=true
fi
# docker-compose.yml 변경 시 전체 재기동
FULL_RECREATE=false
if echo "$CHANGED_FILES" | grep -qE "^docker-compose\.yml$"; then
  FULL_RECREATE=true
  REBUILD_API=true
  REBUILD_WEB=true
fi

log "재빌드 대상 - api:${REBUILD_API}, web:${REBUILD_WEB}, nginx:${REBUILD_NGINX}, full:${FULL_RECREATE}"

# ─── 4. 코드 적용 ─────────────────────────────────────────
git reset --hard "$NEW_COMMIT"
log "✅ 코드 업데이트 완료"

# ─── 5. 선택적 재빌드 + 재시작 ─────────────────────────────
SERVICES_TO_BUILD=()
SERVICES_TO_UP=()

$REBUILD_API && SERVICES_TO_BUILD+=("api") && SERVICES_TO_UP+=("api")
$REBUILD_WEB && SERVICES_TO_BUILD+=("web") && SERVICES_TO_UP+=("web")
$REBUILD_NGINX && SERVICES_TO_UP+=("nginx")

if [ "$FULL_RECREATE" = true ]; then
  log "🔄 docker-compose.yml 변경 감지 → 전체 재기동"
  docker compose build api web 2>&1 | tee -a "$LOG_FILE"
  docker compose up -d 2>&1 | tee -a "$LOG_FILE"
elif [ ${#SERVICES_TO_BUILD[@]} -eq 0 ] && [ ${#SERVICES_TO_UP[@]} -eq 0 ]; then
  log "ℹ️  Docker 서비스 재빌드 불필요 (문서/설정만 변경)"
else
  if [ ${#SERVICES_TO_BUILD[@]} -gt 0 ]; then
    log "🔨 빌드: ${SERVICES_TO_BUILD[*]}"
    docker compose build "${SERVICES_TO_BUILD[@]}" 2>&1 | tee -a "$LOG_FILE"
  fi
  if [ ${#SERVICES_TO_UP[@]} -gt 0 ]; then
    log "🚀 재시작: ${SERVICES_TO_UP[*]}"
    docker compose up -d "${SERVICES_TO_UP[@]}" 2>&1 | tee -a "$LOG_FILE"
  fi
fi

# ─── 6. Health check ─────────────────────────────────────
sleep 5
log "📋 컨테이너 상태:"
docker ps --format "table {{.Names}}\t{{.Status}}" | tee -a "$LOG_FILE"

# API health
if docker exec gameup-api wget -qO- --timeout=5 http://localhost:5000/api/health > /dev/null 2>&1; then
  log "✅ API health check 통과"
else
  log "⚠️  API health check 실패 (로그 확인 필요)"
fi

log "━━━ 배포 완료 (${NEW_COMMIT:0:7}) ━━━"
