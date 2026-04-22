# CI/CD 셋업 가이드

## 개요

- **트리거**: `main` 브랜치 push (문서/README 변경 제외)
- **수동 실행**: GitHub Actions 탭 → "Deploy to gameup.co.kr" → "Run workflow"
- **아키텍처**: Self-hosted runner (서버에서 직접 실행, inbound SSH 불필요)
- **동작 흐름**:
  1. GitHub-hosted runner에서 type check 통과 확인
  2. **Self-hosted runner(서버)** 에서 `/opt/gameup/scripts/deploy.sh` 실행
  3. 변경 경로 분석 → 영향받는 서비스(api/web/nginx)만 재빌드
  4. Health check

## 보안 모델

- ✅ Inbound SSH(22) 외부 공개 불필요 (사용자 IP만 허용 유지)
- ✅ Outbound HTTPS(443)만 사용 (GitHub 폴링)
- ✅ Secrets 노출 위험 없음 (배포 자격증명이 GitHub에 저장되지 않음)
- ⚠️ **Private repo 전제**. Public repo는 PR 빌드가 self-hosted runner에서 실행되면 위험하므로 사용 금지.

## 1회 설정 - Self-hosted Runner 설치

### Step 1 - GitHub에서 등록 토큰 발급

**방법 A (gh CLI 사용, 로컬 Mac에서):**
```bash
gh api -X POST repos/Andy-GAMEUP/gameup-platform/actions/runners/registration-token --jq .token
```

**방법 B (브라우저):**
1. https://github.com/Andy-GAMEUP/gameup-platform/settings/actions/runners
2. "New self-hosted runner" 클릭
3. OS: Linux, Architecture: x64
4. 페이지에 표시되는 `./config.sh --url ... --token AABCD...` 명령에서 **token 값**을 복사

⚠️ 토큰은 1시간 유효. 만료 시 재발급.

### Step 2 - 서버에 Runner 설치

서버에서 실행:

```bash
# 전용 사용자 생성 (보안상 root 사용 비권장이지만, deploy.sh가 docker 명령을 써야 하므로 root 또는 docker 그룹 권한 필요)
# 여기서는 간편함을 위해 root 사용자의 홈에 설치

mkdir -p /opt/actions-runner && cd /opt/actions-runner

# 최신 runner 다운로드 (버전은 https://github.com/actions/runner/releases 참조)
RUNNER_VERSION="2.328.0"
curl -o actions-runner-linux-x64.tar.gz -L \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

tar xzf actions-runner-linux-x64.tar.gz
rm actions-runner-linux-x64.tar.gz

# 의존성 설치
./bin/installdependencies.sh
```

### Step 3 - Runner 등록

```bash
cd /opt/actions-runner

# <REGISTRATION_TOKEN>은 Step 1에서 받은 값
./config.sh \
  --url https://github.com/Andy-GAMEUP/gameup-platform \
  --token <REGISTRATION_TOKEN> \
  --name gameup-svr1 \
  --labels gameup-prod \
  --work _work \
  --unattended \
  --replace
```

### Step 4 - 시스템 서비스로 등록 (자동 시작)

```bash
cd /opt/actions-runner
./svc.sh install root
./svc.sh start
./svc.sh status
```

상태가 `active (running)` 이어야 합니다.

### Step 5 - 확인

GitHub 저장소 → Settings → Actions → Runners 페이지에서 `gameup-svr1` 이 **Idle** 상태로 표시되면 성공.

## 첫 배포 테스트

```bash
# 로컬 Mac에서
gh workflow run "Deploy to gameup.co.kr" --ref main
gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
```

## 모니터링

### Runner 로그
```bash
# 서버에서
journalctl -u actions.runner.* -f
```

### 배포 로그
```bash
# 서버에서
tail -f /opt/gameup/deploy.log
```

## 변경 감지 규칙 (deploy.sh)

| 변경 경로 | 재빌드 대상 |
|-----------|-------------|
| `apps/api/**`, `packages/{db,types,utils}/**` | api |
| `apps/web/**`, `packages/{db,types,ui,utils}/**` | web |
| `nginx/**` | nginx (재빌드 없이 재시작) |
| `docker-compose.yml` | 전체 재기동 |
| `docs/**`, `*.md` | 배포 스킵 (워크플로우 자체가 트리거 안됨) |

## Runner 재시작/제거

### 재시작
```bash
cd /opt/actions-runner
./svc.sh stop
./svc.sh start
```

### 제거 (재등록 필요 시)
```bash
cd /opt/actions-runner
./svc.sh stop
./svc.sh uninstall

# GitHub에서 새 등록 토큰 받은 뒤
./config.sh remove --token <REMOVAL_TOKEN>
```

## 롤백

```bash
# 서버 접속 후
cd /opt/gameup
git log --oneline -10
git reset --hard <이전 커밋 해시>
docker compose build api web
docker compose up -d
```

## 트러블슈팅

### Runner가 Offline 상태
- `./svc.sh status` 확인
- `journalctl -u actions.runner.* -n 50` 로그 확인
- 네트워크 outbound 443 차단 여부 확인

### 빌드 실패
- 서버 디스크 용량: `df -h`
- Docker 이미지 정리: `docker image prune -af`
- Runner 작업 디렉토리 정리: `rm -rf /opt/actions-runner/_work/*`

### 배포 후 Health check 실패
- `docker logs gameup-api --tail=50`
- `.env.api`, `.env.web` 환경변수 확인
