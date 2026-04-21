# CI/CD 셋업 가이드

## 개요

- **트리거**: `main` 브랜치 push (문서/README 변경 제외)
- **수동 실행**: GitHub Actions 탭 → "Deploy to gameup.co.kr" → "Run workflow"
- **동작 흐름**:
  1. Type check 통과 확인
  2. SSH로 서버 접속
  3. 서버의 `/opt/gameup/scripts/deploy.sh` 실행
  4. 변경 경로 분석 → 영향받는 서비스(api/web/nginx)만 재빌드
  5. Health check

## 1회 설정 (초기 1번만 수행)

### Step 1 - SSH 키 생성 (로컬 Mac에서)
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/gameup_deploy -N ""
```

- `~/.ssh/gameup_deploy` (private key) → GitHub Secrets에 등록
- `~/.ssh/gameup_deploy.pub` (public key) → 서버 authorized_keys에 추가

### Step 2 - 서버에 public key 등록
```bash
# 로컬 Mac에서 public key 복사
cat ~/.ssh/gameup_deploy.pub

# 서버 SSH 접속 후 등록
# (서버에서 실행)
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "<복사한 public key 내용>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 3 - GitHub Secrets 등록
GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret

| Secret Name | 값 |
|-------------|-----|
| `DEPLOY_HOST` | `101.79.9.143` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | `~/.ssh/gameup_deploy` 전체 내용 (private key) |
| `DEPLOY_PORT` | `22` (기본값이면 생략 가능) |

**Private key 복사:**
```bash
cat ~/.ssh/gameup_deploy | pbcopy   # 클립보드에 복사됨
```

### Step 4 - 서버에 deploy.sh 배포 가능 상태 확인
```bash
# 서버에서 실행
ls -la /opt/gameup/scripts/deploy.sh
# 실행 권한 없으면: chmod +x /opt/gameup/scripts/deploy.sh

# 수동 실행 테스트 (변경 없을 때 정상 스킵되는지 확인)
/opt/gameup/scripts/deploy.sh
```

### Step 5 - 첫 배포 테스트
로컬에서 작은 변경 후 커밋/푸시:
```bash
git commit --allow-empty -m "chore: trigger ci/cd test"
git push origin main
```

GitHub 저장소 → Actions 탭에서 워크플로우 실행 확인.

## 배포 로그 확인

### GitHub Actions (전체 로그)
저장소 → Actions 탭 → 해당 실행 클릭 → 각 step 펼쳐서 확인

### 서버 배포 로그
```bash
tail -100 /opt/gameup/deploy.log
```

## 변경 감지 규칙 (deploy.sh)

| 변경 경로 | 재빌드 대상 |
|-----------|-------------|
| `apps/api/**`, `packages/{db,types,utils}/**` | api |
| `apps/web/**`, `packages/{db,types,ui,utils}/**` | web |
| `nginx/**` | nginx (재빌드 없이 재시작) |
| `docker-compose.yml` | 전체 재기동 |
| `docs/**`, `*.md` | 배포 스킵 (워크플로우 자체가 트리거 안됨) |

## 롤백 방법

### 자동 롤백 없음 (수동)
```bash
# 서버 접속 후
cd /opt/gameup

# 이전 커밋으로 되돌리기
git log --oneline -10
git reset --hard <이전 커밋 해시>

# 재빌드
docker compose build api web
docker compose up -d
```

## 트러블슈팅

### SSH 연결 실패
- GitHub Secrets의 `DEPLOY_SSH_KEY` 값 확인 (줄바꿈 포함 전체 복사 필요)
- 서버 `~/.ssh/authorized_keys`에 public key 정확히 들어갔는지 확인
- 서버 방화벽/Naver Cloud ACG에서 GitHub Actions runner IP 허용 여부 (전체 허용 권장)

### 빌드 실패
- GitHub Actions 로그에서 `docker compose build` 에러 메시지 확인
- 서버 디스크 용량 확인: `df -h`
- Docker 이미지 정리: `docker image prune -af`

### Health check 실패
- `docker logs gameup-api --tail=50` 확인
- MongoDB 연결 상태 확인
- `.env.api`, `.env.web` 환경변수 확인
