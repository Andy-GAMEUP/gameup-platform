# 쿠폰 서버 (moayhong-coupon-server)

gameup-platform과 무관한 외부 이벤트용 쿠폰 발급 서버. 개발사(모아용) 쿠폰 API에 서명값을 만들어 대신 요청해주는 역할만 하며, gameup-platform의 DB/기능과는 아무 관련이 없다. 같은 운영 서버(`101.79.9.143`, NCP `gameup-svr1`) 안에 완전히 격리된 별도 Docker 컨테이너로 떠 있다.

## 구성 요소

| 파일/위치 | 역할 |
|---|---|
| `deploy/coupon-server/` | 쿠폰 서버 소스코드 + `Dockerfile` + 자체 `docker-compose.yml` |
| `deploy/coupon-server/.env` | 서버에서만 생성됨(git에 없음). `SECRET_KEY`, `COUPON_API_URL`, `PORT` |
| `.github/workflows/deploy-coupon-server.yml` | 수동 실행(workflow_dispatch) 전용 배포 워크플로우. 기존 `deploy.yml`(gameup.co.kr 자동배포)과 별개 |
| `nginx/conf.d/gameup.conf` | `# ===== BEGIN moayhong-coupon-server =====` ~ `# ===== END =====` 사이 블록만 쿠폰 서버용. 그 외 내용은 기존 그대로 |
| 서버 안 Docker 컨테이너 | `gameup-coupon-server` (다른 서비스: `gameup-web`, `gameup-api`, `gameup-nginx`, `gameup-mongodb`와 완전히 분리됨) |
| GitHub repo secrets | `COUPON_SECRET_KEY`, `COUPON_API_URL` — 코드/로그에 절대 노출 안 됨 |

접속 경로: `https://gameup.co.kr/heroes/coupon-server/`

## 완전히 제거하는 방법

1. **컨테이너 정지/삭제** (서버에서, 또는 GitHub Actions로 원격 실행)
   ```bash
   docker compose -f deploy/coupon-server/docker-compose.yml down
   ```
2. **Nginx 설정에서 블록 삭제** — `nginx/conf.d/gameup.conf`에서 `# ===== BEGIN moayhong-coupon-server =====` 부터 `# ===== END moayhong-coupon-server =====` 까지 통째로 삭제 후 `main`에 반영 (다음 정상 배포 시 자동 적용됨)
3. **코드 삭제**: `deploy/coupon-server/` 폴더, `.github/workflows/deploy-coupon-server.yml` 삭제
4. **GitHub Secrets 삭제**: 저장소 Settings → Secrets and variables → Actions 에서 `COUPON_SECRET_KEY`, `COUPON_API_URL` 삭제

위 1~3을 하나의 PR/커밋으로 묶어서 `main`에 올리면, 다음 자동배포 때 서버의 Nginx 설정도 함께 정리된다. gameup-platform 본 서비스(웹/API/DB)는 이 과정에서 전혀 영향받지 않는다.
