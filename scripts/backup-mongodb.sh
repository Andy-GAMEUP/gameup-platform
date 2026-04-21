#!/bin/bash
# ============================================================
# GameUp MongoDB 자동 백업 스크립트
# - 매일 새벽 3시 cron 실행
# - 일간: 최근 7개 보관
# - 주간: 일요일 백업은 weekly/ 폴더에 별도 보관 (최근 4개)
# ============================================================

set -euo pipefail

# ─── 설정 ───────────────────────────────────────────────────
BACKUP_ROOT="${BACKUP_ROOT:-/opt/gameup/backups}"
DAILY_DIR="${BACKUP_ROOT}/daily"
WEEKLY_DIR="${BACKUP_ROOT}/weekly"
CONTAINER="${MONGO_CONTAINER:-gameup-mongodb}"
DB_NAME="${DB_NAME:-gameup}"
DAILY_RETENTION=7
WEEKLY_RETENTION=4
LOG_FILE="${BACKUP_ROOT}/backup.log"

# ─── 유틸 ───────────────────────────────────────────────────
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# ─── 디렉토리 준비 ──────────────────────────────────────────
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DOW=$(date '+%u')  # 1(월) ~ 7(일)
ARCHIVE_NAME="gameup_${TIMESTAMP}.archive.gz"
DAILY_PATH="${DAILY_DIR}/${ARCHIVE_NAME}"

log "━━━ 백업 시작: ${ARCHIVE_NAME} ━━━"

# ─── mongodump 실행 (컨테이너 내부) ────────────────────────
# --archive + --gzip = 단일 압축 파일로 출력 (stdout으로 덤프 → 호스트에 저장)
if ! docker exec "$CONTAINER" mongodump \
    --db="$DB_NAME" \
    --archive \
    --gzip > "$DAILY_PATH" 2>> "$LOG_FILE"; then
  log "❌ 백업 실패: mongodump 오류"
  rm -f "$DAILY_PATH"
  exit 1
fi

SIZE=$(du -h "$DAILY_PATH" | cut -f1)
log "✅ 일간 백업 완료: ${DAILY_PATH} (${SIZE})"

# ─── 주간 백업 (일요일만) ───────────────────────────────────
if [ "$DOW" = "7" ]; then
  WEEKLY_PATH="${WEEKLY_DIR}/${ARCHIVE_NAME}"
  cp "$DAILY_PATH" "$WEEKLY_PATH"
  log "📦 주간 백업 저장: ${WEEKLY_PATH}"
fi

# ─── 오래된 백업 정리 ───────────────────────────────────────
# 일간: 최근 7개만 남기고 삭제
cd "$DAILY_DIR"
DAILY_COUNT=$(ls -1t gameup_*.archive.gz 2>/dev/null | wc -l)
if [ "$DAILY_COUNT" -gt "$DAILY_RETENTION" ]; then
  ls -1t gameup_*.archive.gz | tail -n +$((DAILY_RETENTION + 1)) | while read -r old; do
    rm -f "$old"
    log "🗑️  일간 삭제: $old"
  done
fi

# 주간: 최근 4개만 남기고 삭제
cd "$WEEKLY_DIR"
WEEKLY_COUNT=$(ls -1t gameup_*.archive.gz 2>/dev/null | wc -l)
if [ "$WEEKLY_COUNT" -gt "$WEEKLY_RETENTION" ]; then
  ls -1t gameup_*.archive.gz | tail -n +$((WEEKLY_RETENTION + 1)) | while read -r old; do
    rm -f "$old"
    log "🗑️  주간 삭제: $old"
  done
fi

# ─── 상태 요약 ──────────────────────────────────────────────
DAILY_TOTAL=$(du -sh "$DAILY_DIR" | cut -f1)
WEEKLY_TOTAL=$(du -sh "$WEEKLY_DIR" | cut -f1)
log "📊 현재 상태 - 일간: ${DAILY_TOTAL}, 주간: ${WEEKLY_TOTAL}"
log "━━━ 백업 완료 ━━━"
