# 게임샵 & 결제 시스템 개발 계획

> **Claude 작업 지침**
> - "결제 작업"이 언급되면 반드시 이 파일을 먼저 읽고 작업한다.
> - 실제 작업이 이 계획과 다르게 진행될 경우, 작업 전에 사용자에게 먼저 알린다.

---

## 판매 상품 유형

각 게임사의 **게임 내 재화(골드, 다이아 등)**를 플랫폼에서 판매한다.
결제 완료 후 플랫폼이 게임사 지급 API를 호출하여 재화를 지급한다.

---

## 전체 흐름

```
유저 결제
  → 플랫폼 결제 확인 (외부 팀 - Phase 2)
  → 게임사 지급 API 호출 (플랫폼 → 게임사 서버)
  → 게임사 서버에서 재화 지급
  → 지급 결과 플랫폼에 응답 및 기록
```

---

## 담당 분리

| 작업 주체 | 담당 범위 |
|---|---|
| 이 프로젝트 (capcloud) | Phase 1 전체 + 게임사 지급 API 연동 구조 |
| **외부 팀 (별도 작업)** | **결제 API 연동** — 결제 처리·결제 데이터·실시간 현황·환불 |
| **각 게임사** | **지급 API 제공** — 플랫폼 호출을 받아 재화 지급하는 엔드포인트 구현 |

> Phase 2 결제 API 연동은 외부 팀이 담당한다.
> 각 게임사는 별도로 지급 API를 구현하여 플랫폼에 등록해야 한다.

---

## 데이터 모델 구조

```
Game (기존)
  └── Product (상품) — 게임사 재화 상품
        └── Order (주문)
              ├── Payment (결제) ← 결제 API 연동 시 채움 (외부 팀)
              └── DeliveryLog (지급 로그) ← 게임사 API 호출 결과 기록
```

### Order 모델 핵심 필드
- `paymentStatus: 'pending' | 'paid' | 'refunded'`
- `deliveryStatus: 'pending' | 'success' | 'failed'`
- 지급 로직은 `paymentStatus === 'paid'` 시 트리거

### Game 모델 추가 필드 (Phase 1에서 준비)
- `deliveryApiUrl` — 게임사 지급 API 엔드포인트
- `deliveryApiKey` — 인증 키 (암호화 저장)

---

## 게임사 지급 API 연동 규격 (플랫폼 → 게임사)

플랫폼이 결제 완료 후 각 게임사 API를 호출한다.

### 요청 (플랫폼 → 게임사)
```json
POST {deliveryApiUrl}
Authorization: Bearer {deliveryApiKey}

{
  "orderId": "주문 ID",
  "userId": "플랫폼 유저 ID",
  "gameUserId": "게임 내 유저 ID",
  "productId": "상품 ID",
  "currencyType": "재화 종류 (예: gold, diamond)",
  "quantity": 100
}
```

### 응답 (게임사 → 플랫폼)
```json
{
  "success": true,
  "transactionId": "게임사 측 트랜잭션 ID"
}
```

---

## Phase 1 — 지금 개발 (결제 API 불필요)

> **현재 작업 범위:** 상품 세팅 + 스토어 화면까지만 개발한다.
> 게임사 지급 API 연동 방식은 이후 별도로 논의 후 결정한다.

### 상품 세팅 (관리자)
- 게임별 상품 등록·수정·삭제
- 상품 필드: 이름, 설명, 가격, 재화 종류, 재화 수량, 이미지, 활성화 여부
- 관리자 상품 관리 페이지

### 스토어 화면 (유저)
- 게임별 스토어 페이지
- 상품 목록 및 상세 보기

### 보류 — 추후 논의
- 게임사 지급 API 연동 방식 (deliveryApiUrl, deliveryApiKey 등)
- Order / DeliveryLog 모델 설계
- 지급 로직 및 실패 처리 플로우
- 결제 완료 후 지급 트리거 방식

---

## Phase 2 — 결제 API 수령 후 (외부 팀 담당)

### 결제 처리
- 결제 요청 / 승인 / 실패 처리
- Payment 모델 연동 (Order에 paymentId 연결)
- 결제 완료 후 지급 API 호출 트리거

### 결제 데이터
- 결제 내역 저장 및 조회

### 실시간 결제 현황
- 관리자 대시보드 — 실시간 결제 모니터링

### 환불
- 환불 요청 처리
- paymentStatus → 'refunded' 업데이트

---

## 작업 범위 요약

| 기능 | 담당 | 시점 |
|---|---|---|
| 상품 세팅 | capcloud | Phase 1 |
| 상점 화면 | capcloud | Phase 1 |
| 게임사 지급 API 연동 구조 | capcloud | Phase 1 |
| 지급 로그 관리 | capcloud | Phase 1 |
| 결제 처리 | 외부 팀 | Phase 2 |
| 결제 데이터 | 외부 팀 | Phase 2 |
| 실시간 결제 현황 | 외부 팀 | Phase 2 |
| 환불 | 외부 팀 | Phase 2 |
| 게임사 지급 API 구현 | 각 게임사 | 게임사별 협의 |
