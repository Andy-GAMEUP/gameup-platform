#!/bin/bash
# GameUp Platform - Naver Cloud 서버 초기 설정 스크립트
# 서버: gameup-svr1 (101.79.9.143 / Ubuntu 24.04)
# 실행: bash scripts/server-setup.sh

set -e

echo "=== [1/7] 시스템 패키지 업데이트 ==="
apt-get update && apt-get upgrade -y

echo "=== [2/7] Docker Engine 설치 ==="
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "=== [3/7] deploy 사용자 생성 ==="
useradd -m -s /bin/bash deploy || echo "deploy 사용자 이미 존재"
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
# GitHub Actions SSH 키 등록 (authorized_keys에 공개키 추가 필요)
# echo "ssh-rsa AAAA..." >> /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chown -R deploy:deploy /home/deploy/.ssh

echo "=== [4/7] UFW 방화벽 설정 ==="
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

echo "=== [5/7] Swap 2GB 설정 ==="
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "=== [6/7] 프로젝트 디렉토리 준비 ==="
mkdir -p /opt/gameup
cd /opt/gameup
git clone https://github.com/Andy-GAMEUP/gameup-platform.git . || git pull origin main

# 인증서 디렉토리 생성 (파일은 수동으로 복사)
mkdir -p /opt/gameup/nginx/certs

echo "=== [7/7] 추가 디스크 마운트 확인 ==="
lsblk
# 추가 디스크(300GB)가 /dev/vdb 등으로 잡히면 아래 명령으로 마운트
# mkfs.ext4 /dev/vdb
# mkdir -p /data
# echo '/dev/vdb /data ext4 defaults 0 2' >> /etc/fstab
# mount -a

echo ""
echo "====================================="
echo "서버 초기 설정 완료!"
echo "====================================="
echo ""
echo "다음 작업을 수동으로 진행하세요:"
echo "1. SSL 인증서 파일을 /opt/gameup/nginx/certs/ 에 복사"
echo "2. .env.api, .env.web 파일을 /opt/gameup/ 에 생성"
echo "3. GitHub Actions SSH 공개키를 /home/deploy/.ssh/authorized_keys 에 추가"
echo "4. cd /opt/gameup && docker compose build && docker compose up -d"
