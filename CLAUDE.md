# GameUp Platform - Claude 작업 지침

## 커밋 규칙

- **커밋은 사용자가 명시적으로 "커밋해"라고 할 때만 한다**
- 코드 작업이 끝나도 자동으로 커밋하지 않는다
- 커밋 브랜치는 항상 `dev-capcloud`만
- `main` 머지는 사용자가 "머지해", "main에 올려" 등 명시적으로 지시할 때만 진행
- 빌드 검증 후에도 자동 커밋/자동 main push 금지

### 커밋 전 필수 절차
커밋 요청을 받으면 **실제 커밋 전에** 아래 형식으로 변경 내역을 먼저 대화창에 출력한다:

| 파일 | 작업 내용 |
|------|-----------|
| `경로/파일명` | 변경 내용 요약 |

사용자 확인 없이 바로 커밋하지 않는다. 단, 사용자가 "바로 커밋해" 등 확인 생략을 명시하면 바로 진행해도 된다.

## 머지 작업 규칙

### 머지 절차 (순서대로 실행)
1. `main`으로 `git checkout` 하지 않는다
2. `origin/main`을 현재 브랜치에 머지한다 (`git merge origin/main`)
3. 충돌 발생 시 충돌 파일만 수정한다
4. `npx tsc --noEmit -p apps/web/tsconfig.json`으로 빌드 검증한다
5. 검증 통과 후 `git push origin dev-capcloud:main`으로 push한다
6. GitHub Actions 배포 결과를 확인한다 (아래 명령어 사용)
7. 배포 성공 시 사용자에게 완료 알림을 한다

### 배포 확인 명령어
```bash
TOKEN=$(git remote get-url origin | grep -oP 'ghp_[^@]+')
curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/Andy-GAMEUP/gameup-platform/actions/runs?per_page=3" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('workflow_runs', []):
    print(f\"{r['status']} | {r['conclusion'] or '진행중'} | {r['created_at'][:19]} | {r['head_commit']['message'][:50]}\")
"
```
- `completed / success` → 배포 완료
- `in_progress` → 배포 진행 중 (잠시 후 재확인)
- `completed / failure` → 배포 실패 (사용자에게 알림)

### 충돌 파일 외 작업 금지
- 머지 작업 중 리팩토링, 기능 추가, 불필요한 파일 수정 금지
- 추가 작업이 필요하면 사용자에게 알리고 허락을 받은 후 진행

## 플랫폼 운영 규칙 문서

- **플랫폼 비즈니스 규칙은 반드시 `docs/platform-rules.md`를 먼저 확인한다**
- 규칙이 변경되거나 새로운 프로세스가 추가되면 **작업 완료 후 `docs/platform-rules.md`를 업데이트한다**
- 규칙 변경 예시: 회원 가입/승인 흐름, 파트너 등록 절차, 권한 체계, 상태값 변경 등

## 게시물 작성용 입력 필드 동일 적용 규칙

- **`docs/content-editor-consistency-rule.md`를 반드시 확인한다**
- 이 문서에 나열된 "동일 그룹" 입력 필드(리치 텍스트 에디터) 중 하나를 수정/기능 추가하면, 사용자가 명시적으로 다르게 하라고 하지 않는 한 **묻지 않고 나머지 전부에도 동일하게 적용**한다
- 새로운 게시물류 입력 필드를 추가하면 이 문서의 목록도 함께 업데이트한다

## 확인 팝업 통일 규칙

- **`docs/confirm-modal-consistency-rule.md`를 반드시 확인한다**
- 삭제/종료/복원/승인 등 사용자 확인이 필요한 모든 동작은 브라우저 기본 `window.confirm()`이 아니라 `apps/web/src/components/ConfirmModal.tsx`로 통일한다
- 관리자/개발자/유저 포털 구분 없이 전부 동일하게 적용하며, 새로 확인 팝업을 추가할 때도 `window.confirm()`을 쓰지 않는다

## 프로젝트 카드 레이아웃 동일 적용 규칙

- **`docs/project-card-consistency-rule.md`를 반드시 확인한다**
- 이 문서에 나열된 "동일 그룹"(프로젝트를 카드로 보여주는 화면들) 중 하나의 카드 레이아웃을 수정하면, 사용자가 명시적으로 다르게 하라고 하지 않는 한 **묻지 않고 나머지 전부에도 동일하게 적용**한다
- 새로 프로젝트 카드를 보여주는 화면을 추가하면 이 문서의 목록도 함께 업데이트한다

## 쿠폰 서버 (gameup-platform과 무관한 외부 미니 프로젝트)

- `deploy/coupon-server/` — 같은 운영 서버에 격리된 별도 Docker 컨테이너로 떠 있는 쿠폰 발급 서버. gameup-platform 본 서비스(웹/API/DB)와 코드·데이터 전혀 무관
- **제거/롤백 방법은 `docs/coupon-server-deployment.md`에 정리되어 있음 — 관련 작업 전 반드시 확인**
- **사용자가 "쿠폰 페이지 접근한 사람/IP 보여줘" 등으로 요청하면 `docs/coupon-server-visitor-check.md` 절차대로 확인해서 보여준다** (자동 차단 금지, 확인/보고만)
