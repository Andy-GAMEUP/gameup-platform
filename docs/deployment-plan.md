# GameUp Platform - 배포 계획

> **작성일**: 2026-04-20
> **목표 도메인**: `https://www.gameup.co.kr`
> **목적**: Naver Cloud 기반 운영 배포
> **상태**: 환경변수 설정 진행 중 (OAuth Secret 미입력)

---

## 확정된 배포 결정사항

| 항목 | 결정 | 비고 |
|------|------|------|
| 도메인 | `gameup.co.kr` (루트 경로) | basePath 없음 |
| DB 마이그레이션 | 불필요 | 신규 MongoDB로 새로 시작 |
| OAuth | Kakao/Naver Client ID 유지, Secret 신규 발급 | 콘솔에서 Secret 발급 필요 |
| JWT/NEXTAUTH Secret | ✅ 신규 64자 생성 완료 | `.env` 반영 완료 |
| Toss Payments | 보류 | 후속 계획 수립 후 설정 |
| SSL | 기존 Wildcard 인증서 마이그레이션 | `*.gameup.co.kr` |
| KCB 본인인증 | 기존 코드 유지 | 사이트코드: V51250000000 |
| DNS A 레코드 | Naver Cloud 서버 공인 IP 확정 후 변경 | 현재 미확정 |

---

## 현재 환경변수 상태

### apps/api (.env.production)
| 변수 | 상태 |
|------|------|
| `NODE_ENV` | ✅ production |
| `MONGODB_URI` | ✅ mongodb://mongodb:27017/gameup |
| `JWT_SECRET` | ✅ 신규 생성 완료 |
| `ALLOWED_ORIGINS` | ✅ https://www.gameup.co.kr |
| `TOSS_SECRET_KEY` | ⏸ 보류 (후속 계획 후 설정) |

### apps/web (.env.production)
| 변수 | 상태 |
|------|------|
| `NEXTAUTH_SECRET` | ✅ 신규 생성 완료 |
| `NEXTAUTH_URL` | ✅ https://www.gameup.co.kr |
| `KAKAO_CLIENT_ID` | ✅ b08491c4f70d913ee2cc1a6a61fa8a26 (기존 유지) |
| `KAKAO_CLIENT_SECRET` | ❌ 신규 발급 필요 |
| `NAVER_CLIENT_ID` | ✅ EsMBfSQJZ0MOcsxZb2T7 (기존 유지) |
| `NAVER_CLIENT_SECRET` | ❌ 신규 발급 필요 |

---

## 배포 전 남은 작업 체크리스트

### 즉시 진행 가능
- [ ] **Kakao Developers** 콘솔에서 Client Secret 신규 발급
  - URL: https://developers.kakao.com
  - 콜백 URL 등록: `https://www.gameup.co.kr/api/auth/callback/kakao`
  - `.env.production` `KAKAO_CLIENT_SECRET` 입력
- [ ] **Naver Developers** 콘솔에서 Client Secret 신규 발급
  - URL: https://developers.naver.com
  - 콜백 URL 등록: `https://www.gameup.co.kr/api/auth/callback/naver`
  - `.env.production` `NAVER_CLIENT_SECRET` 입력

### 서버 준비
- [ ] Naver Cloud 서버 생성 (Ubuntu 22.04, 2vCPU/8GB 이상 권장)
- [ ] 서버 공인 IP 확정
- [ ] DNS A 레코드 변경 (`gameup.co.kr`, `www` → 신규 서버 IP)
- [ ] Docker Engine + Docker Compose v2 설치
- [ ] UFW 방화벽 설정 (22, 80, 443 허용)
- [ ] `.env.production` 파일 서버에 배포

### SSL
- [ ] 기존 Wildcard 인증서 파일 서버로 이전
  - `_wildcard_gameup_co_kr.crt`
  - `_wildcard_gameup_co_kr_SHA256WITHRSA.key`
  - `rsa-dv.chain-bundle.pem`
- [ ] Nginx 인증서 경로 설정

### 소스코드 (완료)
- [x] `next.config.ts` — `output: standalone`, 프로덕션 domain remotePatterns, rewrites 조건 분기
- [x] JWT/NEXTAUTH Secret 신규 생성
- [x] `.env.production` 템플릿 파일 생성

---

## Phase 1: Docker 구성

### 1.1 `.dockerignore`
```
node_modules
.next
dist
.turbo
.git
e2e/
docs/
.env*
!.env.production
apps/api/uploads/*
playwright-report/
```

### 1.2 `apps/api/Dockerfile`
- Base: `node:22-alpine`, 멀티스테이지 빌드
- pnpm workspace 의존성 설치 후 `tsx`로 실행
- uploads 디렉토리 볼륨 마운트
- 포트: 5000

### 1.3 `apps/web/Dockerfile`
- `next build` → standalone 출력 사용
- 포트: 3000

### 1.4 `docker-compose.yml` 서비스 구성

| 서비스 | 포트 | 비고 |
|--------|------|------|
| **mongodb** | 내부전용 | `wiredTigerCacheSizeGB: 1` |
| **api** | 내부전용 | uploads 볼륨 |
| **web** | 내부전용 | api 의존 |
| **nginx** | 80, 443 | 리버스 프록시, SSL 종료 |

### 1.5 Nginx 라우팅
```
/api/*        → http://api:5000/api/*
/uploads/*    → http://api:5000/uploads/*
/socket.io/*  → http://api:5000/socket.io/* (WebSocket)
/*            → http://web:3000/*
```

---

## Phase 2: Naver Cloud 서버 구성

### 권장 스펙
| 항목 | 권장 |
|------|------|
| 서비스 | VPC > Server |
| 타입 | Standard s2-g3 (2 vCPU, 8GB) 이상 |
| OS | Ubuntu 22.04 LTS |
| 스토리지 | 100GB SSD |
| 리전 | Korea (KR) |

### ACG 설정
| 프로토콜 | 포트 | 소스 |
|----------|------|------|
| TCP | 22 | 사무실 IP만 |
| TCP | 80 | 0.0.0.0/0 |
| TCP | 443 | 0.0.0.0/0 |

---

## Phase 3: SSL (기존 Wildcard 인증서 마이그레이션)

기존 서버(`106.245.226.42`)에서 인증서 파일 복사:
```bash
# 기존 서버에서 복사
scp /etc/pki/tls/certs/_wildcard_gameup_co_kr.crt deploy@<신규IP>:/home/deploy/gameup/nginx/certs/
scp /etc/pki/tls/private/_wildcard_gameup_co_kr_SHA256WITHRSA.key deploy@<신규IP>:/home/deploy/gameup/nginx/certs/
scp /etc/pki/tls/certs/rsa-dv.chain-bundle.pem deploy@<신규IP>:/home/deploy/gameup/nginx/certs/
```

Nginx SSL 설정:
```nginx
ssl_certificate     /etc/nginx/certs/_wildcard_gameup_co_kr.crt;
ssl_certificate_key /etc/nginx/certs/_wildcard_gameup_co_kr_SHA256WITHRSA.key;
ssl_trusted_certificate /etc/nginx/certs/rsa-dv.chain-bundle.pem;
```

> Wildcard 인증서 만료 시 갱신 필요 — 만료일 사전 확인 권장

---

## Phase 4: GitHub Actions CI/CD

`.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /home/deploy/gameup
            git fetch origin main
            git reset --hard origin/main
            docker compose build
            docker compose up -d --remove-orphans
            sleep 10
            curl -sf http://localhost:5000/api/health || exit 1
            echo "Deploy successful"
```

GitHub Secrets 등록:
| Secret | 값 |
|--------|----|
| `DEPLOY_HOST` | 서버 공인 IP |
| `DEPLOY_USER` | deploy |
| `DEPLOY_SSH_KEY` | SSH 개인키 |

---

## Phase 5: 데이터 시딩 및 검증

```bash
docker compose exec api npx tsx src/scripts/seed.ts
```

### 기본 테스트 계정
| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| Admin | admin@gameup.com | test123456 |
| Developer | developer@test.com | test123456 |
| Player | player@test.com | test123456 |

### 검증 체크리스트
- [ ] `https://www.gameup.co.kr` 접속 확인
- [ ] 이메일 로그인
- [ ] Kakao OAuth 로그인
- [ ] Naver OAuth 로그인
- [ ] 게임 목록 조회
- [ ] 파일 업로드 (이미지)
- [ ] 관리자 패널 (`/admin`)
- [ ] 개발자 콘솔 (`/console`)
- [ ] 모바일 반응형
- [ ] WebSocket 실시간 메시징

---

## 주의사항

1. **`.env.production` 파일은 Git에 포함되지 않음** — 서버에 직접 배포
2. **MongoDB wiredTigerCacheSizeGB: 1** — 8GB 서버 메모리 보호 필수
3. **uploads 볼륨** — `docker compose down -v` 시 데이터 삭제됨, 주기적 백업 필요
4. **Wildcard 인증서 만료일 확인** — 기존 서버에서 `openssl x509 -in cert.crt -noout -dates`로 확인
5. **KCB 본인인증** — 사이트코드 `V51250000000`, 기존 설정 유지
6. **Toss Payments** — Secret Key 미설정 상태, 결제 기능 비활성화 후 배포 권장
