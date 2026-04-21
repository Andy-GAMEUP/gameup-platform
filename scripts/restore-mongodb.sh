#!/bin/bash
# ============================================================
# GameUp MongoDB 복원 스크립트
# 사용법:
#   ./restore-mongodb.sh <백업파일경로>
#   ./restore-mongodb.sh /opt/gameup/backups/daily/gameup_20260421_030000.archive.gz
# ============================================================

set -euo pipefail

CONTAINER="${MONGO_CONTAINER:-gameup-mongodb}"
DB_NAME="${DB_NAME:-gameup}"

if [ $# -eq 0 ]; then
  echo "사용법: $0 <백업파일경로>"
  echo ""
  echo "최근 백업 목록:"
  ls -lht /opt/gameup/backups/daily/ 2>/dev/null | head -10
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ 백업 파일을 찾을 수 없습니다: $BACKUP_FILE"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  경고: 이 작업은 현재 DB를 덮어씁니다!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "복원 파일: $BACKUP_FILE"
echo "대상 DB:   $DB_NAME (컨테이너: $CONTAINER)"
echo "파일 크기: $(du -h "$BACKUP_FILE" | cut -f1)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "계속하시겠습니까? (yes 입력 시 진행): " confirm

if [ "$confirm" != "yes" ]; then
  echo "취소됨"
  exit 0
fi

echo "🔄 복원 시작..."

# --drop: 기존 컬렉션 삭제 후 복원 (깨끗한 복원)
cat "$BACKUP_FILE" | docker exec -i "$CONTAINER" mongorestore \
  --archive \
  --gzip \
  --drop \
  --nsInclude="${DB_NAME}.*"

echo "✅ 복원 완료: $BACKUP_FILE → $DB_NAME"
