#!/bin/bash
# 기존 서버에서 Wildcard SSL 인증서를 신규 서버로 이전하는 스크립트
# 실행 위치: 로컬 머신 또는 기존 서버
#
# 기존 서버: 106.245.226.42
# 신규 서버: 101.79.9.143
# 인증서 경로 (기존 서버): /etc/pki/tls/

set -e

OLD_SERVER="106.245.226.42"
NEW_SERVER="101.79.9.143"
CERT_DEST="/opt/gameup/nginx/certs"

echo "=== Wildcard SSL 인증서 이전 ==="
echo "기존 서버: $OLD_SERVER"
echo "신규 서버: $NEW_SERVER"
echo ""

# 기존 서버에서 인증서 파일 가져오기 (로컬로)
echo "[1/3] 기존 서버에서 인증서 파일 다운로드..."
scp root@${OLD_SERVER}:/etc/pki/tls/certs/_wildcard_gameup_co_kr.crt ./nginx/certs/
scp root@${OLD_SERVER}:/etc/pki/tls/private/_wildcard_gameup_co_kr_SHA256WITHRSA.key ./nginx/certs/
scp root@${OLD_SERVER}:/etc/pki/tls/certs/rsa-dv.chain-bundle.pem ./nginx/certs/

# 인증서 만료일 확인
echo "[2/3] 인증서 만료일 확인..."
openssl x509 -in ./nginx/certs/_wildcard_gameup_co_kr.crt -noout -dates

# 신규 서버로 인증서 업로드
echo "[3/3] 신규 서버로 인증서 업로드..."
ssh root@${NEW_SERVER} "mkdir -p ${CERT_DEST}"
scp ./nginx/certs/_wildcard_gameup_co_kr.crt root@${NEW_SERVER}:${CERT_DEST}/
scp ./nginx/certs/_wildcard_gameup_co_kr_SHA256WITHRSA.key root@${NEW_SERVER}:${CERT_DEST}/
scp ./nginx/certs/rsa-dv.chain-bundle.pem root@${NEW_SERVER}:${CERT_DEST}/
ssh root@${NEW_SERVER} "chmod 600 ${CERT_DEST}/*.key && chmod 644 ${CERT_DEST}/*.crt ${CERT_DEST}/*.pem"

echo ""
echo "SSL 인증서 이전 완료!"
