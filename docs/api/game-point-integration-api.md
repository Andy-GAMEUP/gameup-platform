# 게임-플랫폼 포인트 연동 API 문서

> **Version:** 1.0
> **Last Updated:** 2026-04-03
> **Base URL:** `/api`

---

## 목차

1. [개요](#1-개요)
2. [포인트 정책 타입](#2-포인트-정책-타입)
3. [외부 게임 연동 API](#3-외부-게임-연동-api)
4. [개발사 콘솔 API](#4-개발사-콘솔-api)
5. [관리자 API](#5-관리자-api)
6. [데이터 모델](#6-데이터-모델)
7. [연동 플로우](#7-연동-플로우)

---

## 1. 개요

게임-플랫폼 포인트 연동 시스템은 베타게임/라이브게임에서 게임 활동에 따라 플랫폼 활동 포인트를 지급하는 기능입니다.

### 워크플로우

```
1. 개발사: 게임 세부정보 > 포인트 보상 탭에서 정책 설정
2. 개발사: 승인 요청 제출
3. 관리자: 정책 검토 → 승인/거절
4. 승인 후: 게임 서버에서 API 호출하여 포인트 지급
5. 플레이어: 플랫폼 활동 포인트 수령 → 레벨 반영
```

### 인증

- **개발사/관리자 API**: JWT Bearer Token (`Authorization: Bearer <token>`)
- **외부 게임 연동 API**: 현재 공개 접근 (향후 API Key 인증 추가 예정)
  - `x-api-key` 헤더로 API 키 전달 가능 (로깅용)

---

## 2. 포인트 정책 타입

| 타입 | 라벨 | 설명 | 기본 동작 |
|------|------|------|----------|
| `game_account_create` | 게임 계정 생성 | 게임 최초 가입 시 1회 지급 | 중복 방지 (게임별 유저당 1회) |
| `game_daily_login` | 게임 일일 접속 | 게임 접속 시 1일 1회 지급 | 일 1회 제한 |
| `game_play_time` | 게임 플레이 시간 | 플레이 시간 기반 포인트 | `minutes × multiplier` |
| `game_purchase` | 게임 결제 보상 | 결제 금액 기반 포인트 | `amount × multiplier` |
| `game_event_participate` | 게임 이벤트 참여 | 이벤트 참여/완료 시 지급 | 기본 amount 지급 |
| `game_ranking` | 게임 랭킹 보상 | 랭킹 달성 시 보상 | `amount × rankMultiplier` |

---

## 3. 외부 게임 연동 API

### 3.1 포인트 지급 (단건)

```
POST /api/game-points/grant
```

게임 서버에서 호출하여 플레이어에게 플랫폼 포인트를 지급합니다.

**Request Body:**

```json
{
  "gameId": "게임 ObjectId",
  "userId": "플레이어 ObjectId",
  "type": "game_daily_login",
  "metadata": {
    "minutes": 60,
    "amount": 9900,
    "rank": 1,
    "rankMultiplier": 2.0,
    "eventId": "이벤트 식별자"
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `gameId` | string | O | 게임 ObjectId |
| `userId` | string | O | 플레이어 ObjectId |
| `type` | string | O | 포인트 정책 타입 (6가지 중 하나) |
| `metadata` | object | X | 추가 데이터 (타입별 상이) |

**metadata 필드 (타입별):**

| 타입 | metadata 필드 | 설명 |
|------|---------------|------|
| `game_play_time` | `minutes` (number) | 플레이 시간 (분 단위) |
| `game_purchase` | `amount` (number) | 결제 금액 |
| `game_ranking` | `rank` (number), `rankMultiplier` (number) | 순위, 보정 배율 |
| `game_event_participate` | `eventId` (string) | 이벤트 식별자 |

**Response (성공):**

```json
{
  "success": true,
  "amount": 5,
  "message": "5P 적립 완료",
  "newScore": 150,
  "newLevel": 3
}
```

**Response (실패):**

```json
{
  "success": false,
  "amount": 0,
  "message": "일일 포인트 한도에 도달했습니다"
}
```

**에러 메시지:**

| 메시지 | 원인 |
|--------|------|
| `게임을 찾을 수 없습니다` | 잘못된 gameId |
| `승인되지 않은 게임입니다` | 게임 approvalStatus ≠ approved |
| `유효하지 않은 사용자입니다` | 비활성/미존재 유저 |
| `정지된 사용자입니다` | bannedUntil 활성 |
| `해당 포인트 정책이 비활성 상태입니다` | 미승인 또는 비활성 정책 |
| `일일 포인트 한도에 도달했습니다` | dailyLimit 초과 |
| `이미 계정 생성 보상을 받았습니다` | game_account_create 중복 |
| `오늘 이미 접속 보상을 받았습니다` | game_daily_login 중복 |

---

### 3.2 포인트 일괄 지급

```
POST /api/game-points/batch-grant
```

한 번에 최대 100건의 포인트를 지급합니다 (랭킹 보상 등에 활용).

**Request Body:**

```json
{
  "gameId": "게임 ObjectId",
  "grants": [
    { "userId": "user1_id", "type": "game_ranking", "metadata": { "rank": 1, "rankMultiplier": 3.0 } },
    { "userId": "user2_id", "type": "game_ranking", "metadata": { "rank": 2, "rankMultiplier": 2.0 } },
    { "userId": "user3_id", "type": "game_ranking", "metadata": { "rank": 3, "rankMultiplier": 1.5 } }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "total": 3,
  "successCount": 3,
  "failCount": 0,
  "results": [
    { "userId": "user1_id", "type": "game_ranking", "success": true, "amount": 30, "message": "30P 적립 완료" },
    { "userId": "user2_id", "type": "game_ranking", "success": true, "amount": 20, "message": "20P 적립 완료" },
    { "userId": "user3_id", "type": "game_ranking", "success": true, "amount": 15, "message": "15P 적립 완료" }
  ]
}
```

---

### 3.3 게임 포인트 정책 조회 (공개)

```
GET /api/game-points/:gameId/policies
```

해당 게임의 활성화된 포인트 정책 목록을 조회합니다.

**Response:**

```json
{
  "policies": [
    {
      "type": "game_daily_login",
      "label": "게임 일일 접속",
      "description": "게임 접속 시 1일 1회 지급",
      "amount": 1,
      "multiplier": 1,
      "dailyLimit": 1
    }
  ]
}
```

---

## 4. 개발사 콘솔 API

> 인증 필요: `Authorization: Bearer <token>` (developer 또는 admin 역할)

### 4.1 내 게임 포인트 정책 조회

```
GET /api/games/:gameId/point-policies
```

**Response:**

```json
{
  "policies": [
    {
      "_id": "...",
      "gameId": "...",
      "type": "game_daily_login",
      "label": "게임 일일 접속",
      "description": "게임 접속 시 1일 1회 지급",
      "amount": 1,
      "multiplier": 1,
      "dailyLimit": 1,
      "isActive": false,
      "approvalStatus": "draft"
    }
  ]
}
```

### 4.2 포인트 정책 생성/수정

```
POST /api/games/:gameId/point-policies
```

**Request Body:**

```json
{
  "type": "game_daily_login",
  "label": "게임 일일 접속",
  "description": "게임 접속 시 1일 1회 지급",
  "amount": 1,
  "multiplier": 1,
  "dailyLimit": 1
}
```

- 동일 `gameId + type` 조합이면 수정, 없으면 생성
- 새로 생성 시 `approvalStatus: 'draft'`

### 4.3 승인 요청 제출

```
POST /api/games/:gameId/point-policies/submit
```

draft 또는 rejected 상태인 정책을 일괄 `pending`으로 변경합니다.

**Response:**

```json
{
  "message": "승인 요청이 제출되었습니다",
  "updatedCount": 3
}
```

### 4.4 정책 삭제

```
DELETE /api/games/:gameId/point-policies/:type
```

- `draft` 또는 `rejected` 상태의 정책만 삭제 가능

### 4.5 포인트 통계 조회

```
GET /api/game-points/:gameId/stats
```

**Response:**

```json
{
  "stats": [
    { "type": "game_daily_login", "totalPoints": 1500, "count": 1500, "uniqueUsers": 300 }
  ],
  "totalPoints": 5000,
  "totalTransactions": 3200
}
```

### 4.6 포인트 지급 이력 조회

```
GET /api/game-points/:gameId/logs?page=1&limit=20&type=game_daily_login
```

**Response:**

```json
{
  "logs": [
    {
      "_id": "...",
      "gameId": "...",
      "userId": { "_id": "...", "username": "player1", "email": "player1@test.com" },
      "type": "game_daily_login",
      "amount": 1,
      "metadata": null,
      "createdAt": "2026-04-03T09:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150, "pages": 8 }
}
```

---

## 5. 관리자 API

> 인증 필요: `Authorization: Bearer <token>` (admin 역할)

### 5.1 전체 정책 목록 조회

```
GET /api/admin/game-point-policies?status=pending&gameId=xxx&page=1&limit=20
```

### 5.2 정책 승인

```
PUT /api/admin/game-point-policies/:id/approve
```

**Request Body:**

```json
{
  "adminNote": "선택적 관리자 메모"
}
```

- 승인 시 `isActive: true` 자동 설정

### 5.3 정책 거절

```
PUT /api/admin/game-point-policies/:id/reject
```

**Request Body:**

```json
{
  "rejectionReason": "포인트 지급량이 과도합니다. 일일 한도를 설정해주세요."
}
```

### 5.4 정책 활성/비활성 토글

```
PUT /api/admin/game-point-policies/:id/toggle
```

- 승인된 정책만 토글 가능

---

## 6. 데이터 모델

### GamePointPolicy (게임 포인트 정책)

| 필드 | 타입 | 설명 |
|------|------|------|
| `gameId` | ObjectId (ref: Game) | 게임 |
| `developerId` | ObjectId (ref: User) | 개발사 |
| `type` | Enum | 포인트 정책 타입 |
| `label` | String | 표시 라벨 |
| `description` | String | 설명 |
| `amount` | Number | 기본 지급량 |
| `multiplier` | Number | 배율 (기본 1) |
| `dailyLimit` | Number \| null | 일일 한도 (null = 무제한) |
| `isActive` | Boolean | 활성 여부 |
| `approvalStatus` | Enum | draft / pending / approved / rejected |
| `adminNote` | String | 관리자 메모 |
| `approvedAt/By` | Date / ObjectId | 승인 정보 |
| `rejectedAt/By/Reason` | Date / ObjectId / String | 거절 정보 |

**인덱스:** `{ gameId, type }` (unique)

### GamePointLog (게임 포인트 지급 이력)

| 필드 | 타입 | 설명 |
|------|------|------|
| `gameId` | ObjectId (ref: Game) | 게임 |
| `userId` | ObjectId (ref: User) | 플레이어 |
| `type` | Enum | 포인트 정책 타입 |
| `amount` | Number | 지급 포인트 |
| `metadata` | Mixed | 추가 데이터 |
| `apiKeyUsed` | String | 사용된 API 키 |

**인덱스:**
- `{ gameId, userId, type, createdAt }` (복합)
- `{ gameId, userId, type }` unique (game_account_create만, partial)

---

## 7. 연동 플로우

### 7.1 게임 계정 생성 포인트

```
[게임 서버] → POST /api/game-points/grant
{
  "gameId": "xxx",
  "userId": "yyy",
  "type": "game_account_create"
}
← { "success": true, "amount": 5, "message": "5P 적립 완료" }
```

### 7.2 일일 접속 포인트

```
[게임 서버] → POST /api/game-points/grant
{
  "gameId": "xxx",
  "userId": "yyy",
  "type": "game_daily_login"
}
← { "success": true, "amount": 1, "message": "1P 적립 완료" }
```

### 7.3 플레이 시간 포인트

```
[게임 서버] → POST /api/game-points/grant
{
  "gameId": "xxx",
  "userId": "yyy",
  "type": "game_play_time",
  "metadata": { "minutes": 120 }
}
← { "success": true, "amount": 12, "message": "12P 적립 완료" }
```

### 7.4 결제 보상 포인트

```
[게임 서버] → POST /api/game-points/grant
{
  "gameId": "xxx",
  "userId": "yyy",
  "type": "game_purchase",
  "metadata": { "amount": 29900, "orderId": "ORDER-123" }
}
← { "success": true, "amount": 2990, "message": "2990P 적립 완료" }
```

### 7.5 이벤트 참여 포인트

```
[게임 서버] → POST /api/game-points/grant
{
  "gameId": "xxx",
  "userId": "yyy",
  "type": "game_event_participate",
  "metadata": { "eventId": "EVENT-001", "eventName": "봄맞이 이벤트" }
}
← { "success": true, "amount": 3, "message": "3P 적립 완료" }
```

### 7.6 랭킹 보상 포인트 (일괄)

```
[게임 서버] → POST /api/game-points/batch-grant
{
  "gameId": "xxx",
  "grants": [
    { "userId": "user1", "type": "game_ranking", "metadata": { "rank": 1, "rankMultiplier": 3.0 } },
    { "userId": "user2", "type": "game_ranking", "metadata": { "rank": 2, "rankMultiplier": 2.0 } },
    { "userId": "user3", "type": "game_ranking", "metadata": { "rank": 3, "rankMultiplier": 1.5 } }
  ]
}
← { "success": true, "total": 3, "successCount": 3, "failCount": 0, "results": [...] }
```

---

## 부록: 포인트 계산 공식

| 타입 | 공식 | 예시 |
|------|------|------|
| `game_account_create` | `amount` (고정) | 5P |
| `game_daily_login` | `amount` (고정) | 1P |
| `game_play_time` | `metadata.minutes × multiplier` | 120분 × 0.1 = 12P |
| `game_purchase` | `metadata.amount × multiplier` | ₩29,900 × 0.1 = 2,990P |
| `game_event_participate` | `amount` (고정) | 3P |
| `game_ranking` | `amount × metadata.rankMultiplier` | 10P × 3.0 = 30P |

- 모든 포인트는 정수로 내림 처리 (`Math.floor`)
- 일일 한도 초과 시 잔여 한도만큼만 지급
- 최소 1P 미만은 지급 불가
