# 회원 등급/레벨 표시 및 활동포인트 시스템 개선

## 1. 현황 분석

### 1.1 데이터 모델 (정상)
| 항목 | 모델 | 필드 | 상태 |
|------|------|------|------|
| 유저 레벨 | User | `level` (1~50, default: 1) | **DB에 존재** |
| 활동점수 | User | `activityScore` (default: 0) | **DB에 존재** |
| 레벨 정의 | Level | `level`, `name`, `icon`, `requiredScore` | **18단계 정의됨** |
| 활동이력 | ActivityScore | `userId`, `type`, `amount`, `reason` | **21개 활동 타입** |
| 정책 설정 | PointPolicy | `type`, `amount`, `dailyLimit`, `isActive` | **관리자 설정 가능** |

### 1.2 문제점 진단

#### A. 세션/인증 체인에 level, activityScore 누락
```
API 로그인 응답 → Credentials Provider → JWT 토큰 → Session → useAuth 훅
      ❌ 누락           ❌ 누락            ❌ 누락     ❌ 누락    ❌ 누락
```
- `userController.ts`의 login 응답에 `level`, `activityScore` 미포함
- `auth.ts` (NextAuth) JWT/Session 콜백에 해당 필드 미전달
- `useAuth` 훅에서 `level`, `activityScore` 접근 불가

#### B. 컴포넌트별 레벨 표시 현황
| 화면 | 유저명 | 역할 | 레벨 | 활동점수 | 문제 |
|------|--------|------|------|----------|------|
| **PostCard** (목록) | O | O | **X** | X | 레벨 미표시 |
| **PostDetail** (상세) | O | O | O | X | 정상 (API populate) |
| **Comment** (댓글) | O | O | O | X | 정상 (API populate) |
| **Review** (리뷰) | O | **X** | **X** | X | role, level 미populate |
| **Chat/Message** | O | X | **X** | X | 레벨 미표시 |
| **마이페이지** | O | X | **부분** | **부분** | useAuth에 값 없음 |

#### C. LevelBadge 컴포넌트
- 10단계 아이콘만 정의 (DB에는 18단계 존재)
- DB Level 모델의 `name`, `icon` 필드 활용 안 함 (하드코딩된 아이콘 사용)

---

## 2. 개선 목표

### 핵심 목표
1. **모든 유저 표시 영역에서 등급(레벨) 뱃지 일관 노출**
2. **마이페이지에서 등급/레벨 상세 + 활동포인트 이력 확인**
3. **DB에 정의된 레벨 정보(name, icon)를 실제 사용하도록 연동**

### 달성 기준
- [x] 로그인 시 session에 level, activityScore 포함
- [x] PostCard 목록에서 레벨 뱃지 노출
- [x] Review에서 레벨/역할 뱃지 노출
- [x] 메시지/채팅에서 레벨 뱃지 노출
- [x] 마이페이지: 레벨 카드 (아이콘 + 등급명 + 다음 레벨 진행률)
- [x] 마이페이지: 활동포인트 이력 탭 (최근 거래 내역)
- [x] LevelBadge가 DB 레벨 정보 활용 (동적 아이콘/이름)

---

## 3. 기술 설계

### 3.1 레벨 정보 전달 아키텍처

```
[Level DB] ──cache──> [API 레벨 캐시]
                          │
[User Login] ──────> [login 응답 + level, activityScore, levelInfo]
                          │
                     [NextAuth JWT] ──> [Session] ──> [useAuth 훅]
                                                          │
                                              [LevelBadge] [MyPage]

[API populate] ──> [Post/Comment/Review 응답 + author.level]
                          │
                     [PostCard] [CommentBlock] [ReviewCard]
```

### 3.2 공개 레벨 정보 API
- `GET /api/levels` (공개, 캐시 가능) → 전체 레벨 목록 반환
- 프론트엔드에서 TanStack Query로 캐시 (staleTime: 10분)
- LevelBadge 컴포넌트에서 레벨 번호 → 이름/아이콘 매핑

### 3.3 활동포인트 이력 API
- `GET /api/my/activity-scores` (인증 필수) → 로그인 유저의 활동이력 페이지네이션
- 기존 `GET /api/admin/activity-scores`와 유사하나 유저 자신의 것만

---

## 4. 개발 계획

### Phase 1: 백엔드 데이터 파이프라인 수정 (API)
**목표:** 로그인 응답 + API populate에 레벨 정보 완전 포함

| # | 작업 | 파일 | 내용 |
|---|------|------|------|
| 1-1 | 로그인 응답에 level, activityScore 추가 | `userController.ts` | login 함수 응답 객체에 필드 추가 |
| 1-2 | 레벨 공개 API 추가 | `userRoutes.ts` + 새 컨트롤러 | `GET /api/levels` 전체 레벨 목록 |
| 1-3 | 내 활동이력 API 추가 | `userRoutes.ts` + 컨트롤러 | `GET /api/my/activity-scores` |
| 1-4 | Review populate 수정 | `reviewController.ts` | `.populate('userId', 'username role level')` |
| 1-5 | Message populate 확인 | `messageRoutes.ts` / 컨트롤러 | sender에 level 추가 |
| 1-6 | getProfile에 level, activityScore 포함 | `userController.ts` | 프로필 조회 시 레벨 정보 |

### Phase 2: 프론트엔드 인증 체인 수정
**목표:** useAuth 훅에서 level, activityScore 접근 가능

| # | 작업 | 파일 | 내용 |
|---|------|------|------|
| 2-1 | Credentials Provider에 level, activityScore 추가 | `auth.ts` | authorize 반환값에 추가 |
| 2-2 | JWT 콜백에 level, activityScore 저장 | `auth.ts` | token.level, token.activityScore 설정 |
| 2-3 | Session 콜백에 level, activityScore 전달 | `auth.ts` | session.user에 추가 |
| 2-4 | useAuth 훅 타입 업데이트 | `useAuth.ts` | user 객체에 level, activityScore 포함 |

### Phase 3: LevelBadge 컴포넌트 고도화
**목표:** DB 레벨 정보(이름, 아이콘)를 동적으로 표시

| # | 작업 | 파일 | 내용 |
|---|------|------|------|
| 3-1 | 레벨 데이터 훅 생성 | `useLevels.ts` (신규) | GET /api/levels + TanStack Query 캐시 |
| 3-2 | LevelBadge 개선 | `LevelBadge.tsx` | DB 아이콘/이름 사용, 18단계 지원, 등급명 표시 옵션 |
| 3-3 | LevelBadge 변형 추가 | `LevelBadge.tsx` | `variant="compact"` (아이콘+Lv만), `variant="full"` (이름+바), `variant="card"` (큰 카드) |

### Phase 4: PostCard, Review, Message에 레벨 뱃지 추가
**목표:** 모든 유저 표시 영역에서 등급 일관 노출

| # | 작업 | 파일 | 내용 |
|---|------|------|------|
| 4-1 | PostCard에 LevelBadge 추가 | `PostCard.tsx` | 작성자 이름 옆에 compact 뱃지 |
| 4-2 | Review에 LevelBadge + RoleBadge 추가 | `PlayerGameDetailPage.tsx` | 리뷰 작성자에 레벨/역할 뱃지 |
| 4-3 | MessagesPage에 LevelBadge 추가 | `MessagesPage.tsx` | 대화 상대 이름 옆에 뱃지 |
| 4-4 | 기타 유저 표시 컴포넌트 확인 | 파트너 목록, 솔루션 등 | 필요시 LevelBadge 추가 |

### Phase 5: 마이페이지 등급/활동포인트 UI
**목표:** 자신의 등급과 포인트 현황을 한눈에 확인

| # | 작업 | 파일 | 내용 |
|---|------|------|------|
| 5-1 | 레벨 카드 컴포넌트 생성 | `LevelProgressCard.tsx` (신규) | 현재 레벨 아이콘/이름, 다음 레벨까지 진행률 바, 현재 활동점수 |
| 5-2 | PlayerMyPage 헤더에 레벨 카드 추가 | `PlayerMyPage.tsx` | 프로필 영역에 LevelProgressCard 배치 |
| 5-3 | 활동포인트 이력 탭 추가 | `PlayerMyPage.tsx` | 새 탭: "활동포인트" - 최근 포인트 변동 내역 리스트 |
| 5-4 | 개발사 마이페이지에도 동일 적용 | 해당 컴포넌트 | 개발사도 레벨/활동점수 표시 |
| 5-5 | playerService에 활동이력 API 추가 | `playerService.ts` | `getMyActivityScores()` 함수 |

### Phase 6: 테스트 및 검증

| # | 작업 | 내용 |
|---|------|------|
| 6-1 | 시드 데이터로 레벨 분포 확인 | 테스트 계정들의 level, activityScore 올바른지 확인 |
| 6-2 | 로그인 → 세션 검증 | useAuth에서 level, activityScore 정상 반환 확인 |
| 6-3 | 커뮤니티 화면 전체 확인 | PostCard, 상세, 댓글, 리뷰에서 레벨 뱃지 노출 확인 |
| 6-4 | 마이페이지 확인 | 레벨 카드, 진행률, 활동이력 정상 표시 확인 |
| 6-5 | 레벨업 시나리오 검증 | 포인트 획득 → 레벨 변경 → 세션 반영 확인 |

---

## 5. 상세 UI 설계

### 5.1 LevelBadge 변형

```
[compact] 🌟 Lv.5            ← PostCard, 댓글, 리뷰 (현재와 유사)
[full]    🌟 Lv.5 별빛         ← 포스트 상세, 프로필 (등급명 포함)
[card]    ┌─────────────────┐  ← 마이페이지 전용
          │  🌟              │
          │  Lv.5 별빛       │
          │  ████████░░ 80%  │
          │  152 / 190 점    │
          └─────────────────┘
```

### 5.2 PostCard 레벨 표시
```
┌─────────────────────────────────────┐
│ [A] username  🌟Lv.5  개발사  · 2시간 전 │
│ 게시물 제목                            │
│ 게시물 내용 미리보기...                  │
│ 💬 12  ❤️ 45  👁 230                  │
└─────────────────────────────────────┘
```

### 5.3 마이페이지 레벨 섹션
```
┌─────────────────────────────────────────────┐
│  [프로필 이미지]                               │
│  username        🌟 Lv.5 별빛    개발사       │
│  bio text here...                            │
│                                              │
│  ┌──── 내 등급 ────────────────────────┐     │
│  │  🌟 Lv.5 별빛                       │     │
│  │  활동점수: 152점                     │     │
│  │  다음 등급(Lv.6 불꽃): 38점 남음      │     │
│  │  ██████████████░░░░░░░░ 80%         │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  [즐겨찾기] [활동 내역] [활동포인트] [Q&A] [프로필] │
└─────────────────────────────────────────────┘
```

### 5.4 활동포인트 이력 탭
```
┌─────────────────────────────────────────────┐
│  활동포인트 이력                               │
│                                              │
│  오늘                                         │
│  ✅ +1P  일일 접속 보상              10:30     │
│  ✅ +1P  게시물 작성                 11:15     │
│  ✅ +1P  댓글 작성                   11:20     │
│                                              │
│  어제                                         │
│  ✅ +1P  일일 접속 보상              09:00     │
│  ✅ +3P  게임 이벤트 참여            14:30     │
│  ❌ -1P  게시물 삭제                 16:00     │
│                                              │
│  [더 보기]                                    │
└─────────────────────────────────────────────┘
```

---

## 6. 영향 범위

### 수정 파일 목록

**백엔드 (apps/api/src/)**
- `controllers/userController.ts` - 로그인 응답 수정
- `controllers/reviewController.ts` - populate 수정
- `controllers/messageController.ts` - populate 확인/수정
- `routes/userRoutes.ts` - 새 API 엔드포인트 추가
- 신규: `controllers/levelController.ts` - 레벨 공개 API

**프론트엔드 (apps/web/src/)**
- `lib/auth.ts` - NextAuth 콜백 수정
- `lib/useAuth.ts` - 타입 업데이트
- `components/LevelBadge.tsx` - 고도화
- `components/community/PostCard.tsx` - 레벨 뱃지 추가
- `components/pages/PlayerMyPage.tsx` - 레벨 카드 + 활동포인트 탭
- `components/pages/PlayerGameDetailPage.tsx` - 리뷰 레벨 표시
- `components/pages/MessagesPage.tsx` - 채팅 레벨 표시
- `services/playerService.ts` - 활동이력 API 추가
- 신규: `hooks/useLevels.ts` - 레벨 데이터 훅
- 신규: `components/LevelProgressCard.tsx` - 레벨 진행 카드

### 영향 없는 영역
- DB 모델 변경 없음 (기존 User.level, User.activityScore 활용)
- 관리자 페이지 변경 없음 (기존 레벨/정책 관리 그대로)
- 포인트 계산 로직 변경 없음 (pointService.ts)
- 게임 포인트 시스템 영향 없음

---

## 7. 개발 우선순위 및 일정

| 단계 | 내용 | 예상 난이도 | 의존성 |
|------|------|-----------|--------|
| Phase 1 | 백엔드 API 수정 | 낮음 | 없음 |
| Phase 2 | 인증 체인 수정 | 중간 | Phase 1 |
| Phase 3 | LevelBadge 고도화 | 중간 | Phase 1 (레벨 API) |
| Phase 4 | 커뮤니티 레벨 표시 | 낮음 | Phase 3 |
| Phase 5 | 마이페이지 UI | 높음 | Phase 1, 2, 3 |
| Phase 6 | 테스트/검증 | 낮음 | Phase 1~5 |

**핵심 경로:** Phase 1 → Phase 2 → Phase 3 → Phase 5
**병렬 가능:** Phase 3 + Phase 4 (LevelBadge 완성 후)

---

## 8. 주의사항

1. **세션 갱신 문제:** JWT 토큰에 level을 저장하면, 레벨업 시 기존 세션은 이전 레벨을 보여줌 → 페이지 새로고침 또는 재로그인 필요. 또는 세션 갱신 트리거 구현.
2. **LevelBadge 성능:** 레벨 목록 API를 매번 호출하지 않도록 TanStack Query staleTime 충분히 설정 (10분+)
3. **하위 호환:** 기존 LevelBadge props (`level: number`)는 유지하면서 확장해야 함
4. **레벨 0 처리:** activityScore가 0인 신규 유저는 Lv.1로 표시
5. **개발사/관리자도 레벨 표시:** 모든 역할에 레벨 시스템 적용 (역할 뱃지와 레벨 뱃지 동시 표시)
