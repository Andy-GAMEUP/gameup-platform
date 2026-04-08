# 게임 개발사 활동포인트 지급 시스템 — 기획설계 및 개발계획

> **Version:** 2.0
> **Date:** 2026-04-06
> **Status:** 기획 완료 → 개발 대기

---

## 1. 현행 시스템 리뷰

### 1.1 현재 구현 상태

| 항목 | 현재 상태 | 평가 |
|------|----------|------|
| **포인트 타입 (6종)** | game_account_create, game_daily_login, game_play_time, game_purchase, game_event_participate, game_ranking | ✅ 구현 완료 |
| **GamePointPolicy 모델** | gameId, type, amount, multiplier, dailyLimit, approvalStatus | ⚠️ 부분적 |
| **GamePointLog 모델** | gameId, userId, type, amount, metadata, apiKeyUsed | ✅ 구현 완료 |
| **외부 API (grant/batch-grant)** | 공개 접근, x-api-key 로깅용 | ⚠️ 보안 미흡 |
| **개발사 콘솔 UI** | 포인트 보상 탭 (정책 CRUD + API 가이드) | ⚠️ 부분적 |
| **관리자 승인 흐름** | approve/reject/toggle | ⚠️ 부분적 |
| **포인트 캐시** | 인메모리 Map, TTL 3분 | ✅ 동작 |
| **중복 방지** | account_create 1회, daily_login 일 1회 | ✅ 동작 |
| **일일 한도** | dailyLimit 체크 + 잔여 한도 조정 | ✅ 동작 |

### 1.2 현행 문제점 및 미비사항

#### 🔴 Critical (반드시 해결)

| # | 문제 | 설명 |
|---|------|------|
| C1 | **API 인증 부재** | `/api/game-points/grant`가 공개 접근 — 누구나 포인트 지급 가능 |
| C2 | **포인트 예산 시스템 없음** | 개발사가 무제한 포인트 발급 가능, 플랫폼 수익화 불가 |
| C3 | **신청서 양식 부재** | 지급기간/지급방식 등 구조화된 승인 요청 프로세스 없음 |

#### 🟡 Major (개선 필요)

| # | 문제 | 설명 |
|---|------|------|
| M1 | **지급 기간 없음** | 정책에 startDate/endDate 필드 없어 기간 제한 불가 |
| M2 | **레벨 도달 타입 없음** | 요구사항의 "도달 레벨" 포인트 타입 미구현 |
| M3 | **개발사 활성/비활성 독립 제어 없음** | 현재 활성화/비활성화가 관리자 승인에 종속적 |
| M4 | **API Key 발급/관리 기능 없음** | 게임 서버 인증을 위한 API Key 관리 시스템 미구현 |
| M5 | **포인트 구매 이력 없음** | 유료화 시 개발사의 포인트 구매/잔액 추적 불가 |

#### 🟢 Minor (개선 권장)

| # | 문제 | 설명 |
|---|------|------|
| m1 | 개발사 콘솔 통계가 빈약 | 일별/주별 트렌드, 유저별 분석 없음 |
| m2 | 관리자 대시보드 미통합 | 게임 포인트 관련 통계가 메인 대시보드에 미반영 |
| m3 | 알림 시스템 미연동 | 승인/거절 시 개발사에게 알림 미전달 |

---

## 2. 기획 설계 (v2.0)

### 2.1 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────────────┐
│                        GAMEUP Platform                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐    ┌───────────────┐     │
│  │ 개발사 콘솔   │────▶│ 포인트 신청서 │───▶│ 관리자 승인    │     │
│  │ (게임세부정보) │     │ (양식 기반)   │    │ (검토/승인)    │     │
│  └──────────────┘     └──────────────┘    └───────┬───────┘     │
│         │                                          │             │
│         ▼                                          ▼             │
│  ┌──────────────┐                          ┌──────────────┐     │
│  │ 활성화/비활성화│                          │ API Key 발급  │     │
│  │ (개발사 제어) │                          │ (게임별 고유)  │     │
│  └──────┬───────┘                          └──────┬───────┘     │
│         │                                          │             │
│         ▼                                          ▼             │
│  ┌──────────────────────────────────────────────────┐           │
│  │            게임 포인트 지급 API Layer              │           │
│  │  ┌────────────────────────────────────────────┐  │           │
│  │  │ API Key 인증 → 예산 잔액 검증 → 정책 검증   │  │           │
│  │  │ → 중복/한도 체크 → 포인트 지급 → 잔액 차감   │  │           │
│  │  └────────────────────────────────────────────┘  │           │
│  └──────────────────────────────────────────────────┘           │
│         │                         │                              │
│         ▼                         ▼                              │
│  ┌──────────────┐          ┌──────────────┐                     │
│  │ GamePointLog │          │ ActivityScore │                     │
│  │ (게임별 이력) │          │ (플랫폼 통합) │                     │
│  └──────────────┘          └──────────────┘                     │
│                                   │                              │
│                                   ▼                              │
│                            ┌──────────────┐                     │
│                            │ 레벨 재계산   │                     │
│                            │ (자동)        │                     │
│                            └──────────────┘                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │          포인트 예산 시스템 (유료화)               │           │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │           │
│  │  │ 포인트 상품  │  │ 구매/충전    │  │ 잔액 관리│ │           │
│  │  │ (패키지)    │  │ (결제 연동)  │  │ (차감)   │ │           │
│  │  └─────────────┘  └─────────────┘  └──────────┘ │           │
│  └──────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 포인트 타입 정의 (7종 — 신규 1종 추가)

| # | 타입 | 라벨 | 트리거 | 계산 방식 | 중복 정책 |
|---|------|------|--------|----------|----------|
| 1 | `game_account_create` | 게임 계정 생성 | 게임 최초 가입 | 고정 amount | 게임당 유저 1회 |
| 2 | `game_daily_login` | 게임 일일 접속 | 게임 로그인 | 고정 amount | 게임당 일 1회 |
| 3 | `game_play_time` | 게임 플레이 시간 | 세션 종료/주기 보고 | minutes × multiplier | 일일 한도 적용 |
| 4 | `game_purchase` | 게임 결제 보상 | 인앱 결제 완료 | amount × multiplier | 일일 한도 적용 |
| 5 | `game_event_participate` | 게임 이벤트 참여 | 이벤트 완료 | 고정 amount | 이벤트별 1회 |
| 6 | `game_level_achieve` | 게임 레벨 도달 | 지정 레벨 달성 | 고정 amount | 레벨별 1회 |
| 7 | `game_ranking` | 게임 랭킹 보상 | 시즌/대회 종료 | amount × rankMultiplier | 시즌당 1회 |

### 2.3 신청서 양식 설계

개발사가 관리자에게 포인트 정책 승인을 요청할 때 제출하는 구조화된 신청서:

```
┌─────────────────────────────────────────────────┐
│           포인트 지급 신청서                       │
├─────────────────────────────────────────────────┤
│ 게임명:        [자동 입력]                        │
│ 서비스 타입:    [베타 / 라이브]                    │
│ 개발사명:      [자동 입력]                        │
│ 신청일:        [자동 입력]                        │
├─────────────────────────────────────────────────┤
│ ── 포인트 정책 내역 ──                            │
│                                                  │
│ [✓] 게임 계정 생성          5P    기간: 상시      │
│ [✓] 게임 일일 접속          1P    기간: 상시      │
│ [✓] 게임 플레이 시간        ×0.1  한도: 100P/일   │
│     기간: 2026-04-10 ~ 2026-07-10               │
│ [ ] 게임 결제 보상          -                     │
│ [✓] 게임 이벤트 참여        3P    기간: 상시      │
│ [ ] 게임 레벨 도달          -                     │
│ [✓] 게임 랭킹 보상          10P   기간: 시즌별    │
├─────────────────────────────────────────────────┤
│ 예상 총 소요 포인트:     50,000P                  │
│ 현재 보유 포인트 잔액:   100,000P                 │
│ 신청 후 잔여 예상:       50,000P                  │
├─────────────────────────────────────────────────┤
│ 추가 요청사항:                                    │
│ [                                    ]           │
├─────────────────────────────────────────────────┤
│           [ 신청서 제출 ]                         │
└─────────────────────────────────────────────────┘
```

### 2.4 승인 워크플로우

```
                    ┌─────────┐
                    │  draft  │  개발사: 정책 설정
                    └────┬────┘
                         │ [신청서 제출]
                         ▼
                    ┌─────────┐
                    │ pending │  관리자 검토 대기
                    └────┬────┘
                    ╱          ╲
           [승인] ╱              ╲ [거절]
                ╱                  ╲
          ┌─────────┐         ┌──────────┐
          │approved │         │ rejected │  사유 전달
          └────┬────┘         └────┬─────┘
               │                   │
               ▼                   │ [재신청]
    ┌────────────────────┐         │
    │ 개발사: 활성/비활성  │         ▼
    │ 독립 토글 제어       │    ┌─────────┐
    └────────────────────┘    │  draft  │
               │               └─────────┘
               ▼
    ┌──────────────────┐
    │  포인트 지급 가능  │  API 호출 시 잔액 차감
    └──────────────────┘
```

**핵심 변경사항:**
- 승인된 정책은 **개발사가 독립적으로** 활성/비활성 제어 가능
- 관리자는 **강제 비활성화** 권한 보유 (긴급 차단)
- 포인트 지급 시 **잔액이 부족하면 자동 비활성화**

### 2.5 포인트 예산 시스템 (유료화)

#### 2.5.1 개념

플랫폼이 개발사에게 "활동포인트 패키지"를 판매하고, 개발사는 구매한 포인트 잔액 내에서 플레이어에게 포인트를 지급합니다.

#### 2.5.2 상품 구조

| 상품명 | 포인트량 | 가격 (KRW) | 단가 (원/P) | 비고 |
|--------|---------|-----------|------------|------|
| 스타터 | 10,000P | 100,000 | 10 | 소규모 베타 |
| 베이직 | 50,000P | 400,000 | 8 | 중규모 |
| 프로 | 200,000P | 1,200,000 | 6 | 라이브 게임 |
| 엔터프라이즈 | 1,000,000P | 5,000,000 | 5 | 대규모 |
| 커스텀 | 협의 | 협의 | 협의 | 관리자 직접 설정 |

#### 2.5.3 잔액 관리 모델

```typescript
// DeveloperPointBalance — 개발사별 포인트 잔액
{
  developerId: ObjectId       // 개발사
  totalPurchased: number      // 총 구매 포인트
  totalUsed: number           // 총 사용 포인트
  balance: number             // 잔액 (= purchased - used)
  lastPurchasedAt: Date       // 최근 구매일
}

// DeveloperPointTransaction — 구매/사용 내역
{
  developerId: ObjectId
  type: 'purchase' | 'consume' | 'refund' | 'admin_grant' | 'admin_deduct'
  amount: number              // 양수: 충전, 음수: 사용
  balance: number             // 트랜잭션 후 잔액
  description: string
  relatedGameId?: ObjectId    // consume 시 게임
  relatedUserId?: ObjectId    // consume 시 플레이어
  paymentId?: string          // purchase 시 결제 ID
  createdAt: Date
}
```

#### 2.5.4 포인트 지급 시 잔액 차감 플로우

```
게임 서버 → POST /api/game-points/grant
    │
    ├─ 1. API Key 인증
    ├─ 2. 게임/유저/정책 검증 (기존)
    ├─ 3. ★ 개발사 잔액 확인
    │      └─ balance < amount → 400 "포인트 잔액이 부족합니다"
    ├─ 4. 중복/한도 체크 (기존)
    ├─ 5. GamePointLog 기록 (기존)
    ├─ 6. ★ DeveloperPointBalance.balance -= amount
    ├─ 7. ★ DeveloperPointTransaction 기록 (type: 'consume')
    ├─ 8. ActivityScore + 레벨 갱신 (기존)
    └─ 9. 잔액 부족 시 알림 발송
```

### 2.6 API Key 인증 시스템

#### 2.6.1 구조

```typescript
// GameApiKey — 게임별 API Key
{
  gameId: ObjectId
  developerId: ObjectId
  key: string              // SHA-256 해시 저장
  prefix: string           // 'gup_' + 처음 8자 (식별용)
  name: string             // "Production", "Test" 등
  isActive: boolean
  lastUsedAt?: Date
  expiresAt?: Date         // null = 만료 없음
  permissions: string[]    // ['grant', 'batch-grant', 'stats']
  ipWhitelist?: string[]   // 허용 IP (선택)
  createdAt: Date
}
```

#### 2.6.2 인증 플로우

```
요청: POST /api/game-points/grant
헤더: x-api-key: gup_a1b2c3d4_xxxxxxxxxxxxxxxxxxxx

→ prefix(gup_a1b2c3d4)로 GameApiKey 조회
→ full key SHA-256 해시 비교
→ isActive, expiresAt, ipWhitelist 검증
→ gameId 추출 → 요청 body.gameId와 일치 확인
→ 인증 통과 → 컨트롤러 실행
```

### 2.7 개발사 콘솔 UI 설계

#### 2.7.1 게임세부정보 > 포인트 보상 탭 개편

```
┌─────────────────────────────────────────────────────────┐
│ 📊 포인트 현황                                           │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │ 잔여 포인트│ │총 지급   │ │금일 지급 │ │활성 정책 │       │
│ │ 85,200P  │ │ 14,800P │ │ 320P   │ │ 5 / 7  │       │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                         │
│ [포인트 충전] [API Key 관리] [신청서 제출]                 │
├─────────────────────────────────────────────────────────┤
│ ── 포인트 정책 설정 ──                                    │
│                                                         │
│ ┌───────────────────────────────────────────────────┐   │
│ │ 🎮 게임 계정 생성                    [승인됨] [활성]│   │
│ │ 5P | 상시 | 게임당 유저 1회                        │   │
│ │ ───────────────────────────────── [편집] [비활성] │   │
│ ├───────────────────────────────────────────────────┤   │
│ │ 📅 게임 일일 접속                    [승인됨] [활성]│   │
│ │ 1P | 상시 | 일 1회                                │   │
│ │ ───────────────────────────────── [편집] [비활성] │   │
│ ├───────────────────────────────────────────────────┤   │
│ │ ⏱ 게임 플레이 시간                   [초안]       │   │
│ │ ×0.1 | 한도 100P/일                               │   │
│ │ 기간: 2026-04-10 ~ 2026-07-10                    │   │
│ │ ──────────────────────────── [편집] [삭제]        │   │
│ ├───────────────────────────────────────────────────┤   │
│ │ 🏆 게임 레벨 도달                    [미설정]      │   │
│ │ ──────────────────────────────────── [설정]       │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ ── API 연동 가이드 ──                                    │
│ API Key: gup_a1b2c3d4_•••••••••• [복사] [재발급]         │
│ Endpoint: POST /api/game-points/grant                   │
│ [API 문서 보기]                                          │
├─────────────────────────────────────────────────────────┤
│ ── 지급 이력 ──                                          │
│ 날짜       | 유저      | 타입     | 포인트 | 잔액        │
│ 04.06 14:22| player1  | 일일접속 | +1P    | 85,199P    │
│ 04.06 14:20| player2  | 플레이   | +12P   | 85,200P    │
│ ... [더보기]                                             │
└─────────────────────────────────────────────────────────┘
```

### 2.8 관리자 콘솔 설계

#### 2.8.1 신청서 검토 화면

```
┌─────────────────────────────────────────────────────────┐
│ 🎁 게임 포인트 신청서 검토                                │
│                                                         │
│ ── 신청 정보 ──                                          │
│ 게임: Cyber Nexus (라이브)                               │
│ 개발사: GameStudio Inc.                                  │
│ 신청일: 2026-04-06                                      │
│ 개발사 보유 잔액: 100,000P                               │
│                                                         │
│ ── 신청 정책 (5건) ──                                    │
│ ┌─────────────────────────────────────────────────┐     │
│ │ 타입            │ 금액   │ 한도    │ 기간        │     │
│ ├─────────────────┼────────┼────────┼────────────┤     │
│ │ 게임 계정 생성   │ 5P    │ -      │ 상시        │     │
│ │ 게임 일일 접속   │ 1P    │ 1P/일  │ 상시        │     │
│ │ 게임 플레이 시간 │ ×0.1  │ 100P/일│ 4/10~7/10  │     │
│ │ 게임 이벤트 참여 │ 3P    │ -      │ 상시        │     │
│ │ 게임 랭킹 보상   │ 10P   │ -      │ 시즌별      │     │
│ └─────────────────────────────────────────────────┘     │
│                                                         │
│ 예상 일일 소요: ~500P                                    │
│ 예상 월간 소요: ~15,000P                                 │
│                                                         │
│ 관리자 메모:                                             │
│ [                                             ]          │
│                                                         │
│ [일괄 승인]  [일괄 거절]  [개별 검토 →]                    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 모델 변경사항

### 3.1 신규 모델

#### DeveloperPointBalance (개발사 포인트 잔액)
```
{
  developerId: ObjectId (ref: User, unique)
  totalPurchased: Number (default: 0)
  totalUsed: Number (default: 0)
  balance: Number (default: 0)
  lastPurchasedAt: Date
  lowBalanceNotifiedAt: Date    // 잔액 부족 알림 발송일
}
```

#### DeveloperPointTransaction (포인트 거래 내역)
```
{
  developerId: ObjectId (ref: User)
  type: 'purchase' | 'consume' | 'refund' | 'admin_grant' | 'admin_deduct'
  amount: Number                // +충전 / -사용
  balance: Number               // 거래 후 잔액
  description: String
  relatedGameId?: ObjectId
  relatedUserId?: ObjectId
  pointPolicyType?: String      // consume 시 정책 타입
  paymentId?: String
  createdAt: Date
}
indexes: { developerId, createdAt }
```

#### GameApiKey (게임 API Key)
```
{
  gameId: ObjectId (ref: Game)
  developerId: ObjectId (ref: User)
  keyHash: String               // SHA-256 해시
  prefix: String                // 'gup_' + 8자
  name: String                  // "Production", "Test"
  isActive: Boolean (default: true)
  lastUsedAt?: Date
  expiresAt?: Date
  createdAt: Date
}
indexes: { prefix, unique }, { gameId }
```

#### PointPackage (포인트 상품)
```
{
  name: String
  points: Number
  price: Number                 // KRW
  unitPrice: Number             // 원/P
  description: String
  isActive: Boolean (default: true)
  sortOrder: Number
}
```

### 3.2 기존 모델 수정

#### GamePointPolicy — 필드 추가

```diff
 {
   gameId, developerId, type, label, description,
   amount, multiplier, dailyLimit,
   isActive, approvalStatus,
+  startDate: Date              // 지급 시작일 (null = 상시)
+  endDate: Date                // 지급 종료일 (null = 상시)
+  estimatedDailyUsage: Number  // 예상 일일 소요 (신청서용)
+  developerNote: String        // 개발사 추가 요청사항
+  conditionConfig: Mixed       // 레벨 도달 등 조건 설정
   adminNote, approvedAt, approvedBy,
   rejectedAt, rejectedBy, rejectionReason,
 }
```

#### ActivityScore — 타입 추가

```diff
 ActivityScoreType += 'game_level_achieve'
```

### 3.3 GamePointType 확장

```typescript
export type GamePointType =
  | 'game_account_create'
  | 'game_daily_login'
  | 'game_play_time'
  | 'game_purchase'
  | 'game_event_participate'
+ | 'game_level_achieve'        // 신규
  | 'game_ranking'
```

---

## 4. API 엔드포인트 설계

### 4.1 신규 API

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| **API Key 관리** | | | |
| POST | `/api/games/:gameId/api-keys` | JWT (developer) | API Key 생성 |
| GET | `/api/games/:gameId/api-keys` | JWT (developer) | API Key 목록 |
| DELETE | `/api/games/:gameId/api-keys/:keyId` | JWT (developer) | API Key 삭제 |
| PUT | `/api/games/:gameId/api-keys/:keyId/regenerate` | JWT (developer) | API Key 재발급 |
| **포인트 예산** | | | |
| GET | `/api/developer/point-balance` | JWT (developer) | 내 잔액 조회 |
| GET | `/api/developer/point-transactions` | JWT (developer) | 거래 내역 |
| POST | `/api/developer/point-purchase` | JWT (developer) | 포인트 구매 |
| GET | `/api/point-packages` | public | 상품 목록 |
| **관리자** | | | |
| GET | `/api/admin/developer-balances` | JWT (admin) | 전체 개발사 잔액 |
| POST | `/api/admin/developer-balances/:id/adjust` | JWT (admin) | 잔액 수동 조정 |
| GET | `/api/admin/point-packages` | JWT (admin) | 상품 관리 |
| POST | `/api/admin/point-packages` | JWT (admin) | 상품 생성 |
| PUT | `/api/admin/point-packages/:id` | JWT (admin) | 상품 수정 |

### 4.2 수정 API

| Method | Path | 변경 내용 |
|--------|------|----------|
| POST | `/api/game-points/grant` | API Key 인증 추가, 잔액 차감 로직 추가 |
| POST | `/api/game-points/batch-grant` | 동일 |
| POST | `/api/games/:gameId/point-policies` | startDate/endDate/conditionConfig 필드 추가 |
| POST | `/api/games/:gameId/point-policies/submit` | 신청서 양식 검증 + 예상 소요 계산 |
| PUT | `/api/games/:gameId/point-policies/:type/toggle` | 개발사 독립 활성/비활성 (신규) |

---

## 5. 개발 계획

### Phase 1: 기반 모델 및 데이터 확장 (Day 1)

| # | 작업 | 파일 | 예상 |
|---|------|------|------|
| 1.1 | GamePointType에 `game_level_achieve` 추가 | `GamePointPolicy.ts`, `ActivityScore.ts`, `GamePointLog.ts` | 15분 |
| 1.2 | GamePointPolicy 스키마에 필드 추가 (startDate, endDate, estimatedDailyUsage, developerNote, conditionConfig) | `GamePointPolicy.ts` | 20분 |
| 1.3 | DeveloperPointBalance 모델 생성 | `DeveloperPointBalance.ts` (신규) | 20분 |
| 1.4 | DeveloperPointTransaction 모델 생성 | `DeveloperPointTransaction.ts` (신규) | 20분 |
| 1.5 | GameApiKey 모델 생성 | `GameApiKey.ts` (신규) | 20분 |
| 1.6 | PointPackage 모델 생성 | `PointPackage.ts` (신규) | 15분 |
| 1.7 | db/index.ts에 export 등록 | `packages/db/src/index.ts` | 5분 |

### Phase 2: API Key 인증 시스템 (Day 1-2)

| # | 작업 | 파일 | 예상 |
|---|------|------|------|
| 2.1 | API Key 생성/해시 유틸리티 | `services/apiKeyService.ts` (신규) | 30분 |
| 2.2 | API Key 인증 미들웨어 | `middleware/apiKeyAuth.ts` (신규) | 30분 |
| 2.3 | API Key CRUD 컨트롤러 | `controllers/apiKeyController.ts` (신규) | 30분 |
| 2.4 | API Key 라우트 | `routes/apiKeyRoutes.ts` (신규) | 10분 |
| 2.5 | 외부 API에 인증 미들웨어 적용 | `routes/gamePointRoutes.ts` 수정 | 15분 |

### Phase 3: 포인트 예산 시스템 (Day 2)

| # | 작업 | 파일 | 예상 |
|---|------|------|------|
| 3.1 | 개발사 잔액 서비스 | `services/developerBalanceService.ts` (신규) | 40분 |
| 3.2 | gamePointService에 잔액 차감 연동 | `services/gamePointService.ts` 수정 | 30분 |
| 3.3 | 개발사 잔액/거래 컨트롤러 | `controllers/developerBalanceController.ts` (신규) | 30분 |
| 3.4 | 포인트 상품 컨트롤러 (관리자) | `controllers/pointPackageController.ts` (신규) | 20분 |
| 3.5 | 라우트 등록 | 다수 수정 | 15분 |

### Phase 4: 정책 확장 + 신청서 로직 (Day 2-3)

| # | 작업 | 파일 | 예상 |
|---|------|------|------|
| 4.1 | game_level_achieve 타입 지급 로직 | `services/gamePointService.ts` 수정 | 20분 |
| 4.2 | 정책 기간 검증 로직 (startDate/endDate) | `services/gamePointService.ts` 수정 | 20분 |
| 4.3 | 신청서 양식 검증 + 예상 소요 계산 | `controllers/gamePointController.ts` 수정 | 30분 |
| 4.4 | 개발사 독립 활성/비활성 토글 API | `controllers/gamePointController.ts` 추가 | 20분 |
| 4.5 | 관리자 일괄 승인/거절 | `controllers/gamePointController.ts` 수정 | 20분 |

### Phase 5: 개발사 콘솔 UI (Day 3-4)

| # | 작업 | 파일 | 예상 |
|---|------|------|------|
| 5.1 | 포인트 보상 탭 UI 개편 (잔액 표시, 기간 설정, 활성/비활성 독립 토글) | `GameDetailManagementPage.tsx` 수정 | 60분 |
| 5.2 | API Key 관리 모달 | `GameDetailManagementPage.tsx` 추가 | 40분 |
| 5.3 | 신청서 제출 모달 (양식 기반) | `GameDetailManagementPage.tsx` 추가 | 40분 |
| 5.4 | 포인트 충전/구매 모달 | 신규 컴포넌트 | 40분 |
| 5.5 | 지급 이력 리스트 | `GameDetailManagementPage.tsx` 추가 | 30분 |
| 5.6 | gameService.ts API 함수 추가 | `gameService.ts` 수정 | 15분 |

### Phase 6: 관리자 콘솔 UI (Day 4)

| # | 작업 | 파일 | 예상 |
|---|------|------|------|
| 6.1 | 신청서 검토 화면 개편 (신청서 양식 보기, 잔액 표시) | `AdminGamePointPoliciesPage.tsx` 수정 | 40분 |
| 6.2 | 개발사 포인트 잔액 관리 페이지 | 신규 컴포넌트 | 40분 |
| 6.3 | 포인트 상품 관리 페이지 | 신규 컴포넌트 | 30분 |
| 6.4 | AdminLayout 메뉴 추가 | `AdminLayout.tsx` 수정 | 10분 |
| 6.5 | adminService.ts API 함수 추가 | `adminService.ts` 수정 | 15분 |

### Phase 7: 통합 테스트 및 문서 (Day 5)

| # | 작업 | 파일 | 예상 |
|---|------|------|------|
| 7.1 | API 문서 업데이트 (v2) | `docs/api/game-point-integration-api.md` 수정 | 30분 |
| 7.2 | 시드 스크립트 업데이트 | `scripts/` 수정 | 20분 |
| 7.3 | E2E 테스트 시나리오 | 수동 테스트 | 30분 |

---

## 6. 개발 우선순위

```
 높음 ◀─────────────────────────────▶ 낮음

 Phase 1    Phase 2    Phase 3    Phase 4    Phase 5    Phase 6    Phase 7
 [모델확장] [API인증]  [예산시스템] [정책확장] [개발사UI]  [관리자UI] [테스트]
   Day 1    Day 1-2     Day 2     Day 2-3    Day 3-4    Day 4      Day 5
```

### 핵심 의존관계

```
Phase 1 (모델) ─┬──▶ Phase 2 (API Key) ─┬──▶ Phase 5 (개발사 UI)
                │                        │
                ├──▶ Phase 3 (예산) ──────┤
                │                        │
                └──▶ Phase 4 (정책 확장) ─┴──▶ Phase 6 (관리자 UI)
                                                       │
                                                       └──▶ Phase 7 (테스트)
```

---

## 7. 위험 요소 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| 포인트 잔액 동시성 이슈 (batch-grant 시 race condition) | 잔액이 음수가 될 수 있음 | MongoDB `findOneAndUpdate` + `$inc`로 원자적 차감, 차감 후 음수 체크 |
| API Key 유출 | 무단 포인트 지급 | Key 해시 저장, IP 화이트리스트, 일일 호출량 제한, Key 재발급 기능 |
| 개발사 무한 포인트 발행 | 플랫폼 포인트 인플레이션 | 예산 시스템으로 구매한 만큼만 지급 가능 |
| 기존 승인된 정책 마이그레이션 | 기간/잔액 없는 기존 데이터 | 기존 approved 정책은 startDate=null(상시), 관리자가 초기 잔액 부여 |

---

## 8. 마이그레이션 계획

기존 시스템에서 v2.0으로의 전환:

1. **DB 마이그레이션**: GamePointPolicy에 새 필드 추가 (기본값 설정으로 하위 호환)
2. **기존 정책**: startDate/endDate = null (상시), conditionConfig = null
3. **개발사 잔액 초기화**: 관리자가 수동으로 초기 잔액 부여 (또는 무료 체험 포인트)
4. **API Key 전환기**: 기존 공개 API는 일정 기간 유지, deprecation 경고 → 이후 API Key 필수화
5. **UI 점진적 교체**: 기존 탭 구조 유지하며 새 기능 추가

---

*이 문서는 현행 시스템 리뷰와 v2.0 요구사항을 기반으로 작성되었습니다.*
