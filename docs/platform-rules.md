# GameUp 플랫폼 운영 규칙

> 작성일: 2026-06-19  
> 이 문서는 코드에서 실제 동작하는 규칙을 정리한 것입니다. 플랫폼에 참여하는 개발자·관리자·파트너 모두를 위한 기준입니다.

---

## 목차

1. [게임 등록 & 심사](#1-게임-등록--심사)
2. [회원 가입 & 역할](#2-회원-가입--역할)
3. [관리자 등급별 권한](#3-관리자-등급별-권한)
4. [배너 관리](#4-배너-관리)
5. [커뮤니티 규칙](#5-커뮤니티-규칙)
6. [포인트 & 레벨 시스템](#6-포인트--레벨-시스템)
7. [게임 포인트 (외부 연동)](#7-게임-포인트-외부-연동)
8. [결제 & 게임샵](#8-결제--게임샵)
9. [파트너 채널](#9-파트너-채널)
10. [알림 규칙](#10-알림-규칙)

---

## 1. 게임 등록 & 심사

### 1.1 상태 값 정의

게임은 **서비스 상태(status)**와 **심사 상태(approvalStatus)** 두 가지가 독립적으로 관리됩니다.

#### 서비스 상태 (status)

| 값 | 의미 |
|----|------|
| `draft` | 임시저장 / 심사 전 / 강제중지 상태 |
| `beta` | 베타 서비스 중 |
| `published` | 정식 출시 중 |
| `archived` | 서비스 종료 |

#### 심사 상태 (approvalStatus)

| 값 | 의미 |
|----|------|
| `not_submitted` | 심사 미신청 (최초 등록 후 기본값) |
| `pending` | 심사 요청됨 (관리자 검토 대기) |
| `review` | 관리자가 검토 중 |
| `approved` | 심사 승인됨 |
| `rejected` | 심사 거부됨 |

#### 서비스 유형 (serviceType)

| 값 | 의미 |
|----|------|
| `beta` | 베타 테스트 서비스 |
| `live` | 정식 라이브 서비스 |
| `review` | 심사 중 (재심사 요청 시) |
| `ended` | 종료됨 |

---

### 1.2 게임 등록 흐름

```
개발자 등록
  ↓
status=draft / approvalStatus=not_submitted  (기본값)
  ↓
gameDomain(게임 URL) 입력 필수
  ↓
심사 요청 (requestReview)
  ↓
approvalStatus=pending
  ↓
관리자 검토 중으로 변경 가능
  ↓
approvalStatus=review
  ↓
[승인] approvalStatus=approved → status=beta로 오픈 (또는 기존 status 유지)
[거부] approvalStatus=rejected + rejectionReason 저장
```

**심사 요청 조건:**
- `gameDomain`(게임 URL)이 반드시 입력되어 있어야 함
- 이미 `pending` 또는 `review` 상태이면 중복 요청 불가
- 유효한 URL 형식이어야 함 (예: `https://mygame.com`)

**출시(published) 전환 조건:**
- `approvalStatus === 'approved'`인 경우에만 `status=published`로 변경 가능
- 승인되지 않은 상태에서 published 시도 → 400 오류

---

### 1.3 게임 수정 규칙

#### 출시 중인 게임 (status=published)
- serviceType(베타/라이브)에 무관하게 수정 시 **즉시 반영**, 재심사 없음
- 수정 가능 필드: title, description, genre, thumbnail, bannerImage, trailer, website, discord, notes, platform, engine, startDate, endDate, maxTesters, testType, requirements, gameDomain, monetization

#### serviceType(베타↔라이브) 변경 시
- `approvalStatus`가 `not_submitted`으로 자동 리셋
- `status`가 `published`가 아닌 경우 → `draft`로 변경
- **재심사 필요**

#### 편집 잠금 조건
- `status !== 'published'` && (`approvalStatus === 'pending'` 또는 `'review'`): 심사 진행 중 편집 불가 (UI 레벨)
- `status !== 'published'` && `approvalStatus === 'approved'`: 출시 대기 중 편집 불가

---

### 1.4 관리자의 게임 상태 제어

| 액션 | 동작 | 설명 |
|------|------|------|
| `suspend` (강제중지) | status=draft, 현재 상태 저장 | 이유(reason) 기록됨 |
| `reactivate` (재활성화) | 중지 전 상태로 복원 | statusBeforeSuspend 사용 |
| `archive` (서비스 종료) | status=archived | archiveReason 기록됨 |
| `set_beta` | status=beta | |
| `set_published` | status=published | |

---

### 1.5 게임 삭제 & 복구

- 삭제 시 파일은 완전 삭제되지 않고 `uploads/deleted/{logId}/` 폴더로 이동
- `GameDeletionLog`에 삭제자 정보, 게임 스냅샷, IP, UserAgent 기록
- **복구 가능**: 관리자가 삭제 로그로 게임 완전 복원 가능 (파일 포함)
- 복구 시 `restoredAt` 타임스탬프 기록

---

### 1.6 등급 분류 (ratingCertificate)

| 등급 | 값 |
|------|----|
| 전체이용가 | `전체이용가` |
| 12세 이용가 | `12세이용가` |
| 15세 이용가 | `15세이용가` |
| 18세 이용가 | `18세이용가` |
| 청소년이용불가 | `청소년이용불가` |

- 인증번호, 인증일, 인증서 파일(PDF 등) 업로드 가능
- 관리자가 `isVerified` 처리

---

## 2. 회원 가입 & 역할

### 2.1 역할 (role)

| 역할 | 설명 |
|------|------|
| `player` | 기본 역할. 게임 플레이, 커뮤니티 활동 |
| `developer` | 게임 등록/관리 가능 |
| `admin` | 플랫폼 관리자 |

> 기본 가입 시 role=`player`. 역할 변경은 관리자(normal+)만 가능.

---

### 2.2 회원 유형 (memberType)

| 유형 | 설명 |
|------|------|
| `individual` | 개인 회원 |
| `corporate` | 기업 회원 (승인 절차 필요) |

---

### 2.3 기업 회원 승인 절차

```
기업회원 가입
  ↓
companyInfo 입력 (회사명, 사업자번호, 업종 등)
  ↓
approvalStatus=pending (대기)
  ↓
관리자(super) 검토
  ↓
[승인] approvalStatus=approved, companyInfo.isApproved=true
[거부] approvalStatus=rejected, companyInfo.rejectedReason 기록
```

- 기업 승인은 **super 관리자만** 가능
- `companyType`: developer, publisher, game_solution, game_service, operations, qa, marketing, other

---

### 2.4 계정 정지 (ban)

- 정지 처리: `isActive=false`, `bannedAt` 기록
- 정지 범위(`banScope`): `posts`(게시글), `comments`(댓글), 또는 둘 다
- 정지 기한(`bannedUntil`): 날짜 지정 또는 영구
- **만료일 지나면 자동 해제** (커뮤니티 접근 시 자동 체크)
- 정지/해제 시 `history` 배열에 이력 기록
- 정지/해제 시 해당 사용자에게 **시스템 알림** 자동 발송

**정지 불가 계정:**
- `role=admin`인 계정은 삭제 불가 (정지는 가능)

---

### 2.5 OAuth 연동

- 지원 제공자: `kakao`, `naver`
- 계정 연동/해제 가능
- 같은 계정에 여러 OAuth 제공자 연결 가능

---

## 3. 관리자 등급별 권한

관리자는 `adminLevel`에 따라 권한이 구분됩니다.

> **주의**: `adminLevel`이 설정되지 않은 기존 admin 계정은 `super`로 처리됩니다 (하위 호환).

### 3.1 super (최고 관리자)

super는 모든 권한을 가집니다. normal에 추가로:

| 기능 | 설명 |
|------|------|
| 게임 승인/거부 | approveGame (approve/reject/review) |
| 회원 승인/삭제 | 기업회원 승인, 회원 완전 삭제 |
| 관리자 계정 생성 | createAdminUser |
| 리뷰 삭제 | 영구 삭제 |
| 공지사항 삭제 | 영구 삭제 |
| 파트너 신청 삭제 | deletePartnerRequest |
| 파트너 토픽 삭제 | deleteTopicGroup |
| 지원 시즌/신청서/배너/탭 삭제 | 영구 삭제 |

---

### 3.2 normal (일반 관리자)

| 기능 | 설명 |
|------|------|
| 사용자 역할 변경 | developer ↔ player ↔ admin |
| 사용자 정지/해제 | 기한 지정 또는 영구 |
| 게임 상태 제어 | 강제중지, 재활성화, 종료, 베타/출시 전환 |
| 신작 게임 등록/해제 | isNewFeatured 토글 |
| 리뷰 차단/해제 | blockReview |
| 커뮤니티 게시글/댓글 상태 변경 | |
| 배너 관리 | 업로드, 수정 (삭제는 super) |
| 공지사항 작성/수정 | |
| 파트너 신청 승인/거부 | |
| 파트너 상태/공개 변경 | 프로필 수정 포함 |
| 퍼블리싱 배너/탭 관리 | 생성/수정 (삭제는 super) |
| 지원 시즌/신청서/배너 관리 | 생성/수정 (삭제는 super) |
| 솔루션 생성/수정 | |
| 활동점수/포인트 수동 지급 | |
| 게임샵 심사 승인/거부 | |

---

### 3.3 monitor (모니터 관리자)

최소 권한. 주로 조회 + 알림/공지 발송:

| 기능 | 설명 |
|------|------|
| 알림 발송 | 전체 또는 특정 사용자 대상 |
| 대량 알림 발송 | bulkNotify |
| 공지사항 작성/수정 | 삭제는 불가 |
| 모든 관리자 페이지 조회 | 읽기 전용 |

---

## 4. 배너 관리

### 4.1 배너 종류

| 탭명 | 위치 | 최대 개수 | 특이사항 |
|------|------|-----------|---------|
| 메인_배너 | 메인 페이지 상단 | 5개 | 자동 롤링 |
| 메인_신작 | 메인 페이지 신작 게임 섹션 | 5개 | 자동 롤링 |
| 커뮤니티_배너 | 커뮤니티 홈 상단 | 5개 | 자동 롤링 |
| 메인_이벤트 | 메인 페이지 이벤트 박스 | 5개 | 자동 롤링 |

### 4.2 배너 관리 권한

- 업로드/수정: `normal` 이상
- 삭제: `super`만
- 배너 순서 변경(reorder): `normal` 이상

### 4.3 배너 상태

- `isActive`: 활성/비활성 토글 가능
- CTR(클릭률), 노출수, 클릭수 통계 기록

---

## 5. 커뮤니티 규칙

### 5.1 채널 종류

| 채널 | 설명 |
|------|------|
| `notice` | 공지사항 |
| `new-game-intro` | 신작 게임 소개 |
| `beta-game` | 베타 게임 관련 |
| `live-game` | 라이브 게임 관련 |
| `free` | 자유 게시판 (기본값) |

### 5.2 게시글 작성 권한

- 로그인 필수 (인증된 사용자만 작성 가능)
- **차단된 사용자**: `banScope`에 `posts` 포함 시 작성 불가
  - 만료일이 지나면 자동으로 차단 해제
- 수정/삭제: 본인 또는 관리자만 가능

**링크 검증**: `http://` 또는 `https://`로 시작하는 URL만 첨부 가능

### 5.3 핫 게시글 계산

```
핫 스코어 = (좋아요 수 × 3 + 댓글 수 × 2 + 조회수 × 0.1) / (경과시간(h) + 2) ^ 1.5
isHot = hotScore > 5
```

### 5.4 게시글 정렬

| 정렬 옵션 | 기준 |
|-----------|------|
| latest (기본) | 최신순 (isPinned 우선) |
| popular | 핫 스코어 높은 순 |
| trending | 핫 스코어 + 최신 |
| most_liked | 좋아요 많은 순 |

### 5.5 댓글 작성 권한

- 로그인 필수
- **차단된 사용자**: `banScope`에 `comments` 포함 시 작성 불가

### 5.6 신고 처리

- 게시글/댓글 모두 신고 가능
- 관리자가 신고된 게시글/댓글 상태 변경 가능: `normal` 이상
- 블랙리스트: 반복 신고 누적 시 적용

### 5.7 이미지 업로드

- 게시글 당 이미지 최대 **5개**
- 커뮤니티 이미지 최대 5MB

---

## 6. 포인트 & 레벨 시스템

### 6.1 활동점수(포인트) 개요

플랫폼 활동에 따라 포인트가 적립되며, 포인트 누적량에 따라 레벨이 자동 계산됩니다.

**포인트가 적립되지 않는 경우:**
- `isActive=false` (정지된 계정)
- 만료되지 않은 `bannedUntil` 기한 중
- 해당 타입의 `dailyLimit` 초과 시
- 해당 정책이 `isActive=false`인 경우 (관리자 수동 제외)

---

### 6.2 자동 적립 항목

| 타입 | 설명 | 조건 |
|------|------|------|
| `login` | 일일 접속 | 하루 1회 |
| `stay_time` | 사이트 체류 시간 | - |
| `post_write` | 게시글 작성 | 작성 즉시 |
| `post_delete` | 게시글 삭제 | 차감 |
| `comment_write` | 댓글 작성 | 작성 즉시 |
| `comment_delete` | 댓글 삭제 | 차감 |
| `recommend_received` | 내 게시물에 좋아요 받음 | 타인이 좋아요 시 |
| `recommend_cancelled` | 내 게시물 좋아요 취소됨 | 차감 |
| `game_access` | 게임 접속 | 게임별 하루 1회 |
| `game_stay_time` | 게임 체류 시간 | - |
| `game_event_reward` | 게임 이벤트 보상 | - |
| `game_payment_reward` | 결제 보상 | - |

> 좋아요 포인트: 자기 자신의 게시물에 좋아요 해도 적립 안 됨

---

### 6.3 게임 연동 포인트 (외부 게임 서버 → 플랫폼)

| 타입 | 설명 |
|------|------|
| `game_account_create` | 게임 계정 생성 |
| `game_daily_login` | 게임 일일 로그인 |
| `game_play_time` | 게임 플레이 시간 |
| `game_purchase` | 게임 내 구매 |
| `game_event_participate` | 게임 이벤트 참여 |
| `game_level_achieve` | 게임 레벨 달성 |
| `game_ranking` | 게임 랭킹 |

---

### 6.4 관리자 수동 처리

| 타입 | 설명 |
|------|------|
| `admin_grant` | 관리자 수동 포인트 지급 |
| `admin_deduct` | 관리자 수동 포인트 차감 |

- 수동 처리는 `normal` 이상 관리자 가능
- 정책 비활성 여부와 무관하게 적립 가능

---

### 6.5 포인트 정책 관리

- `PointPolicyModel`에서 각 타입별 `amount`, `multiplier`, `dailyLimit`, `isActive` 관리
- 정책 수정: `super` 또는 `normal` 관리자
- 정책 캐시: **5분 TTL** (변경 후 최대 5분 후 반영)

---

### 6.6 레벨 시스템

- `LevelModel`: level 번호, 이름, 아이콘, 필요 점수(`requiredScore`)
- 사용자 `activityScore`가 `requiredScore` 이상이면 해당 레벨 획득
- 레벨 자동 계산: 포인트 적립 시 즉시 재계산
- 레벨 캐시: **5분 TTL**
- 레벨 설정/수정: `super` 관리자만 가능
- 레벨 변경 시 각 레벨의 `memberCount` 자동 재계산

---

## 7. 게임 포인트 (외부 연동)

### 7.1 연동 방식

게임 서버에서 플랫폼 API를 직접 호출하여 사용자에게 포인트를 지급합니다.

```
게임 서버 → POST /api/game-points/grant
           헤더: x-api-key: {발급받은 API 키}
```

### 7.2 API 키 관리

- 게임당 최대 **5개** API Key 발급 가능
- 생성/삭제/재발급/활성화 토글 가능
- Developer 또는 Admin만 관리 가능

### 7.3 일괄 지급

- `POST /api/game-points/batch-grant`
- 1회 최대 **100건** 처리

### 7.4 게임 포인트 정책 승인 절차

```
개발자가 포인트 정책 작성 (type, amount, dailyLimit 등)
  ↓
개발자가 승인 요청 제출 (submit)
  ↓
approvalStatus=pending
  ↓
관리자(normal+) 검토
  ↓
[승인] 정책 활성화
[거부] rejected 처리
```

---

## 8. 결제 & 게임샵

### 8.1 결제 수단

- Toss Payments SDK 사용
- 결제 흐름: 주문 생성 → 결제 승인 → 완료/실패

### 8.2 게임샵 결제 유형

| 유형 | 값 |
|------|----|
| 현금 결제 | `cash` |
| 캡코인(플랫폼 포인트) 결제 | `capcoin` |

### 8.3 게임샵 상품 심사

- 개발자가 상품 등록 시 `saleStatus=reviewing`
- 관리자(normal+)가 승인 → `saleStatus=on_sale`
- 관리자(normal+)가 거부 → `saleStatus=rejected`

### 8.4 수익화 모델 (monetization)

| 값 | 의미 |
|----|------|
| `free` | 무료 |
| `ad` | 광고형 |
| `paid` | 유료 |
| `freemium` | 부분 유료 (기본값) |

---

## 9. 파트너 채널

### 9.1 파트너 신청 흐름

```
파트너 신청 (자기소개 + 활동계획 필수)
  ↓
1인 1건 제한 (중복 신청 불가)
  ↓
status=pending
  ↓
관리자(normal+) 검토
  ↓
[승인] status=approved, approvedAt 기록
[거부] status=rejected, rejectedReason 기록
```

### 9.2 파트너 활동 제한

- 슬로건, 게시글 등은 `status=approved`인 파트너만 가능
- 파트너 게시글 작성/수정/삭제: 본인만

### 9.3 파트너 관리 권한

| 액션 | 필요 등급 |
|------|---------|
| 파트너 신청 승인/거부 | normal+ |
| 파트너 상태/공개 변경 | normal+ |
| 파트너 프로필 수정 | normal+ |
| 파트너 신청 삭제 | super |
| 토픽 그룹 삭제 | super |
| 파트너 게시글 삭제 | super |

---

## 10. 알림 규칙

### 10.1 알림 타입

| 타입 | 설명 |
|------|------|
| `system` | 시스템 알림 (정지, 해제 등 자동 발송 포함) |
| `notice` | 공지 알림 |
| `publishing` | 퍼블리싱 관련 |
| `comment` | 댓글 알림 |
| `follow` | 팔로우 알림 |
| `proposal` | 제안 알림 |

### 10.2 자동 알림 발송 케이스

| 상황 | 타입 | 설명 |
|------|------|------|
| 계정 정지 | `system` | 정지 범위, 기간 포함 |
| 계정 정지 해제 | `system` | 해제 안내 |

### 10.3 관리자 수동 알림 발송 권한

- 발송 가능: `monitor` 이상 (super, normal, monitor 모두 가능)
- 전체 발송(`broadcast=true`): 전체 사용자에게 발송
- 특정 사용자(`userIds`): 지정 사용자에게만 발송

### 10.4 알림 클릭 동작

- `linkUrl`이 있는 경우: 클릭 시 해당 URL로 이동 (`window.location.href`)
- `linkUrl`이 없는 경우: 읽음 처리만 됨
- 실시간 전달: **Socket.IO** (`new-notification` 이벤트)

---

## 부록: 주요 상수 요약

### 게임 등급 분류

`전체이용가` / `12세이용가` / `15세이용가` / `18세이용가` / `청소년이용불가`

### 게임 장르

RPG / 액션 / 전략 / 레이싱 / 어드벤처 / 시뮬레이션 / 퍼즐 / FPS / 스포츠 / 호러 / 기타

### 조회 최대 건수

| 항목 | 제한 |
|------|------|
| 게임 목록 1회 조회 | 최대 50개 |
| 결제 내역 1회 조회 | 최대 200건 |
| 배너 종류별 최대 개수 | 5개 |
| API Key (게임당) | 5개 |
| 게임 포인트 일괄 지급 | 최대 100건 |
| 이미지 첨부 (게시글) | 최대 5개 |
| 파일 업로드 최대 용량 | 100MB |
