#!/bin/bash
# Let's Encrypt SSL 인증서 최초 발급 스크립트
# 실행 위치: 서버 /opt/gameup/
# 실행 조건: DNS A 레코드가 이 서버 IP(101.79.9.143)로 변경 완료된 후 실행

set -e

DOMAIN="www.gameup.co.kr"
EMAIL="andy@cap-cloud.com"

echo "================================================"
echo " Let's Encrypt SSL 인증서 발급"
echo " 도메인: $DOMAIN / gameup.co.kr"
echo " 서버: 101.79.9.143"
echo "================================================"
echo ""

# DNS 전파 확인
echo "[사전 확인] DNS A 레코드 확인..."
RESOLVED_IP=$(dig +short www.gameup.co.kr | tail -1)
if [ "$RESOLVED_IP" != "101.79.9.143" ]; then
    echo "⚠️  경고: www.gameup.co.kr 가 101.79.9.143 으로 아직 전파되지 않았습니다."
    echo "   현재 확인된 IP: $RESOLVED_IP"
    echo "   DNS 전파 완료 후 다시 실행하세요. (최대 1~24시간 소요)"
    exit 1
fi
echo "   ✅ DNS 전파 확인: $RESOLVED_IP"
echo ""

echo "[1/4] HTTP 전용 설정으로 nginx 시작..."
# gameup.conf 임시 비활성화
mv nginx/conf.d/gameup.conf nginx/conf.d/gameup.conf.bak 2>/dev/null || true
docker compose up -d nginx web api mongodb
sleep 5
echo "   ✅ nginx 시작 완료"

echo ""
echo "[2/4] Let's Encrypt 인증서 발급..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d gameup.co.kr \
    -d www.gameup.co.kr \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal

echo "   ✅ 인증서 발급 완료"

echo ""
echo "[3/4] HTTPS 설정으로 전환..."
mv nginx/conf.d/gameup.conf.bak nginx/conf.d/gameup.conf 2>/dev/null || true
rm -f nginx/conf.d/gameup-init.conf
docker compose exec nginx nginx -s reload
echo "   ✅ HTTPS 전환 완료"

echo ""
echo "[4/4] HTTPS 접속 확인..."
sleep 3
curl -sf https://www.gameup.co.kr/api/health && echo "   ✅ HTTPS 정상 응답" || echo "   ⚠️  아직 응답 없음 - 잠시 후 직접 확인하세요"

echo ""
echo "================================================"
echo " SSL 발급 완료!"
echo " 인증서 자동 갱신: certbot 컨테이너가 12시간마다 갱신 시도"
echo "================================================"
