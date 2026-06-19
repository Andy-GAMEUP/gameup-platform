# GAMEUP Platform

인디 게임 발굴·커뮤니티·개발자 도구를 제공하는 게이밍 플랫폼 모노레포입니다.

- **프로덕션**: https://www.gameup.co.kr
- **저장소**: https://github.com/Andy-GAMEUP/gameup-platform

## 프로젝트 구조

```
gameup-platform/
├── apps/
│   ├── web/          # Next.js 16 frontend (React 19, Tailwind CSS 4)
│   └── api/          # Express.js 4 backend (MongoDB, Socket.io)
├── packages/
│   ├── db/           # Mongoose 스키마 (59개)
│   ├── types/        # 공유 TypeScript 타입
│   ├── ui/           # 공유 React 컴포넌트
│   └── utils/        # 공유 유틸리티
├── e2e/              # Playwright E2E 테스트
├── scripts/          # 배포/백업/마이그레이션 스크립트
└── docs/             # 운영 문서
```

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, NextAuth.js 5, TanStack React Query, Tailwind CSS 4
- **Backend**: Express.js 4, Mongoose 8, Socket.io 4, JWT auth
- **Database**: MongoDB
- **Monorepo**: Turbo + pnpm workspaces
- **Testing**: Playwright E2E
- **Payment**: Toss Payments SDK
- **CI/CD**: GitHub Actions (self-hosted runner)

## 빠른 시작

```bash
# 저장소 클론
git clone https://github.com/Andy-GAMEUP/gameup-platform.git
cd gameup-platform

# 의존성 설치
pnpm install

# 환경변수 준비 (apps/api/.env, apps/web/.env.local)
# 자세한 설정은 developer-handover.md 참조

# 개발 서버 실행 (web + api 동시)
pnpm dev
```

### 자주 쓰는 명령어

```bash
pnpm dev              # 개발 서버 실행
pnpm build            # 전체 빌드
pnpm lint             # 린트
pnpm type-check       # 타입 체크
pnpm test:e2e         # E2E 테스트
```

## 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 프로덕션 서버에 배포합니다.

```bash
git push origin main
```

수동 배포:
```bash
gh workflow run "Deploy to gameup.co.kr" --ref main
```

## 문서

신규 개발자는 **[개발자 인수인계 매뉴얼](./docs/developer-handover.md)**부터 통독하세요.

### 운영 문서

- 📋 [플랫폼 운영 규칙](./docs/platform-rules.md) – 게임 심사·회원·배너·포인트 등 전체 규칙 정의
- 📘 [개발자 인수인계 매뉴얼](./docs/developer-handover.md) – 로컬 개발부터 자동 배포까지 전체 흐름
- 🚀 [CI/CD 셋업 가이드](./docs/cicd-setup.md) – Self-hosted runner 설치/관리
- 💾 [백업 전략](./docs/backup-strategy.md) – MongoDB 백업 및 복원 절차
- 🏗️ [플랫폼 아키텍처](./docs/platform-architecture.md) – 기능구조 및 API 정의서
- 📋 [배포 계획](./docs/deployment-plan.md) – 초기 배포 진행 기록 (deprecated)
- 🧪 [테스트 플랜](./docs/TEST_PLAN.md) – QA 체크리스트

### 배포 / 변경 이력

- ☁️ [베타테스트 배포 계획](./docs/deployment-betatest-plan.md) – 베타테스트 클라우드 환경 구축 기록
- 📝 [커뮤니티 변경 이력](./docs/community-changelog-2026-03-18.md) – v2.5.1 커뮤니티 기능 추가 및 점검 보고
- 🗑️ [파트너 콘솔 제거](./docs/partner-console-removal-2026-03-20.md) – 파트너 콘솔 기능 제거 작업 기록

### 기능 설계

- 👤 [파트너 계정 재설계](./docs/partner-account-redesign.md) – 개발자 / 파트너 계정 구분 설계
- 🛒 [게임샵 & 결제 시스템](./docs/feature-specs/gameshop-payment-plan.md) – 게임샵 및 결제 개발 계획
- 🎮 [게임 활동포인트 시스템 v2](./docs/feature-specs/game-activity-point-system-v2.md) – 개발사 활동포인트 지급 설계
- 🏆 [플레이어 리워드 시스템](./docs/feature-specs/player-reward-system.md) – 플레이어 보상 기능 정의서
- 🎖️ [회원 등급/레벨 시스템](./docs/feature-specs/user-level-display-system.md) – 등급 표시 및 활동포인트 개선 설계

### API 문서

- 🔌 [게임-플랫폼 포인트 연동 API](./docs/api/game-point-integration-api.md) – 게임과 플랫폼 간 포인트 연동 API 명세

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| Admin | admin@gameup.com | test123456 |
| Developer | developer@test.com | test123456 |
| Player | player@test.com | test123456 |

## 라이선스

Private – 내부 사용 전용
