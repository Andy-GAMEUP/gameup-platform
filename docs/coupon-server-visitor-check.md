# 쿠폰 페이지 접근자 확인

쿠폰 페이지(`/moayong/coupon-server/...`)로 들어온 IP 중, gameup.co.kr의 다른 경로(메인 사이트 등)도 접근한 IP가 있는지 확인하는 도구. **자동 차단은 하지 않고, 로그로만 보여준다 — 차단 여부는 사람이 보고 직접 판단.**

## 사용하는 워크플로우

`.github/workflows/check-coupon-visitor-ips.yml` (수동 실행 전용, 읽기 전용)

- self-hosted 러너에서 `docker logs gameup-nginx --tail 20000` 로 최근 로그를 가져와 분석
- `/moayong/coupon-server`로 시작하는 경로를 한 번이라도 요청한 IP 중, 그 외 경로도 요청한 IP를 골라 출력
- 아무 것도 변경/차단하지 않음 (완전 읽기 전용)

> access.log는 실제 파일이 아니라 `/dev/stdout` 심볼릭 링크라서, `docker exec ... cat/tail`로 직접 읽으면 무한 대기한다. 반드시 `docker logs` 명령으로 조회해야 한다.

## 사용자가 "접근한 사람 보여줘" 등으로 요청하면

1. GitHub Actions에서 `Check Coupon Visitor IPs (read-only)` workflow_dispatch 실행 (API 또는 웹 UI)
2. 완료 후 로그에서 결과 확인
3. 걸린 IP가 있으면, 필요 시 무료 IP 위치 조회(`http://ip-api.com/json/<IP>?lang=ko`)로 대략적인 지역/통신사 확인해서 같이 보여준다
4. 차단 여부는 사용자가 판단 — 자동으로 차단하지 않는다

## 참고

- 쿠폰 서버 자체 배포/구성은 [`coupon-server-deployment.md`](./coupon-server-deployment.md) 참고
