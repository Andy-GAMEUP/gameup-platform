# GAMEUP Platform 기능구조 및 API 정의서

> 작성일: 2026-04-08  
> 프로젝트: gameup-platform (Monorepo)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [프론트엔드 기능구조](#2-프론트엔드-기능구조)
3. [백엔드 API 정의](#3-백엔드-api-정의)
4. [데이터 모델](#4-데이터-모델)

---

## 1. 프로젝트 개요

### 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | Next.js 16 (App Router), React 19, Tailwind CSS 4, TanStack React Query |
| **백엔드** | Express.js 4, Mongoose 8, Socket.io 4 |
| **데이터베이스** | MongoDB |
| **인증** | NextAuth.js 5 + JWT, OAuth (Kakao, Naver) |
| **결제** | Toss Payments SDK |
| **모노레포** | Turbo + pnpm workspaces |

### 프로젝트 구조

```
gameup-platform/
├── apps/
│   ├── web/          # Next.js 프론트엔드 (90+ 페이지, 114 컴포넌트)
│   └── api/          # Express.js 백엔드 (37 라우트 파일, 40 컨트롤러)
├── packages/
│   ├── db/           # Mongoose 모델 (51개 스키마)
│   ├── types/        # 공유 TypeScript 타입
│   ├── ui/           # 공유 React 컴포넌트
│   └── utils/        # 공유 유틸리티
└── e2e/              # Playwright E2E 테스트
```

### 사용자 역할

| 역할 | 설명 |
|------|------|
| **Player (플레이어)** | 게임 플레이, 리뷰 작성, 커뮤니티 활동 |
| **Developer (개발자)** | 게임 등록/관리, 미니홈 운영, 포인트 정책 설정 |
| **Corporate (기업)** | 법인 회원, 승인 절차 필요 |
| **Partner (파트너)** | 게임 서비스 제공, 프로젝트 매칭 |
| **Admin (관리자)** | 플랫폼 전체 관리 (super / normal / monitor 등급) |

---

## 2. 프론트엔드 기능구조

### 2.1 라우트 그룹 요약

| 라우트 그룹 | 용도 | 페이지 수 |
|-------------|------|-----------|
| `(auth)` | 인증 (로그인, 회원가입) | 5 |
| `(console)` | 개발자 콘솔 | 11 |
| `(service)` | 메인 서비스 | 40+ |
| `(admin)` | 관리자 패널 | 34+ |
| Root | 홈페이지 | 1 |

---

### 2.2 인증 `(auth)`

```
(auth)/
├── login/                    # 로그인
├── register/                 # 회원가입
│   ├── agreement/            # 약관 동의
│   └── pending/              # 가입 승인 대기
└── profile-setup/            # 프로필 초기 설정
```

---

### 2.3 개발자 콘솔 `(console)`

```
(console)/
├── dashboard/                # 대시보드 (통계 개요)
├── games-management/         # 게임 목록 관리
│   └── [id]/
│       ├── edit/             # 게임 수정
│       └── manage/           # 게임 상세 관리 (포인트 정책, API 키, Q&A)
├── upload/                   # 게임 업로드
├── analytics/                # 분석 대시보드
├── feedback/                 # 피드백 관리
├── testers/                  # 테스터 관리
├── minihome-manage/          # 미니홈(포트폴리오) 관리
├── proposals/                # 투자/퍼블리싱 제안 관리
└── settings/                 # 설정
```

---

### 2.4 메인 서비스 `(service)`

```
(service)/
│
├── 🎮 게임
│   ├── games/                # 게임 목록 (탐색/필터)
│   ├── games/[id]/           # 게임 상세 (플레이, 리뷰, Q&A)
│   └── live_games/           # 라이브 게임 목록
│
├── 💬 커뮤니티
│   ├── community/            # 게시글 목록
│   ├── community/write/      # 게시글 작성
│   ├── community/[id]/       # 게시글 상세
│   ├── community/edit/[id]/  # 게시글 수정
│   └── community/bookmarks/  # 북마크한 게시글
│
├── 🏠 미니홈 (포트폴리오)
│   ├── minihome/             # 미니홈 디렉토리
│   └── minihome/[id]/        # 미니홈 상세
│
├── 🤝 파트너 채널
│   ├── partner/              # 파트너 메인 허브
│   ├── partner/directory/    # 파트너 디렉토리
│   ├── partner/[id]/         # 파트너 프로필
│   ├── partner/[id]/[postId]/ # 파트너 게시글 상세
│   ├── partner/write/        # 파트너 게시글 작성
│   ├── partner/edit/[id]/    # 파트너 프로필 수정
│   ├── partner/projects/     # 프로젝트 매칭 목록
│   └── partner/projects/[id]/ # 프로젝트 상세
│
├── 🏆 지원 프로그램
│   ├── support/              # 지원 프로그램 소개
│   ├── support/season/[id]/  # 시즌 상세
│   └── support/games/[id]/   # 지원 게임 상세
│
├── 🌍 퍼블리싱
│   ├── publishing/hk/        # 홍콩 퍼블리싱
│   └── publishing/hms/       # HMS 퍼블리싱
│
├── 📦 솔루션
│   └── solutions/            # B2B 솔루션 목록
│
├── 💳 결제
│   ├── payment/success/      # 결제 성공
│   └── payment/fail/         # 결제 실패
│
├── 📨 메시징
│   └── messages/             # 1:1 다이렉트 메시지
│
├── 📌 기타
│   ├── my/                   # 마이 페이지
│   ├── scrap/                # 스크랩 목록
│   ├── how-it-works/         # 이용 방법 안내
│   ├── gameup_platform/      # 플랫폼 소개
│   └── events/[id]/register/ # 이벤트 등록
```

---

### 2.5 관리자 패널 `(admin)`

```
(admin)/admin/
│
├── 📊 대시보드 & 분석
│   ├── /admin                     # 관리자 대시보드
│   ├── /admin/analytics           # 방문자 통계
│   └── /admin/analytics/menu      # 메뉴별 통계
│
├── 👥 회원 관리
│   ├── /admin/users               # 사용자 목록
│   ├── /admin/members             # 회원 총괄
│   ├── /admin/members/players     # 플레이어 회원
│   ├── /admin/members/corporate   # 기업 회원
│   ├── /admin/members/new_account # 신규 가입 회원
│   ├── /admin/members/terms       # 약관 관리
│   ├── /admin/users-enhanced/individual # 개인 회원 상세
│   ├── /admin/users-enhanced/corporate  # 기업 회원 상세
│   └── /admin/users-enhanced/[id]       # 회원 상세 정보
│
├── 🎮 게임 관리
│   ├── /admin/games               # 게임 목록
│   ├── /admin/metrics/[id]        # 게임 지표
│   ├── /admin/game-point-policies # 포인트 정책 승인
│   └── /admin/point-packages      # 포인트 패키지
│
├── 📈 활동 & 레벨
│   ├── /admin/activity-scores     # 활동 점수 관리
│   └── /admin/levels              # 레벨 설정
│
├── 🤝 파트너 관리
│   ├── /admin/partner-management  # 파트너 목록
│   ├── /admin/partner-requests    # 파트너 신청
│   ├── /admin/partner-topics      # 토픽 카테고리
│   └── /admin/partner-posts/[partnerId] # 파트너 게시글
│
├── 🏆 지원 프로그램 관리
│   ├── /admin/support-seasons     # 시즌 관리
│   ├── /admin/support-applications # 지원서 관리
│   └── /admin/support-banners     # 배너 관리
│
├── 🌍 퍼블리싱 관리
│   └── /admin/publishing/[type]   # 퍼블리싱 관리 (hk/hms)
│
├── 📝 콘텐츠 관리
│   ├── /admin/announcements       # 공지사항
│   ├── /admin/notifications       # 알림 발송
│   ├── /admin/community           # 커뮤니티 모더레이션
│   ├── /admin/minihome            # 미니홈 관리
│   ├── /admin/minihome-keywords   # 미니홈 키워드
│   ├── /admin/solutions           # 솔루션 관리
│   └── /admin/terms               # 약관 관리
│
├── 💰 개발자 포인트
│   └── /admin/developer-balances  # 개발자 잔액
│
└── 🔔 이벤트
    └── /admin/event-banners       # 이벤트 배너
```

---

### 2.6 프론트엔드 서비스 레이어

`apps/web/src/services/` 에 위치한 16개 서비스 모듈:

| 서비스 파일 | 기능 영역 | 주요 함수 |
|------------|-----------|-----------|
| `api.ts` | Axios 클라이언트 | 기본 설정, 토큰 관리 |
| `authService.ts` | 인증 | register, login, getProfile, updateProfile, changePassword, deleteAccount |
| `gameService.ts` | 게임 관리 | getAllGames, createGame, updateGame, deleteGame, Q&A, 포인트 정책, API 키 관리 |
| `playerService.ts` | 플레이어 | 리뷰 CRUD, 즐겨찾기, 스크랩, 팔로우, 활동 내역 |
| `communityService.ts` | 커뮤니티 | 게시글 CRUD, 댓글, 좋아요, 북마크, 신고, 임시저장 |
| `messageService.ts` | 메시징 | 채팅방 관리, 메시지 전송/읽음, 삭제 |
| `notificationService.ts` | 알림 | 알림 조회, 읽음 처리, 관리자 발송 |
| `partnerService.ts` | 파트너 채널 | 파트너 신청, 게시글, 슬로건 관리 |
| `partnerMatchingService.ts` | 파트너 매칭 | 프로필, 프로젝트, 지원/채용 |
| `minihomeService.ts` | 미니홈 | 포트폴리오, 자격증, 경력, 키워드 관리 |
| `supportService.ts` | 지원 프로그램 | 시즌, 지원서, 배너/탭 관리 |
| `publishingService.ts` | 퍼블리싱 | 랜딩, 게임 추천, 배너/탭 관리 |
| `solutionService.ts` | 솔루션 | 솔루션 목록, 구독, 관리자 CRUD |
| `adminService.ts` | 관리자 | 통계, 회원, 활동점수, 레벨, 공지, 약관 |
| `developerBalanceService.ts` | 개발자 포인트 | 잔액 조회, 거래 내역, 포인트 구매 |
| `eventBannerService.ts` | 이벤트 배너 | 배너 조회, 이벤트 등록 |

---

## 3. 백엔드 API 정의

### 3.0 미들웨어

| 미들웨어 | 설명 |
|----------|------|
| `authenticateToken` | JWT 토큰 검증 (Authorization: Bearer) |
| `requireRole(...roles)` | 역할 기반 접근 제어 (developer, player, admin) |
| `requireAdmin` | 관리자 전용 접근 |
| `requireAdminLevel(...levels)` | 관리자 등급별 접근 (super > normal > monitor) |
| `authenticateApiKey` | API 키 인증 (x-api-key 헤더) |
| `uploadFields` | 게임 파일 업로드 (html/zip, 최대 100MB) |
| `communityUpload` | 커뮤니티 이미지 업로드 (최대 5개, 5MB) |

### Rate Limiting

| 영역 | 제한 |
|------|------|
| 전역 | 500 req / 15분 |
| 인증 | 10 req / 15분 |
| 분석 추적 | 60 req / 60초 |

---

### 3.1 인증 API (`/api/auth`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/api/auth/oauth/callback` | - | OAuth 콜백 처리 |
| POST | `/api/auth/oauth/link` | ✅ | OAuth 계정 연동 |
| DELETE | `/api/auth/oauth/unlink/:provider` | ✅ | OAuth 계정 연동 해제 |

---

### 3.2 사용자 API (`/api/users`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/users/register` | - | 회원가입 |
| POST | `/users/login` | - | 로그인 |
| GET | `/users/profile` | ✅ | 내 프로필 조회 |
| PATCH | `/users/profile` | ✅ | 프로필 수정 |
| PATCH | `/users/password` | ✅ | 비밀번호 변경 |
| DELETE | `/users/account` | ✅ | 회원 탈퇴 |

---

### 3.3 팔로우 API (`/api/users`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/users/me/follow-stats` | ✅ | 팔로우 통계 |
| GET | `/users/:userId/followers` | - | 팔로워 목록 |
| GET | `/users/:userId/following` | - | 팔로잉 목록 |
| GET | `/users/:userId/follow-status` | ✅ | 팔로우 여부 확인 |
| POST | `/users/:userId/follow` | ✅ | 팔로우 토글 |

---

### 3.4 게임 API (`/api/games`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/games` | - | 게임 목록 조회 |
| GET | `/games/my` | Developer | 내 게임 목록 |
| GET | `/games/developer/stats` | Developer | 개발자 통계 |
| GET | `/games/developer/qas` | Developer | 개발자 Q&A 목록 |
| PUT | `/games/developer/qas/:qaId/answer` | Developer | Q&A 답변 |
| GET | `/games/my-qas` | ✅ | 내 Q&A 목록 |
| GET | `/games/:id` | - | 게임 상세 |
| POST | `/games` | Developer | 게임 등록 (파일 업로드) |
| PUT | `/games/:id` | Developer | 게임 수정 |
| DELETE | `/games/:id` | Developer | 게임 삭제 |
| GET | `/games/:gameId/qas` | - | 게임 Q&A 조회 |
| POST | `/games/:gameId/qas` | ✅ | Q&A 질문 작성 |

---

### 3.5 게임 이벤트 API (`/api`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/games/:gameId/events` | - | 게임 이벤트 목록 |
| POST | `/game-events` | Developer/Admin | 이벤트 생성 |
| PUT | `/game-events/:id` | Developer/Admin | 이벤트 수정 |
| DELETE | `/game-events/:id` | Developer/Admin | 이벤트 삭제 |
| POST | `/game-events/:eventId/claim` | ✅ | 이벤트 보상 수령 |

---

### 3.6 게임 포인트 API (`/api`)

#### 외부 게임 서버 연동 (API 키 인증)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/game-points/grant` | API Key | 유저에게 포인트 지급 |
| POST | `/game-points/batch-grant` | API Key | 포인트 일괄 지급 |

#### 포인트 정책 관리

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/game-points/:gameId/policies` | - | 포인트 정책 조회 |
| GET | `/games/:gameId/point-policies` | Developer | 내 게임 정책 조회 |
| POST | `/games/:gameId/point-policies` | Developer | 정책 생성/수정 |
| POST | `/games/:gameId/point-policies/submit` | Developer | 정책 승인 요청 |
| DELETE | `/games/:gameId/point-policies/:type` | Developer | 정책 삭제 |
| PUT | `/games/:gameId/point-policies/:type/toggle` | Developer | 정책 활성화 토글 |
| GET | `/game-points/:gameId/stats` | Developer | 포인트 통계 |
| GET | `/game-points/:gameId/logs` | Developer | 포인트 로그 |

#### 관리자 포인트 정책 (`/api/admin`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/game-point-policies` | Admin | 전체 정책 조회 |
| PUT | `/admin/game-point-policies/:id/approve` | Admin | 정책 승인 |
| PUT | `/admin/game-point-policies/:id/reject` | Admin | 정책 거절 |
| PUT | `/admin/game-point-policies/:id/toggle` | Admin | 정책 토글 |
| POST | `/admin/game-point-policies/batch-approve` | Admin | 일괄 승인 |
| POST | `/admin/game-point-policies/batch-reject` | Admin | 일괄 거절 |

---

### 3.7 플레이어 API (`/api`)

#### 리뷰

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/games/:gameId/reviews` | - | 게임 리뷰 목록 |
| GET | `/games/:gameId/my-review` | ✅ | 내 리뷰 조회 |
| POST | `/games/:gameId/reviews` | Player | 리뷰 작성/수정 |
| DELETE | `/games/:gameId/reviews` | Player | 리뷰 삭제 |
| POST | `/reviews/:reviewId/helpful` | Player | 도움됨 표시 |

#### 즐겨찾기 & 스크랩

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/player/favorites` | ✅ | 즐겨찾기 목록 |
| POST | `/player/favorites/check` | ✅ | 즐겨찾기 여부 확인 |
| POST | `/games/:gameId/favorite` | Player | 즐겨찾기 토글 |
| GET | `/player/scraps` | ✅ | 스크랩 목록 |

#### 플레이 & 활동

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/games/:gameId/play` | Player | 플레이 기록 |
| PATCH | `/games/:gameId/play/session` | Player | 플레이 세션 업데이트 |
| GET | `/player/activity` | ✅ | 활동 내역 |

---

### 3.8 커뮤니티 API (`/api/community`)

#### 게시글

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/community/stats` | - | 커뮤니티 통계 |
| GET | `/community/posts` | - | 게시글 목록 |
| GET | `/community/posts/:id` | - | 게시글 상세 |
| POST | `/community/posts` | ✅ | 게시글 작성 |
| PUT | `/community/posts/:id` | ✅ | 게시글 수정 |
| PATCH | `/community/posts/:id` | ✅ | 게시글 부분 수정 |
| DELETE | `/community/posts/:id` | ✅ | 게시글 삭제 |
| POST | `/community/posts/:id/like` | ✅ | 좋아요 토글 |
| POST | `/community/posts/:id/bookmark` | ✅ | 북마크 토글 |
| POST | `/community/posts/:id/report` | ✅ | 게시글 신고 |
| GET | `/community/my/bookmarks` | ✅ | 내 북마크 목록 |

#### 댓글

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/community/posts/:postId/comments` | - | 댓글 목록 |
| POST | `/community/posts/:postId/comments` | ✅ | 댓글 작성 |
| PUT | `/community/comments/:id` | ✅ | 댓글 수정 |
| DELETE | `/community/comments/:id` | ✅ | 댓글 삭제 |
| POST | `/community/comments/:id/like` | ✅ | 댓글 좋아요 |
| POST | `/community/comments/:id/report` | ✅ | 댓글 신고 |

#### 이미지 & 임시저장

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/community/upload-images` | ✅ | 이미지 업로드 |
| POST | `/community/posts/temp-save` | ✅ | 임시저장 |
| GET | `/community/my/drafts` | ✅ | 임시저장 목록 |

#### 관리자 커뮤니티

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/community/admin/reported` | Admin | 신고 게시글 목록 |
| PATCH | `/community/admin/posts/:id/status` | Admin | 게시글 상태 변경 |

---

### 3.9 메시징 API (`/api`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/messages/rooms` | ✅ | 채팅방 목록 |
| POST | `/messages/rooms` | ✅ | 채팅방 생성/조회 |
| GET | `/messages/rooms/:roomId` | ✅ | 채팅방 메시지 |
| POST | `/messages/send` | ✅ | 메시지 전송 |
| PUT | `/messages/read` | ✅ | 읽음 처리 |
| DELETE | `/messages/:id` | ✅ | 메시지 삭제 |
| DELETE | `/messages/rooms/:roomId` | ✅ | 채팅방 삭제 |

> Socket.io를 통한 실시간 메시징 지원

---

### 3.10 알림 API (`/api`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/notifications` | ✅ | 알림 목록 |
| GET | `/notifications/unread-count` | ✅ | 읽지 않은 알림 수 |
| PUT | `/notifications/:id/read` | ✅ | 알림 읽음 처리 |
| PUT | `/notifications/read-all` | ✅ | 전체 읽음 처리 |
| GET | `/admin/notifications` | Admin | 전체 알림 조회 |
| POST | `/admin/notifications/send` | Admin (monitor+) | 알림 발송 |

---

### 3.11 미니홈 API (`/api/minihome`)

#### 공개 API

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/minihome` | - | 미니홈 목록 |
| GET | `/minihome/keywords` | - | 키워드 그룹 조회 |
| GET | `/minihome/:id` | - | 미니홈 상세 |
| GET | `/minihome/:id/news` | - | 미니홈 뉴스 |

#### 사용자 API

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/minihome/me` | ✅ | 내 미니홈 조회 |
| POST | `/minihome` | ✅ | 미니홈 생성 |
| PUT | `/minihome` | ✅ | 미니홈 수정 |
| POST | `/minihome/games` | ✅ | 게임 추가 |
| PUT | `/minihome/games/:gameId` | ✅ | 게임 수정 |
| DELETE | `/minihome/games/:gameId` | ✅ | 게임 제거 |
| PUT | `/minihome/representative/:gameId` | ✅ | 대표 게임 설정 |
| POST | `/minihome/news` | ✅ | 뉴스 작성 |
| GET | `/minihome/proposals/me` | ✅ | 내 제안 목록 |
| POST | `/minihome/proposals` | ✅ | 제안 전송 |
| PATCH | `/minihome/proposals/:id/status` | ✅ | 제안 상태 변경 |

#### 관리자 API (`/api/admin/minihome`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/minihome` | Admin | 전체 미니홈 조회 |
| GET | `/admin/minihome/keywords` | Admin | 키워드 관리 |
| POST | `/admin/minihome/keywords` | Admin (normal+) | 키워드 생성 |
| PUT | `/admin/minihome/keywords/reorder` | Admin (normal+) | 키워드 정렬 |
| PUT | `/admin/minihome/keywords/:id` | Admin (normal+) | 키워드 수정 |
| DELETE | `/admin/minihome/keywords/:id` | Admin (super) | 키워드 삭제 |
| PATCH | `/admin/minihome/:id/visibility` | Admin (normal+) | 공개 토글 |
| PATCH | `/admin/minihome/:id/recommended` | Admin (normal+) | 추천 토글 |
| DELETE | `/admin/minihome/:id` | Admin (super) | 미니홈 삭제 |

---

### 3.12 파트너 API (`/api/partner`)

#### 파트너 채널

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/partner/topics` | - | 토픽 목록 |
| GET | `/partner/list` | - | 파트너 목록 |
| GET | `/partner/:partnerId` | - | 파트너 채널 |
| GET | `/partner/:partnerId/slogan` | - | 파트너 슬로건 |
| GET | `/partner/:partnerId/posts` | - | 파트너 게시글 |
| GET | `/partner/posts/:id` | - | 게시글 상세 |
| GET | `/partner/status` | ✅ | 내 파트너 상태 |
| POST | `/partner/apply` | ✅ | 파트너 신청 |
| PUT | `/partner/slogan` | ✅ | 슬로건 수정 |
| POST | `/partner/posts` | ✅ | 게시글 작성 |
| PUT | `/partner/posts/:id` | ✅ | 게시글 수정 |
| DELETE | `/partner/posts/:id` | ✅ | 게시글 삭제 |
| POST | `/partner/posts/:id/like` | ✅ | 좋아요 토글 |

#### 파트너 매칭 (프로필 & 프로젝트)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/partner/profiles` | - | 파트너 프로필 목록 |
| GET | `/partner/profiles/stats` | - | 프로필 통계 |
| GET | `/partner/profiles/:id` | - | 프로필 상세 |
| GET | `/partner/profiles/:id/reviews` | - | 프로필 리뷰 |
| POST | `/partner/profiles/:id/reviews` | ✅ | 리뷰 작성 |
| GET | `/partner/projects` | - | 프로젝트 목록 |
| GET | `/partner/projects/stats` | - | 프로젝트 통계 |
| GET | `/partner/projects/:id` | - | 프로젝트 상세 |
| GET | `/partner/projects/me` | ✅ | 내 프로젝트 |
| POST | `/partner/projects` | ✅ | 프로젝트 등록 |
| PUT | `/partner/projects/:id` | ✅ | 프로젝트 수정 |
| DELETE | `/partner/projects/:id` | ✅ | 프로젝트 삭제 |
| POST | `/partner/projects/:id/apply` | ✅ | 프로젝트 지원 |
| GET | `/partner/projects/:id/applicants` | ✅ | 지원자 목록 |
| PATCH | `/partner/projects/:id/applicants/:appId` | ✅ | 지원 상태 변경 |
| GET | `/partner/applications/me` | ✅ | 내 지원 목록 |
| GET | `/partner/activity` | ✅ | 파트너 활동 |

#### 관리자 파트너 (`/api/admin/partner`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/partner/requests` | Admin | 파트너 신청 목록 |
| GET | `/admin/partner/requests/:id` | Admin | 신청 상세 |
| PATCH | `/admin/partner/requests/:id` | Admin (normal+) | 신청 처리 |
| DELETE | `/admin/partner/requests/:id` | Admin (super) | 신청 삭제 |
| GET | `/admin/partner/list` | Admin | 파트너 목록 |
| GET | `/admin/partner/:id` | Admin | 파트너 상세 |
| PATCH | `/admin/partner/:id/status` | Admin (normal+) | 상태 변경 |
| PATCH | `/admin/partner/:id/visibility` | Admin (normal+) | 공개 토글 |
| PUT | `/admin/partner/:id/profile` | Admin (normal+) | 프로필 수정 |
| GET | `/admin/partner/topics` | Admin | 토픽 관리 |
| POST | `/admin/partner/topics` | Admin (normal+) | 토픽 생성 |
| PUT | `/admin/partner/topics/reorder` | Admin (normal+) | 토픽 정렬 |
| PUT | `/admin/partner/topics/:id` | Admin (normal+) | 토픽 수정 |
| DELETE | `/admin/partner/topics/:id` | Admin (super) | 토픽 삭제 |
| GET | `/admin/partner/projects` | Admin | 프로젝트 관리 |
| PATCH | `/admin/partner/projects/:id/status` | Admin (normal+) | 프로젝트 상태 |

---

### 3.13 지원 프로그램 API (`/api/support`)

#### 공개 API

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/support/intro` | - | 소개 페이지 |
| GET | `/support/season/current` | - | 현재 시즌 |
| GET | `/support/season/:id` | - | 시즌 상세 |
| GET | `/support/season/:seasonId/games` | - | 선정 게임 목록 |
| GET | `/support/games/:id` | - | 게임 상세 |

#### 사용자 API

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/support/apply` | ✅ | 지원 신청 |
| GET | `/support/applications/me` | ✅ | 내 지원 내역 |
| PUT | `/support/applications/:id/ir` | ✅ | IR 자료 업로드 |

#### 관리자 API (`/api/admin/support`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/support/seasons` | Admin | 시즌 목록 |
| POST | `/admin/support/seasons` | Admin (normal+) | 시즌 생성 |
| PUT | `/admin/support/seasons/:id` | Admin (normal+) | 시즌 수정 |
| PATCH | `/admin/support/seasons/:id/status` | Admin (normal+) | 시즌 상태 |
| DELETE | `/admin/support/seasons/:id` | Admin (super) | 시즌 삭제 |
| GET | `/admin/support/applications` | Admin | 지원서 목록 |
| GET | `/admin/support/applications/:id` | Admin | 지원서 상세 |
| PATCH | `/admin/support/applications/:id/status` | Admin (normal+) | 상태 변경 |
| PATCH | `/admin/support/applications/:id/confirm` | Admin (normal+) | 지원 확정 |
| PATCH | `/admin/support/applications/:id/score` | Admin (normal+) | 점수 평가 |
| PUT | `/admin/support/applications/:id/milestones` | Admin (normal+) | 마일스톤 업데이트 |
| GET/POST/PUT/DELETE | `/admin/support/banners` | Admin | 배너 관리 |
| GET/POST/PUT/DELETE | `/admin/support/tabs` | Admin | 탭 관리 |

---

### 3.14 퍼블리싱 API (`/api/publishing`)

#### 공개 API

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/publishing/:type` | - | 퍼블리싱 랜딩 (hk/hms) |
| GET | `/publishing/:type/games/:gameId` | - | 게임 상세 |

#### 사용자 API

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/publishing/:type/suggest` | ✅ | 게임 추천 |
| GET | `/publishing/:type/my-games` | ✅ | 내 퍼블리싱 게임 |
| GET | `/publishing/my-suggests` | ✅ | 내 추천 목록 |

#### 관리자 API (`/api/admin/publishing`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/publishing/:type/suggests` | Admin | 추천 목록 |
| GET | `/admin/publishing/suggests/:id` | Admin | 추천 상세 |
| PATCH | `/admin/publishing/suggests/:id` | Admin (normal+) | 추천 처리 |
| DELETE | `/admin/publishing/suggests/:id` | Admin (super) | 추천 삭제 |
| GET/POST/PUT/DELETE | `/admin/publishing/:type/banners` | Admin | 배너 관리 |
| GET/POST/PUT/DELETE | `/admin/publishing/:type/tabs` | Admin | 탭 관리 |

---

### 3.15 솔루션 API (`/api/solutions`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/solutions` | - | 솔루션 목록 |
| GET | `/solutions/:id` | - | 솔루션 상세 |
| POST | `/solutions/subscribe` | ✅ | 구독 신청 |
| GET | `/solutions/subscriptions/me` | ✅ | 내 구독 목록 |

#### 관리자 API (`/api/admin/solutions`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/solutions` | Admin | 솔루션 관리 |
| POST | `/admin/solutions` | Admin (normal+) | 솔루션 생성 |
| PUT | `/admin/solutions/:id` | Admin (normal+) | 솔루션 수정 |
| PUT | `/admin/solutions/reorder` | Admin (normal+) | 솔루션 정렬 |
| DELETE | `/admin/solutions/:id` | Admin (super) | 솔루션 삭제 |
| GET | `/admin/solutions/subscriptions` | Admin | 구독 관리 |
| PATCH | `/admin/solutions/subscriptions/:id/status` | Admin (normal+) | 구독 상태 |
| PATCH | `/admin/solutions/subscriptions/:id/confirm` | Admin (normal+) | 구독 확정 |

---

### 3.16 결제 API (`/api/payments`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/payments/order` | ✅ | 결제 주문 생성 |
| POST | `/payments/confirm` | ✅ | 결제 승인 |
| GET | `/payments/history` | ✅ | 결제 내역 |

---

### 3.17 세션 & 분석 API

#### 세션 관리 (`/api`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/session/start` | ✅ | 세션 시작 |
| POST | `/session/heartbeat` | ✅ | 세션 하트비트 |
| POST | `/session/end` | - | 세션 종료 |

#### 분석 추적 (`/api/analytics`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/analytics/track` | - | 페이지 방문 추적 |
| PATCH | `/analytics/track/:id/duration` | - | 체류 시간 업데이트 |

#### 관리자 분석 (`/api/admin/analytics`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/analytics/visitor-stats` | Admin | 방문자 통계 |
| GET | `/admin/analytics/menu-stats` | Admin | 메뉴별 통계 |
| GET | `/admin/analytics/dashboard-summary` | Admin | 대시보드 요약 |

---

### 3.18 API 키 관리 (`/api/games/:gameId/api-keys`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/games/:gameId/api-keys` | Developer/Admin | API 키 생성 |
| GET | `/games/:gameId/api-keys` | Developer/Admin | API 키 목록 |
| DELETE | `/games/:gameId/api-keys/:keyId` | Developer/Admin | API 키 삭제 |
| PUT | `/games/:gameId/api-keys/:keyId/regenerate` | Developer/Admin | API 키 재발급 |
| PUT | `/games/:gameId/api-keys/:keyId/toggle` | Developer/Admin | API 키 활성화 토글 |

---

### 3.19 개발자 포인트 & 패키지 (`/api`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/point-packages` | - | 포인트 패키지 목록 |
| GET | `/developer/point-balance` | Developer/Admin | 내 포인트 잔액 |
| GET | `/developer/point-transactions` | Developer/Admin | 거래 내역 |
| POST | `/developer/point-purchase` | Developer/Admin | 포인트 구매 |
| GET | `/admin/developer-balances` | Admin | 전체 잔액 조회 |
| POST | `/admin/developer-balances/:developerId/adjust` | Admin | 잔액 조정 |
| GET | `/admin/point-packages` | Admin | 패키지 관리 |
| POST | `/admin/point-packages` | Admin | 패키지 생성 |
| PUT | `/admin/point-packages/:id` | Admin | 패키지 수정 |

---

### 3.20 이벤트 배너 API (`/api`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/event-banners` | - | 활성 이벤트 배너 |
| POST | `/event-banners/:id/register` | - | 이벤트 참여 등록 |
| GET | `/admin/event-banners` | Admin | 전체 배너 관리 |
| POST | `/admin/event-banners` | Admin (normal+) | 배너 생성 |
| PUT | `/admin/event-banners/reorder` | Admin (normal+) | 배너 정렬 |
| PUT | `/admin/event-banners/:id` | Admin (normal+) | 배너 수정 |
| DELETE | `/admin/event-banners/:id` | Admin (super) | 배너 삭제 |
| GET | `/admin/event-registrations` | Admin | 이벤트 등록자 목록 |

---

### 3.21 관리자 종합 API (`/api/admin`)

#### 사용자 관리

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/users` | Admin | 사용자 목록 |
| GET | `/admin/users/:id` | Admin | 사용자 상세 |
| PATCH | `/admin/users/:id/role` | Admin (normal+) | 역할 변경 |
| PATCH | `/admin/users/:id/ban` | Admin (normal+) | 정지 처리 |
| PATCH | `/admin/users/:id/approve` | Admin (super) | 사용자 승인 |
| DELETE | `/admin/users/:id` | Admin (super) | 사용자 삭제 |
| POST | `/admin/users/create-admin` | Admin (super) | 관리자 생성 |

#### 회원 상세 관리 (`/api/admin/users-enhanced`)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/users-enhanced/individual` | Admin | 개인 회원 |
| GET | `/admin/users-enhanced/corporate` | Admin | 기업 회원 |
| GET | `/admin/users-enhanced/:id/detail` | Admin | 회원 상세 |
| POST | `/admin/users-enhanced/bulk-notify` | Admin (monitor+) | 대량 알림 |
| PATCH | `/admin/users-enhanced/:id` | Admin (normal+) | 회원 수정 |
| POST | `/admin/users-enhanced/:id/activity-score` | Admin (normal+) | 활동 점수 부여 |
| POST | `/admin/users-enhanced/:id/points` | Admin (normal+) | 포인트 부여 |
| PATCH | `/admin/users-enhanced/:id/approval` | Admin (super) | 기업 승인 |

#### 게임 관리

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/games` | Admin | 전체 게임 |
| GET | `/admin/games/pending` | Admin | 승인 대기 게임 |
| GET | `/admin/games/:id/metrics` | Admin | 게임 지표 |
| PATCH | `/admin/games/:id/control` | Admin (normal+) | 게임 상태 제어 |
| PATCH | `/admin/games/:id/archive` | Admin (normal+) | 게임 아카이브 |
| PATCH | `/admin/games/:id/approve` | Admin (super) | 게임 승인 |

#### 리뷰 관리

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/reviews` | Admin | 전체 리뷰 |
| PATCH | `/admin/reviews/:id/block` | Admin (normal+) | 리뷰 차단 |
| DELETE | `/admin/reviews/:id` | Admin (super) | 리뷰 삭제 |

#### 공지사항

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/announcements/public` | - | 공개 공지 |
| GET | `/admin/announcements` | Admin | 전체 공지 |
| POST | `/admin/announcements` | Admin (monitor+) | 공지 생성 |
| PATCH | `/admin/announcements/:id` | Admin (monitor+) | 공지 수정 |
| DELETE | `/admin/announcements/:id` | Admin (super) | 공지 삭제 |

#### 레벨 & 활동 점수

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/levels` | Admin | 레벨 목록 |
| POST | `/admin/levels` | Admin (super) | 레벨 설정 |
| GET | `/api/levels` | - | 공개 레벨 정보 |
| GET | `/admin/activity-scores` | Admin | 활동 점수 내역 |
| GET | `/admin/activity-scores/policies` | Admin | 포인트 정책 |
| PUT | `/admin/activity-scores/policies/:id` | Admin (super) | 정책 수정 |
| POST | `/admin/activity-scores/policies/seed` | Admin (super) | 정책 초기화 |
| GET | `/api/my/activity-scores` | ✅ | 내 활동 점수 |

#### 약관

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/api/terms` | - | 공개 약관 |
| GET | `/admin/terms` | Admin | 약관 관리 |
| POST | `/admin/terms` | Admin (normal+) | 약관 수정 |

#### 통계

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/stats` | Admin | 관리자 대시보드 통계 |
| GET | `/admin/members/pending-counts` | Admin | 가입 승인 대기 수 |

---

### 3.22 헬스체크

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/api/health` | - | 서버 상태 확인 |

---

## 4. 데이터 모델

### 4.1 모델 요약 (51개)

| 카테고리 | 모델 수 | 모델 목록 |
|----------|---------|-----------|
| **사용자 & 인증** | 2 | User, Follow |
| **게임 관리** | 8 | Game, GameApplication, GameEvent, GameEventClaim, GamePointPolicy, GamePointLog, GameApiKey, GameQA |
| **커뮤니티** | 5 | Post, Comment, Review, Feedback, Scrap |
| **파트너 & 퍼블리싱** | 10 | Partner, PartnerPost, PartnerProject, PartnerProjectApplication, PartnerReview, TopicGroup, Publishing, PublishingBanner, PublishingTab, PublishingSuggest |
| **미니홈** | 5 | MiniHome, MiniHomeGame, MiniHomeNews, MiniHomeKeywordGroup, Proposal |
| **메시징 & 알림** | 3 | ChatRoom, Message, Notification |
| **포인트 & 보상** | 6 | PointPolicy, PointHistory, ActivityScore, PointPackage, DeveloperPointBalance, DeveloperPointTransaction |
| **지원 & 정보** | 8 | Season, SupportBanner, SupportTab, Solution, SolutionSubscription, EventBanner, EventRegistration, Terms |
| **분석 & 세션** | 3 | PageVisit, UserSession, Level |
| **결제** | 1 | Payment |

---

### 4.2 주요 모델 상세

#### User (사용자)
```
email, username, password, role (player|developer|admin), adminLevel (super|normal|monitor)
memberType (individual|corporate), bio, profileImage, level, activityScore, points
oauthProviders [{provider, providerId}], companyInfo {name, type, number, address}
contactPerson {name, position, phone, email}, approvalStatus, status
```

#### Game (게임)
```
title, description, developerId, genre, gameFile, thumbnail, price, isPaid
playCount, rating, status (draft|beta|published|archived)
approvalStatus (pending|review|approved|rejected)
monetization (free|ad|paid|freemium), serviceType (beta|live)
tags[], platform[], engine
```

#### Post (커뮤니티 게시글)
```
title, content, author, gameId, channel (notice|new-game-intro|beta-game|live-game|free)
images[], videoUrl, tags[], likes[], bookmarks[], views, commentCount
status, isPinned, isHot, hotScore, reportCount, reports[]
```

#### MiniHome (미니홈)
```
userId, companyName, introduction, profileImage, coverImage
website, tags[], keywords[], isPublic
expertiseArea, skills[], hourlyRate, availability, location
isVerified, rating, reviewCount, completedProjectCount
portfolio[], certifications[], workExperience[]
```

#### Partner (파트너)
```
userId, status, slogan, introduction, activityPlan
profileImage, postCount, isProfilePublic, approvedAt
```

#### GamePointPolicy (게임 포인트 정책)
```
gameId, developerId
type (account_create|daily_login|play_time|purchase|event|level|ranking)
amount, multiplier, dailyLimit
approvalStatus (pending|approved|rejected)
```

#### Season (지원 시즌)
```
title, status
recruitingTitle, recruitingStartDate, recruitingEndDate
progressTitle, completionTitle, isVisible
```

#### PointPolicy (플랫폼 포인트 정책)
```
type (login|stay_time|post_write|comment_write|game_access|...)
label, amount, multiplier, dailyLimit, isActive
```

---

### 4.3 타입 정의 (packages/types)

| 타입 | 값 |
|------|-----|
| `UserRole` | `'player' \| 'developer' \| 'admin'` |
| `MemberType` | `'individual' \| 'corporate'` |
| `UserStatus` | `'active' \| 'suspended' \| 'withdrawn' \| 'deleted'` |
| `GameStatus` | `'draft' \| 'beta' \| 'published' \| 'archived'` |
| `ApprovalStatus` | `'pending' \| 'review' \| 'approved' \| 'rejected'` |
| `MonetizationType` | `'free' \| 'ad' \| 'paid' \| 'freemium'` |
| `ServiceType` | `'beta' \| 'live'` |
| `CommunityChannel` | `'notice' \| 'new-game-intro' \| 'beta-game' \| 'live-game' \| 'free'` |
| `ScrapType` | `'game' \| 'community' \| 'partner' \| 'minihome' \| 'solution'` |
| `CompanyType` | `'developer' \| 'publisher' \| 'game_solution' \| 'game_service' \| 'operations' \| 'qa' \| 'marketing' \| 'other'` |
| `CorporateApprovalStatus` | `'pending' \| 'approved' \| 'rejected'` |
| `PaymentStatus` | `'pending' \| 'completed' \| 'failed' \| 'refunded'` |

---

> **총 API 엔드포인트:** 약 250개  
> **프론트엔드 페이지:** 90+ 페이지  
> **React 컴포넌트:** 114개  
> **서비스 모듈:** 16개  
> **데이터 모델:** 51개
