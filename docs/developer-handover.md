# GameUp 개발자 인수인계 매뉴얼

로컬에서 개발 → GitHub push → 서버(www.gameup.co.kr) 자동 배포까지의 전체 흐름을 정리한 문서입니다.

---

## 1. 시스템 아키텍처

```
┌──────────────┐     git push     ┌──────────────┐     webhook      ┌────────────────────┐
│  Local (Mac) │ ───────────────▶ │   GitHub     │ ───────────────▶ │ GitHub Actions     │
│  개발/커밋   │                  │  main branch │                  │  (workflow trigger)│
└──────────────┘                  └──────────────┘                  └────────────────────┘
                                                                              │
                                                                              ▼
                                                    ┌──────────────────────────────────────┐
                                                    │ Job 1: Lint & Type Check             │
                                                    │   - ubuntu-latest (GitHub-hosted)    │
                                                    │   - pnpm install + pnpm type-check   │
                                                    └──────────────────────────────────────┘
                                                                              │ 성공 시
                                                                              ▼
                                                    ┌──────────────────────────────────────┐
                                                    │ Job 2: Deploy                         │
                                                    │   - self-hosted (서버에서 직접 실행)  │
                                                    │   - /opt/gameup/scripts/deploy.sh    │
                                                    └──────────────────────────────────────┘
                                                                              │
                                                                              ▼
                                                    ┌──────────────────────────────────────┐
                                                    │ 서버: Naver Cloud (101.79.9.143)     │
                                                    │  - git pull origin main              │
                                                    │  - 변경 경로 분석                     │
                                                    │  - 영향받는 서비스만 docker rebuild  │
                                                    │  - Health check                      │
                                                    └──────────────────────────────────────┘
```

### 주요 서버 경로

| 경로 | 용도 |
|------|------|
| `/opt/gameup/` | 프로덕션 소스 (git repo) |
| `/opt/gameup/scripts/deploy.sh` | 배포 스크립트 |
| `/opt/gameup/scripts/backup-mongodb.sh` | DB 백업 스크립트 |
| `/opt/gameup/deploy.log` | 배포 이력 로그 |
| `/opt/gameup/backups/` | MongoDB 백업 저장소 |
| `/opt/actions-runner/` | GitHub Actions self-hosted runner |

---

## 2. 로컬 개발 환경 셋업

### 2.1 요구 사항

- Node.js 22.x
- pnpm 10.30.3
- Docker Desktop (선택 – 로컬에서 컨테이너 구동 시)
- MongoDB 로컬 (또는 Atlas 연결)
- GitHub CLI (`gh`)

### 2.2 저장소 클론 및 초기화

```bash
git clone https://github.com/Andy-GAMEUP/gameup-platform.git
cd gameup-platform

# 의존성 설치
pnpm install

# 환경변수 파일 준비
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# 각 파일 편집 후 로컬 값 입력
```

### 2.3 개발 서버 실행

```bash
# 루트에서 전체 서비스 동시 실행
pnpm dev

# 개별 실행
cd apps/api && pnpm dev       # Express API (5000)
cd apps/web && pnpm dev       # Next.js web (3000)
```

### 2.4 유용한 명령어

```bash
pnpm lint           # 전체 린트
pnpm type-check     # 타입 체크 (CI/CD 전 필수 확인)
pnpm build          # 전체 빌드
pnpm test:e2e       # Playwright E2E 테스트

cd apps/api && pnpm seed             # DB 시드 (유저/게임 데이터)
cd apps/api && pnpm seed:partners    # 파트너 프로젝트 시드
cd apps/api && pnpm create-admin     # 어드민 계정 생성
```

---

## 3. 개발 → 배포 워크플로우

### 3.1 기본 흐름

```bash
# 1) 최신 main 반영
git checkout main
git pull origin main

# 2) 기능 브랜치 생성 (권장)
git checkout -b feature/새기능

# 3) 코드 수정 및 로컬 테스트
pnpm dev
pnpm type-check   # 배포 전 반드시 통과 확인

# 4) 커밋
git add .
git commit -m "feat: 새 기능 설명"

# 5) 리모트 푸시
git push origin feature/새기능

# 6) GitHub에서 PR 생성 → 리뷰 → main으로 머지
#    또는 main 직접 푸시 (소규모 팀일 경우)
git checkout main
git merge feature/새기능
git push origin main
```

### 3.2 main 브랜치 push 시 자동 배포 발생

- **트리거 조건**: `main` 브랜치에 코드 변경이 push될 때
- **제외 조건**: `**.md`, `docs/**`, `.gitignore`, `LICENSE`만 변경된 경우 (워크플로우가 트리거되지 않음)
- **수동 실행**: GitHub Actions 탭 → "Deploy to gameup.co.kr" → "Run workflow" 버튼

### 3.3 배포 상태 모니터링

**로컬 CLI:**
```bash
# 최신 workflow 상태 실시간 추적
cd ~/gameup-platform
gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')

# 최근 실행 이력
gh run list --limit 10

# 특정 실행 상세 로그
gh run view <RUN_ID> --log
```

**GitHub UI:**
- https://github.com/Andy-GAMEUP/gameup-platform/actions

**서버 실시간 로그:**
```bash
ssh -i ~/.ssh/gameup_deploy root@101.79.9.143 "tail -f /opt/gameup/deploy.log"
```

---

## 4. 변경 감지 & 선택적 재빌드

`scripts/deploy.sh`는 이전 커밋과의 diff를 분석해 **영향받는 서비스만** 재빌드합니다.

| 변경 경로 | 재빌드 대상 |
|-----------|-------------|
| `apps/api/**`, `packages/{db,types,utils}/**` | api |
| `apps/web/**`, `packages/{db,types,ui,utils}/**` | web |
| `nginx/**` | nginx (재시작만) |
| `docker-compose.yml` | 전체 재기동 (api + web) |
| `docs/**`, `*.md` | 워크플로우 자체가 트리거되지 않음 |

### 예시: 빌드 시간 절감 케이스

- `apps/web/src/components/Header.tsx` 수정 → **web만 재빌드** (약 2분)
- `apps/api/src/routes/gameRoutes.ts` 수정 → **api만 재빌드** (약 1분)
- `packages/db/src/models/User.ts` 수정 → **api + web 모두 재빌드** (약 4분)

---

## 5. 환경변수 관리

### 5.1 파일 위치

| 파일 | 용도 | 관리 방법 |
|------|------|----------|
| `apps/api/.env` | 로컬 API 환경변수 | gitignore (개발자 각자 보유) |
| `apps/web/.env.local` | 로컬 Web 환경변수 | gitignore |
| `/opt/gameup/.env.api` | 프로덕션 API | **서버에서만 수정** |
| `/opt/gameup/.env.web` | 프로덕션 Web | **서버에서만 수정** |

### 5.2 주의사항

- **환경변수는 git에 커밋 금지**. 프로덕션 환경변수 변경이 필요하면 서버에 직접 SSH 접속 후 수정.
- `NEXT_PUBLIC_*` 로 시작하는 변수는 **빌드 타임에 바인딩**됨. 변경 시 web 컨테이너 재빌드 필수.
- `AUTH_SECRET`, `JWT_SECRET`, DB 비밀번호 등은 절대 공유 채널(Slack, 이메일, PR)에 붙여넣기 금지.

### 5.3 프로덕션 환경변수 변경 절차

```bash
# 서버 접속
ssh -i ~/.ssh/gameup_deploy root@101.79.9.143

# 환경변수 편집
cd /opt/gameup
vi .env.api    # 또는 .env.web

# 해당 서비스만 재시작
docker compose up -d api       # 또는 web

# 변경 확인
docker logs gameup-api --tail=30
```

---

## 6. 장애 대응

### 6.1 배포 실패 시

**Step 1 - 실패 원인 확인**
```bash
# GitHub Actions 로그
gh run view <RUN_ID> --log-failed

# 서버 배포 로그
ssh -i ~/.ssh/gameup_deploy root@101.79.9.143 \
  "tail -100 /opt/gameup/deploy.log"
```

**Step 2 - 일반적인 원인별 대응**

| 증상 | 원인 | 해결 |
|------|------|------|
| `Type check` 실패 | 타입 에러 | 로컬에서 `pnpm type-check` 돌려 수정 후 재푸시 |
| Docker build 실패 | 의존성 충돌, 디스크 부족 | 서버에서 `df -h` + `docker image prune -af` |
| API health check 실패 | 환경변수 누락/DB 연결 실패 | `docker logs gameup-api --tail=100` |
| Runner offline | 서비스 중단 | 서버에서 `./svc.sh status && ./svc.sh start` |

### 6.2 긴급 롤백

```bash
# 서버 접속
ssh -i ~/.ssh/gameup_deploy root@101.79.9.143
cd /opt/gameup

# 최근 커밋 이력 확인
git log --oneline -10

# 이전 커밋으로 되돌리기
git reset --hard <이전_커밋_해시>

# 수동 재빌드
docker compose build api web
docker compose up -d

# Health 확인
docker exec gameup-api wget -qO- http://localhost:5000/api/health
```

### 6.3 DB 복원

```bash
# 서버 접속 후
ssh -i ~/.ssh/gameup_deploy root@101.79.9.143

# 사용 가능한 백업 목록 확인
/opt/gameup/scripts/restore-mongodb.sh

# 특정 파일로 복원
/opt/gameup/scripts/restore-mongodb.sh /opt/gameup/backups/daily/gameup_20260421_030000.archive.gz

# API 재시작
docker compose restart api
```

자세한 백업/복원 절차는 [`backup-strategy.md`](./backup-strategy.md) 참조.

### 6.4 Runner 관리

Self-hosted runner 자체에 문제가 있을 경우:

```bash
cd /opt/actions-runner

# 상태 확인
./svc.sh status

# 재시작
./svc.sh stop
./svc.sh start

# 로그 확인
journalctl -u actions.runner.* -n 100
```

자세한 runner 설정/제거 절차는 [`cicd-setup.md`](./cicd-setup.md) 참조.

---

## 7. 브랜치 전략 (권장)

### 7.1 단순 전략 (소규모 팀)

```
main ─────●──────●──────●──────▶  (프로덕션)
         feat/A  fix/B  feat/C
```

- `main`에 머지되는 순간 자동 배포
- 기능 브랜치는 머지 후 삭제

### 7.2 Staging 추가 (향후 확장)

```
main ────────●──────●──────▶  (프로덕션)
             │      │
staging ─●───●──●───●──────▶  (스테이징)
         feat/A    fix/B
```

- `staging` 브랜치 → 스테이징 서버 자동 배포 (별도 workflow 필요)
- `main` merge는 `staging` 검증 후

---

## 8. 보안 체크리스트

- ✅ Private 저장소 유지 (Public 전환 시 self-hosted runner 사용 중단)
- ✅ 서버 SSH: `PermitRootLogin prohibit-password` (키 인증만)
- ✅ Inbound 22 포트: 사용자 IP만 허용 (ACG 설정 유지)
- ✅ `.env*` 파일 git 커밋 금지 (gitignore 확인)
- ✅ 프라이빗 키/토큰을 채팅/이슈/PR에 붙여넣기 금지
- ✅ `AUTH_SECRET`, `JWT_SECRET` 주기적 로테이션 권장

---

## 9. 자주 쓰는 명령어 치트시트

### 로컬 (Mac)

```bash
# 개발 서버
pnpm dev

# 타입체크 (배포 전 필수)
pnpm type-check

# 수동 배포 트리거
gh workflow run "Deploy to gameup.co.kr" --ref main

# 배포 감시
gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')

# 서버 접속
ssh -i ~/.ssh/gameup_deploy root@101.79.9.143
```

### 서버

```bash
# 배포 로그
tail -f /opt/gameup/deploy.log

# 컨테이너 상태
docker ps

# 특정 서비스 로그
docker logs gameup-api --tail=100 -f
docker logs gameup-web --tail=100 -f

# 수동 배포 (CI/CD 우회 - 긴급 시만 사용)
cd /opt/gameup && ./scripts/deploy.sh

# DB 수동 백업
/opt/gameup/scripts/backup-mongodb.sh

# Runner 상태
cd /opt/actions-runner && ./svc.sh status
```

---

## 10. 참고 문서

- **CI/CD 설정**: [`cicd-setup.md`](./cicd-setup.md)
- **백업 전략**: [`backup-strategy.md`](./backup-strategy.md)
- **배포 계획**: [`deployment-plan.md`](./deployment-plan.md)
- **플랫폼 아키텍처**: [`platform-architecture.md`](./platform-architecture.md)
- **프로젝트 개요**: [`CLAUDE.md`](./CLAUDE.md)

---

## 11. 인수인계 체크리스트

신규 개발자 온보딩 시 아래 항목 확인:

- [ ] GitHub `Andy-GAMEUP/gameup-platform` repo 접근 권한 부여
- [ ] 로컬 개발환경 셋업 완료 (`pnpm dev` 구동 확인)
- [ ] `.env.example` 기반으로 로컬 `.env` 생성
- [ ] 테스트 계정 로그인 확인 (admin/developer/player)
- [ ] 서버 SSH 접속 키 전달 (`gameup_deploy` 또는 개인 키 등록)
- [ ] `gh` CLI 설치 및 인증 (`gh auth login`)
- [ ] 첫 배포 테스트 수행 (사소한 변경 → main 푸시 → 성공 확인)
- [ ] 롤백 절차 숙지
- [ ] 본 문서 + `cicd-setup.md` + `backup-strategy.md` 통독
