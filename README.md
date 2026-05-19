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
│   ├── db/           # Mongoose 스키마 (36개)
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

- 📘 [개발자 인수인계 매뉴얼](./docs/developer-handover.md) – 로컬 개발부터 자동 배포까지 전체 흐름
- 🚀 [CI/CD 셋업 가이드](./docs/cicd-setup.md) – Self-hosted runner 설치/관리
- 💾 [백업 전략](./docs/backup-strategy.md) – MongoDB 백업 및 복원 절차
- 🏗️ [플랫폼 아키텍처](./docs/platform-architecture.md) – 시스템 설계 문서
- 📋 [배포 계획](./docs/deployment-plan.md) – 초기 배포 진행 기록
- 🧪 [테스트 플랜](./docs/TEST_PLAN.md) – QA 체크리스트

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| Admin | admin@gameup.com | test123456 |
| Developer | developer@test.com | test123456 |
| Player | player@test.com | test123456 |

## 변경 이력 (dev-capcloud)

### 2026-05-19 — 분석 대시보드 UI 전면 개편

**분석 페이지 (`apps/web/src/components/pages/AnalyticsPage.tsx`)**
- 기간 선택 UI: 버튼 나열 방식 → 드롭다운 방식으로 변경 (어제/1주일/한 달/반년/1년/지정 날짜)
- 지정 날짜 선택 시 드롭다운 내부에서 날짜 입력 화면으로 전환
- 엑셀 내보내기: 텍스트 버튼 → 아이콘 전용 버튼 + 호버 툴팁
- 날짜 범위 표시 (기간 이름 · 시작일 ~ 종료일) 추가
- 분석 탭 레이아웃 재구성
  - 일별 추이 2분할: 좌(DAU/신규 유저/결제 유저) + 우(매출 추이: 매출/ARPU/ARPPU)
  - 유저 리텐션 · 세션 타임 · 수익 현황 3분할 동일 행 배치
- 리텐션 탭 포함 전 탭에 다운로드 버튼 표시

**신규 차트 컴포넌트**
- `RevenueTrendChart`: 매출/ARPU/ARPPU 멀티 토글 선 그래프
- `SessionTimeChart`: 세션 타임 선 그래프 (전체/결제자/비결제자 멀티 토글)

**기존 차트 개선**
- `DailyTrendChart`: dual-axis 제거로 수평 점선 그리드 정상화, 매출 항목 제거
- `RetentionChart`: 수평 점선 그리드 통일 (`vertical={false}` 제거)
- 모든 차트 그리드 스타일 통일

**리텐션 계산 방식 변경 (`apps/api`)**
- 코호트 기반 → 롤링 평균 방식으로 변경
- GA4 스타일 코호트 히트맵 테이블 추가 (파란색 농도로 잔존율 시각화)
- DAU/리텐션 집계에서 `play` 타입 세션 데이터 제외

**세션 타임 분류 집계 추가 (`apps/api`)**
- `avgSessionPayer` / `avgSessionNonPayer` 일별 데이터 추가
- `DailyPoint` 타입에 해당 필드 추가

**대시보드 (`apps/web/src/components/pages/DashboardPage.tsx`)**
- 기간 선택 드롭다운으로 변경 (어제/1주일/한 달/반년/1년/지정 날짜/누적)
- 엑셀 아이콘 전용 버튼 + 호버 툴팁
- 날짜 범위 표시 추가

### 2026-05-18 — GRAC 게임 관리 전면 개편

**게임 등록 방식 변경**
- 게임 파일(.zip) 업로드 방식 → 서비스 URL(`gameDomain`) 입력 방식으로 전환

**DB 모델 변경 (`packages/db`, `packages/types`)**
- `Game`: `gameDomain`, `bannerImage` 필드 추가 / `gameFile` 선택 필드로 변경
- `Game.approvalStatus`: `not_submitted` 상태 추가 (기본값 변경)
- 신규 모델 추가: `GameMedia`, `GameShopItem`, `GameAnnouncement`

**새 API 컨트롤러 추가 (`apps/api`)**
- `gameMediaController` — 스크린샷/영상 미디어 CRUD
- `gameShopController` — 게임 내 샵 아이템 CRUD
- `gameAnnouncementController` — 공지 & 알림 CRUD

**프론트엔드 (`apps/web`)**
- `GameDetailManagementPage`: 목업 데이터 제거 → 실API 연동, 탭 재편 (게임정보 편집 / 미디어 / 게임샵 / 포인트 보상 / 개발자 설정 / 공지&알림)
- `GameEditPage`: `gameDomain` 편집, 심사 요청 버튼, `not_submitted` 배지 추가
- `UploadGamePage`: 파일 업로드 UI 제거, 도메인 URL 입력 UI로 교체
- 관리자/플레이어 페이지 다수 UI 개선
- `DevLogPanel` 컴포넌트 추가

**기타**
- 장르 필터: 한글/영문 alias 매칭 지원 (예: `시뮬레이션` ↔ `simulation`)
- 유틸 스크립트 추가: `check-game.mjs`, `set-admin.mjs`, `update-game-domain.mjs`

### 2026-05-18 (3) — 게임 스크린샷 업로드 기능 수정

**수정 내용**
- 스크린샷 모달: 실제 파일 선택 + 16:9 미리보기 추가 (기존: 버튼만 있고 동작 안 함)
- API: 스크린샷 파일 업로드 미들웨어 추가 (`screenshotUpload`, `/uploads/screenshots/` 저장)
- 스크린샷 그리드: 등록된 이미지 실제 표시, hover 시 제목/삭제버튼 노출
- `gameService.addGameMedia`: 파일 있을 때 FormData 전송으로 변경

### 2026-05-18 (2) — 게임 소개 탭 UX 개선

**PlayerGameDetailPage 레이아웃 변경**
- CTA 버튼(베타 참여/구매)을 게임 설명 위로 이동 (참고 디자인 반영)
- 버튼 아래 스크린샷 갤러리 섹션 추가
  - 한 화면에 3장 노출, 3장 초과 시 좌우 스크롤 자동 적용
  - 스크린샷 미등록 시 플레이스홀더 3칸 표시
  - 이미지 hover 줌 효과
- `gameService.getGameMedia` API 연동으로 실제 등록 스크린샷 표시

---

## 라이선스

Private – 내부 사용 전용
