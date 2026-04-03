# 플레이어 리워드 시스템 - 기능정의서

> **문서 버전:** v2.0
> **작성일:** 2026-04-03
> **상태:** 개발 완료

---

## 1. 개요

GAMEUP 플랫폼의 계정 등급(레벨)과 활동 포인트(Activity Score) 시스템.
회원(개인/기업)은 플랫폼 활동을 통해 포인트를 자동 적립하고, 누적 포인트에 따라 계정 등급이 자동 승급된다.

---

## 2. 시스템 구성

### 2.1 계정 등급 (레벨) 시스템

| 항목 | 설명 |
|------|------|
| 대상 | 개인회원, 기업회원 |
| 등급 정의 | `/admin/levels`에서 관리자가 설정한 레벨 등급 기준을 따름 |
| 등급 표시 | 게시물, 댓글, 프로필, 미니홈에서 사용자 아이디와 함께 레벨 뱃지 표시 |
| 등급 산정 | 누적 포인트(activityScore)가 해당 레벨의 `requiredScore` 이상이면 자동 승급 |
| 등급 관리 | 관리자가 `/admin/levels`에서 레벨명, 아이콘, 필요 점수 재설정 가능 |

### 2.2 포인트 취득 정책

포인트 취득 방식은 `/admin/activity-scores` > "포인트 정책 설정" 탭에서 관리자가 정의하고 편집한다.

---

## 3. 포인트 취득 유형 (14종)

### 3.1 플랫폼 접속 포인트

| 유형 코드 | 이름 | 조건 | 기본 포인트 | 비고 |
|-----------|------|------|------------|------|
| `login` | 일일 접속 | 플랫폼 접속 (1일 1회) | **+1** | 00:00 KST 기준, 일일한도 1 |
| `stay_time` | 체류시간 | 플랫폼 체류시간 | **시간 × 0.1** | 정수 단위 적립, 5분 간격 하트비트 |

### 3.2 콘텐츠 활동 포인트

| 유형 코드 | 이름 | 조건 | 기본 포인트 | 비고 |
|-----------|------|------|------------|------|
| `post_write` | 게시물 작성 | 게시물 작성 시 | **+1** | 작성 즉시 적립 |
| `post_delete` | 게시물 삭제 | 게시물 삭제 시 | **-1** | 본인/관리자 삭제 모두 차감 |
| `comment_write` | 댓글 작성 | 댓글 작성 시 | **+1** | 작성 즉시 적립 |
| `comment_delete` | 댓글 삭제 | 댓글 삭제 시 | **-1** | 본인/관리자 삭제 모두 차감 |
| `recommend_received` | 좋아요 수신 | 게시물/댓글 좋아요 수신 | **+1** | 좋아요 1개당 1포인트 |
| `recommend_cancelled` | 좋아요 취소 | 좋아요 취소 시 | **-1** | 취소 즉시 차감 |

### 3.3 게임 접속 포인트

| 유형 코드 | 이름 | 조건 | 기본 포인트 | 비고 |
|-----------|------|------|------------|------|
| `game_access` | 게임 접속 | 게임 상세 접속 | **+1** | 게임별 1일 1회, 일일한도 10 |
| `game_stay_time` | 게임 체류시간 | 게임 세션 체류 | **시간 × 0.1** | 웹 체류 정책과 동일 |

### 3.4 게임 이벤트 포인트

| 유형 코드 | 이름 | 조건 | 기본 포인트 | 비고 |
|-----------|------|------|------------|------|
| `game_event_reward` | 게임 이벤트 | 개발사 이벤트 달성 | **개발사 설정값** | 이벤트별 1회 청구 |
| `game_payment_reward` | 게임 결제 보상 | 게임 내 최초 유료 결제 | **결제액 × 0.1** | 게임별 최초 결제 1회 |

### 3.5 관리자 수동

| 유형 코드 | 이름 | 조건 | 기본 포인트 | 비고 |
|-----------|------|------|------------|------|
| `admin_grant` | 관리자 부여 | 관리자 수동 부여 | **관리자 설정값** | 정책 활성화 체크 안함 |
| `admin_deduct` | 관리자 차감 | 관리자 수동 차감 | **관리자 설정값** | 정책 활성화 체크 안함 |

---

## 4. 포인트 정책 규칙

### 4.1 적립 규칙

1. **일일 접속 포인트**: 1일 1회만 적립 (00:00 KST 기준)
2. **체류시간 포인트**: 세션 종료 시 총 체류시간 기준 정수 단위 적립 (5분 간격 하트비트)
3. **콘텐츠 포인트**: 작성 즉시 적립, 삭제 시 즉시 차감
4. **좋아요 포인트**: 추가/취소 시 실시간 반영 (자기 자신 게시물/댓글 제외)
5. **게임 접속 포인트**: 게임별 1일 1회 적립 (게임 상세 페이지 접속 시)
6. **정책 비활성화 시**: 해당 유형의 포인트 적립 중단 (관리자 수동 제외)
7. **일일 한도**: 정책별 설정된 `dailyLimit`를 초과하면 추가 적립 불가

### 4.2 차감/중지 규칙

1. **게시물/댓글 삭제**: 본인 삭제 또는 관리자 강제삭제 시 해당 적립 포인트 차감
2. **계정 정지**: 회원 계정이 정지(ban)되면 포인트 누적 생성 중지
3. **계정 비활성화**: 회원 계정이 비활성화되면 포인트 누적 생성 중지
4. **최소 포인트**: 차감으로 인해 포인트가 0 미만이 되지 않음 (최소값 0)

### 4.3 관리자 권한

1. `/admin/levels`에서 레벨 등급(이름, 아이콘, 필요 점수) 재설정 가능
2. `/admin/activity-scores` > "포인트 정책 설정" 탭에서 유형별 점수, 배율, 일일한도, 활성화 편집 가능
3. 개별 회원에게 포인트 수동 부여/차감 가능 (`admin_grant` / `admin_deduct`)
4. 포인트 정책 수정은 **super admin** 권한 필요

---

## 5. 등급 승급 로직

```
1. 포인트 변동 발생 (적립 또는 차감)
2. User.activityScore 갱신 ($inc)
3. activityScore가 0 미만이면 0으로 보정
4. Level 테이블에서 requiredScore 기준으로 현재 등급 재계산
   → requiredScore 내림차순 정렬, activityScore >= requiredScore인 첫 번째 레벨
5. User.level 갱신 (변경 시에만)
6. ActivityScore 이력 레코드 생성
```

- 등급은 **실시간 자동 계산** (포인트 변동 시마다)
- 포인트 차감으로 하위 등급 조건에 해당하면 **등급 하락 가능**
- Level/Policy 테이블은 **인메모리 캐시** (TTL 5분)

---

## 6. UI 표시 규격

### 6.1 레벨 뱃지 (`LevelBadge` 컴포넌트)

```
[아이콘] Lv.{레벨번호}
```

| 레벨 | 아이콘 | 레벨 | 아이콘 |
|------|--------|------|--------|
| Lv.1 | 🌱 | Lv.6 | 🔥 |
| Lv.2 | 🌿 | Lv.7 | 💎 |
| Lv.3 | 🌻 | Lv.8 | 👑 |
| Lv.4 | ⭐ | Lv.9 | 🌈 |
| Lv.5 | 🌟 | Lv.10+ | 🚀 |

**Props:**
- `level`: 레벨 번호 (기본값: 1)
- `size`: `'sm'` | `'md'` (기본값: `'sm'`)

### 6.2 레벨 뱃지 표시 위치

| 위치 | 파일 | 표시 |
|------|------|------|
| 커뮤니티 게시물 상세 | `CommunityPostPage.tsx` | 게시물 작성자명 옆 |
| 커뮤니티 댓글 | `CommunityPostPage.tsx` (CommentBlock) | 댓글 작성자명 옆 |
| 마이페이지 프로필 | `PlayerMyPage.tsx` | 사용자명 옆 + 활동점수 표시 |
| 미니홈 프로필 | `MiniHomeDetailPage.tsx` | 회사명 옆 |

---

## 7. 세션 트래킹 시스템

### 7.1 프론트엔드 (`useSessionTracking` 훅)

```
1. 페이지 로드 시 → POST /api/session/start (type: 'web')
2. 5분 간격 → POST /api/session/heartbeat (sessionId)
3. 페이지 떠날 때 → navigator.sendBeacon /api/session/end (sessionId)
```

- `PageTracker.tsx`에서 `useSessionTracking()` 호출
- 로그인 사용자만 세션 트래킹 (토큰 확인)
- `beforeunload` 이벤트로 세션 종료 보장

### 7.2 백엔드 세션 관리

| 엔드포인트 | 인증 | 설명 |
|-----------|------|------|
| `POST /api/session/start` | 필요 | 세션 시작, 기존 활성 세션 자동 종료 |
| `POST /api/session/heartbeat` | 필요 | 5분 간격 하트비트, duration +5분 |
| `POST /api/session/end` | 불필요 | 세션 종료, 체류시간 포인트 적립 (sendBeacon 호환) |

---

## 8. 게임 이벤트 보상 시스템

### 8.1 이벤트 조건 유형

| conditionType | 설명 | 예시 |
|---------------|------|------|
| `attendance` | 출석 달성 | 7일 연속 출석 → 100포인트 |
| `payment` | 결제 달성 | 최초 유료 결제 → 결제액 × 1/10 |
| `achievement` | 업적 달성 | 특정 업적 완료 → 50포인트 |
| `custom` | 커스텀 조건 | 개발사 자유 설정 |

### 8.2 API 엔드포인트

| 엔드포인트 | 인증 | 권한 | 설명 |
|-----------|------|------|------|
| `GET /api/games/:gameId/events` | 불필요 | 공개 | 게임 이벤트 목록 (`?active=true` 필터) |
| `POST /api/game-events` | 필요 | developer/admin | 이벤트 생성 (본인 게임만) |
| `PUT /api/game-events/:id` | 필요 | developer/admin | 이벤트 수정 |
| `DELETE /api/game-events/:id` | 필요 | developer/admin | 이벤트 삭제 |
| `POST /api/game-events/:eventId/claim` | 필요 | 모든 사용자 | 이벤트 보상 청구 (1회) |

### 8.3 보상 청구 흐름

```
1. 플레이어가 이벤트 보상 청구 요청
2. 이벤트 활성 상태 + 기간 확인
3. 중복 청구 확인 (GameEventClaim 조회)
4. PointService.grantPoints() 로 포인트 지급
5. GameEventClaim 기록 생성
6. 응답: { success, pointsAwarded }
```

---

## 9. 관리자 포인트 정책 관리

### 9.1 API 엔드포인트

| 엔드포인트 | 권한 | 설명 |
|-----------|------|------|
| `GET /api/admin/activity-scores/` | admin | 활동점수 이력 조회 (검색, 날짜 필터, 정렬, 페이지네이션) |
| `GET /api/admin/activity-scores/policies` | admin | 포인트 정책 목록 조회 |
| `PUT /api/admin/activity-scores/policies/:id` | super admin | 포인트 정책 수정 |
| `POST /api/admin/activity-scores/policies/seed` | super admin | 기본 포인트 정책 12종 초기화 |

### 9.2 관리자 UI (`/admin/activity-scores`)

**탭 구성:**

| 탭 | 기능 |
|----|------|
| **활동점수 내역** | 전체 활동점수 이력 조회 (닉네임/이메일 검색, 날짜 필터, 정렬) |
| **포인트 정책 설정** | 유형별 포인트, 배율, 일일한도 편집 + 활성화/비활성화 토글 |

### 9.3 기본 정책 시드 데이터 (12종)

| 유형 | 이름 | 포인트 | 배율 | 일일한도 |
|------|------|--------|------|---------|
| login | 일일 접속 | 1 | - | 1 |
| stay_time | 체류시간 | 1 | 0.1 | - |
| post_write | 게시물 작성 | 1 | - | - |
| post_delete | 게시물 삭제 | 1 | - | - |
| comment_write | 댓글 작성 | 1 | - | - |
| comment_delete | 댓글 삭제 | 1 | - | - |
| recommend_received | 좋아요 수신 | 1 | - | - |
| recommend_cancelled | 좋아요 취소 | 1 | - | - |
| game_access | 게임 접속 | 1 | - | 10 |
| game_stay_time | 게임 체류시간 | 1 | 0.1 | - |
| game_event_reward | 게임 이벤트 | 0 | - | - |
| game_payment_reward | 게임 결제 보상 | 0 | 0.1 | - |

---

## 10. 데이터 모델

### 10.1 ActivityScore (활동점수 이력)

```typescript
interface IActivityScore {
  userId: ObjectId          // 사용자 ID
  amount: number            // 적립/차감 금액 (+/-)
  reason: string            // 사유
  type: ActivityScoreType   // 14종 유형
  relatedId?: ObjectId      // 관련 콘텐츠 ID (게시물, 댓글, 게임 등)
  createdAt: Date
}
// Index: { userId: 1, createdAt: -1 }
```

### 10.2 PointPolicy (포인트 정책)

```typescript
interface IPointPolicy {
  type: string              // ActivityScoreType (unique)
  label: string             // 표시명
  description: string       // 설명
  amount: number            // 기본 적립 포인트
  multiplier?: number       // 배율 (체류시간 등)
  dailyLimit?: number       // 일일 적립 한도 (null = 무제한)
  isActive: boolean         // 활성화 여부
  createdAt: Date
  updatedAt: Date
}
```

### 10.3 UserSession (세션 추적)

```typescript
interface IUserSession {
  userId: ObjectId
  sessionStart: Date
  sessionEnd?: Date
  duration: number          // 분 단위
  pointsEarned: number      // 해당 세션 적립 포인트
  type: 'web' | 'game'
  gameId?: ObjectId         // 게임 접속 시
  lastHeartbeat: Date       // 마지막 하트비트
  isActive: boolean
  createdAt: Date
}
// Index: { userId: 1, isActive: 1 }, { userId: 1, type: 1, createdAt: -1 }
```

### 10.4 GameEvent (게임 이벤트)

```typescript
interface IGameEvent {
  gameId: ObjectId
  developerId: ObjectId
  title: string
  description: string
  conditionType: 'attendance' | 'payment' | 'achievement' | 'custom'
  conditionValue: number
  rewardPoints: number
  startDate: Date
  endDate: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
// Index: { gameId: 1, isActive: 1 }, { startDate: 1, endDate: 1 }
```

### 10.5 GameEventClaim (이벤트 보상 청구)

```typescript
interface IGameEventClaim {
  eventId: ObjectId
  userId: ObjectId
  claimedAt: Date
  pointsAwarded: number
}
// Unique Index: { eventId: 1, userId: 1 }
```

### 10.6 User (기존 모델 사용 필드)

```typescript
// User 모델의 포인트/레벨 관련 필드
{
  level: number            // 현재 레벨 (기본값: 1)
  activityScore: number    // 누적 활동점수 (기본값: 0)
  points: number           // 별도 포인트 (기존)
  isActive: boolean        // 계정 활성화 상태
  bannedUntil?: Date       // 정지 만료일
}
```

---

## 11. 아키텍처 구성

### 11.1 파일 구조

```
packages/db/src/models/
├── ActivityScore.ts          # 활동점수 이력 (타입 14종)
├── PointPolicy.ts            # 포인트 정책 설정 [신규]
├── UserSession.ts            # 세션 추적 [신규]
├── GameEvent.ts              # 게임 이벤트 + 청구 [신규]
├── Level.ts                  # 레벨 등급 (기존)
└── User.ts                   # 사용자 (level, activityScore 필드)

apps/api/src/
├── services/
│   └── pointService.ts       # 핵심 포인트 로직 [신규]
├── controllers/
│   ├── communityController.ts  # 게시물/댓글 포인트 연동 [수정]
│   ├── gameController.ts       # 게임 접속 포인트 [수정]
│   ├── sessionController.ts    # 세션 관리 [신규]
│   ├── gameEventController.ts  # 게임 이벤트 [신규]
│   └── adminActivityScoreController.ts  # 정책 관리 [수정]
├── routes/
│   ├── sessionRoutes.ts        # 세션 API [신규]
│   ├── gameEventRoutes.ts      # 게임 이벤트 API [신규]
│   └── adminActivityScoreRoutes.ts  # 정책 관리 라우트 [수정]
└── middleware/
    └── auth.ts                 # 일일 접속 포인트 [수정]

apps/web/src/
├── components/
│   ├── LevelBadge.tsx          # 레벨 뱃지 컴포넌트 [신규]
│   ├── PageTracker.tsx         # 세션 트래킹 연동 [수정]
│   └── pages/
│       ├── AdminActivityScorePage.tsx  # 정책 관리 탭 [수정]
│       ├── CommunityPostPage.tsx      # 레벨 뱃지 적용 [수정]
│       ├── PlayerMyPage.tsx           # 레벨/점수 표시 [수정]
│       └── MiniHomeDetailPage.tsx     # 레벨 뱃지 적용 [수정]
├── lib/
│   └── useSessionTracking.ts   # 세션 트래킹 훅 [신규]
└── services/
    ├── adminService.ts         # 정책 API 함수 추가 [수정]
    ├── communityService.ts     # author 타입에 level 추가 [수정]
    └── minihomeService.ts      # userId 타입에 level 추가 [수정]

scripts/
└── seed-point-policies.ts      # 기본 정책 시드 스크립트 [신규]
```

### 11.2 PointService 핵심 함수

| 함수 | 역할 | 반환값 |
|------|------|--------|
| `grantPoints(userId, type, reason, relatedId?, overrideAmount?)` | 포인트 적립 + 레벨 갱신 | `{ success, amount, newScore, newLevel }` |
| `deductPoints(userId, type, reason, relatedId?, overrideAmount?)` | 포인트 차감 + 레벨 갱신 | `{ success, amount, newScore, newLevel }` |
| `grantLoginPoint(userId)` | 일일 접속 포인트 (중복 체크) | `boolean` |
| `grantGameAccessPoint(userId, gameId)` | 게임 접속 포인트 (게임별 일일 1회) | `boolean` |
| `grantStayTimePoints(userId, minutes, type?, gameId?)` | 체류시간 포인트 | `number` (적립된 포인트) |
| `startSession(userId, type?, gameId?)` | 세션 시작 | `string` (sessionId) |
| `heartbeatSession(sessionId)` | 세션 하트비트 (5분) | `boolean` |
| `endSession(sessionId)` | 세션 종료 + 포인트 적립 | `number` (적립된 포인트) |
| `recalculateAllLevels()` | 전체 사용자 레벨 재계산 | `number` (갱신 수) |
| `invalidatePolicyCache()` | 정책 캐시 무효화 | - |
| `invalidateLevelCache()` | 레벨 캐시 무효화 | - |

### 11.3 포인트 적립 흐름도

```
[사용자 활동 발생]
       ↓
[Controller에서 PointService 호출] ── 비동기 (.catch(() => {}))
       ↓
[isUserEligible 체크] ── 정지/비활성 → null 반환
       ↓
[getPolicy 조회] ── 캐시 (TTL 5분)
       ↓
[isActive 체크] ── 비활성 → null 반환
       ↓
[dailyLimit 체크] ── 초과 → null 반환
       ↓
[ActivityScore 이력 생성]
       ↓
[User.activityScore $inc 갱신]
       ↓
[최소값 0 보정]
       ↓
[calculateLevel 재계산] ── Level 캐시 (TTL 5분)
       ↓
[User.level 갱신] ── 변경 시에만
       ↓
[결과 반환: { success, amount, newScore, newLevel }]
```

---

## 12. 성능 고려사항

| 항목 | 구현 |
|------|------|
| Level 캐시 | 인메모리 캐시, TTL 5분, `invalidateLevelCache()`로 수동 무효화 |
| PointPolicy 캐시 | 인메모리 캐시, TTL 5분, `invalidatePolicyCache()`로 수동 무효화 |
| 하트비트 간격 | 5분 (과도한 API 호출 방지) |
| 비동기 포인트 적립 | 컨트롤러에서 `.catch(() => {})` 패턴으로 응답 차단 없이 적립 |
| 일일 한도 체크 | MongoDB aggregation으로 당일 적립합 조회 |
| 중복 방지 | `login`: userId + type + date 조회, `game_access`: + relatedId, `GameEventClaim`: unique index |
| 세션 종료 | `navigator.sendBeacon()` 으로 페이지 이탈 시에도 확실한 전송 |

---

## 13. 향후 확장 계획

1. **등급별 서비스 권한 차등**: 계정 등급에 따라 접근 가능한 서비스와 기능 차별화
2. **등급별 리워드 정책**: 높은 등급에 추가 혜택 (할인, 우선 접근 등)
3. **포인트 사용처**: 포인트를 사용한 아이템 구매, 게임 내 혜택 등
4. **등급 변경 알림**: 승급/하락 시 사용자 알림 발송
5. **게임 이벤트 관리 UI**: 개발사 콘솔에서 이벤트 생성/관리 페이지
6. **이벤트 조건 자동 검증**: 출석, 결제 등 조건 자동 달성 확인 로직

---

## 14. 초기 설정 방법

### 14.1 포인트 정책 초기화

**방법 1: 관리자 UI**
1. `/admin/activity-scores` 접속
2. "포인트 정책 설정" 탭 클릭
3. "기본값 초기화" 버튼 클릭

**방법 2: API 호출**
```bash
curl -X POST /api/admin/activity-scores/policies/seed \
  -H "Authorization: Bearer {super-admin-token}"
```

**방법 3: 스크립트**
```bash
cd scripts && npx tsx seed-point-policies.ts
```

### 14.2 레벨 설정

`/admin/levels`에서 레벨별 `requiredScore` 설정 (기존 기능)
