# GameUp 플랫폼 운영 규칙

> 작성일: 2026-06-19 / 최종 수정: 2026-06-26  
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

### 2.3 기업 회원 규칙

#### 기업 분류 체계

기업 회원은 **두 단계**로 분류됩니다.

```
기업 회원 (memberType=corporate)
├── 개발사 (companyCategory=developer)   ← 게임 개발 주체, 개발자 센터 접근 가능
└── 파트너 (companyCategory=partner)    ← 게임 서비스 관련사, 파트너 라운지 전용
    └── 사업 형태 (companyType, 복수 선택)
        퍼블리셔 / 게임솔루션 / 게임서비스 / 운영 / QA / 마케팅 / 개발 / 원화 / 기타
```

- `companyCategory` = **상위 개념** (개발사 vs 파트너 구분)
- `companyType` = **하위 개념** (사업 형태, 복수 선택 가능)
- 가입 시 `companyCategory`와 `companyType` 모두 **필수**
- 개발사는 게임 등록/관리 가능 (개발자 센터), 파트너는 파트너 라운지 전용

> **하위 호환**: `companyCategory` 필드가 없는 기존 계정은 `companyType.includes('developer')`로 개발사 여부를 판단합니다.

#### 가입 및 승인

```
기업회원 가입 (회사명, 기업 구분(개발사/파트너), 사업 형태, 연락처 입력)
  ↓
approvalStatus=pending (가입 대기) → /register/pending 화면으로 이동
  ↓
관리자(super) 검토
  ↓
[승인] approvalStatus=approved → 파트너 라운지 채널 자동 생성
[삭제] 계정 완전 삭제 (DB에서 제거)
```

- 기업 승인은 **super 관리자만** 가능
- **거절(rejected) 기능 없음**: 관리자는 승인 또는 계정 삭제만 가능
- 승인된 회원(`approvalStatus=approved`)은 관리자가 삭제 불가 (버튼 비활성화)

#### 미승인 기업회원 접근 제한

- `approvalStatus=pending` 상태의 기업회원은 `/register/pending`, `/login`, `/terms` 외 모든 페이지 접근 불가
- 접근 시도 시 `/register/pending`으로 자동 리다이렉트
- `/register/pending` 페이지에서 "홈으로 돌아가기" 클릭 시 **로그아웃** 후 홈으로 이동

#### 회사 단일 계정 원칙

- **하나의 회사에 하나의 대표 기업회원 계정만** 허용
- 가입 시 동일 회사명(대기/승인 상태)이 이미 존재하면 가입 불가
- 이 계정만 파트너 라운지 채널을 소유함

#### 역할 제한

- 기업회원 계정(`memberType=corporate`)은 **관리자(`role=admin`)로 변경 불가**
- 관리자가 역할 변경 시도 시 403 오류 반환

---

### 2.4 파트너 채널 팀원

- 기업회원 대표 계정은 **내채널 > 팀원 관리**에서 게임회원을 팀원으로 추가할 수 있다
- 팀원으로 추가된 게임회원은 **파트너 라운지 접근 가능** + **채널 수정 권한** (게시글 작성, 채널 프로필 업데이트)
- 팀원 추가/제거는 **채널 소유자(기업 대표 계정)만** 가능 (게임회원 팀원은 팀원 관리 불가)
- 기업회원 계정은 팀원으로 추가 불가
- 채널 소유자 본인도 팀원으로 추가 불가
- `GET /partner/status` 호출 시 팀원 여부(`isTeamMember: true`)와 소속 파트너 정보가 함께 반환됨

---

### 2.5 계정 정지 (ban)

- 정지 처리: `isActive=false`, `bannedAt` 기록
- 정지 범위(`banScope`): `posts`(게시글), `comments`(댓글), 또는 둘 다
- 정지 기한(`bannedUntil`): 날짜 지정 또는 영구
- **만료일 지나면 자동 해제** (커뮤니티 접근 시 자동 체크)
- 정지/해제 시 `history` 배열에 이력 기록
- 정지/해제 시 해당 사용자에게 **시스템 알림** 자동 발송
- **즉시 차단**: 정지된 계정은 로그인 중이어도 다음 API 요청 시 즉시 차단 (`isActive=false` DB 실시간 확인, `401 ACCOUNT_SUSPENDED` 반환 후 로그아웃)

**정지 불가 계정:**
- `role=admin`인 계정은 정지 체크 제외 (관리자는 항상 접근 가능)

---

### 2.6 OAuth 연동

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
| 기업회원 승인 | companyInfo.approvalStatus 변경 |
| 기업회원 계정 삭제 | 미승인(pending) 계정만 삭제 가능 |
| 관리자 계정 생성 | createAdminUser |
| 리뷰 삭제 | 영구 삭제 |
| 공지사항 삭제 | 영구 삭제 |
| 파트너 신청 삭제 | deletePartnerRequest |
| 파트너 토픽 삭제 | deleteTopicGroup |
| 지원 시즌/신청서/배너/탭 삭제 | 영구 삭제 |

> **참고**: 기업회원 미승인(pending) 계정은 super 관리자가 삭제 가능. 승인된 일반 회원 계정은 삭제 불가, 정지(ban)만 가능.

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
| 파트너 채널 팀원 직접 관리 | 소속 추가/제거 (관리 패널에서) |
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

## 9. 파트너 라운지

> 최종 업데이트: 2026-06-25

### 9.1 파트너 라운지 채널 등록 흐름 (현행)

```
기업회원 가입
  ↓
관리자(super) 승인 → companyInfo.approvalStatus=approved
  ↓
파트너 라운지 채널 자동 생성 (status=approved)
  (이미 승인된 기업회원은 /partner 첫 접속 시 자동 생성)
  ↓
내채널(/partner/:id)에서 프로필 업데이트 가능
```

**채널 소유 조건:**
- `memberType=corporate` + `companyInfo.approvalStatus=approved`인 계정만 채널 보유
- 기업당 채널 1개 (userId unique 제약)

### 9.1-1 기업회원 정보 관리 구분

기업회원의 정보는 **기업 정보**와 **개인 정보** 두 곳으로 구분하여 관리합니다.

| 구분 | 관리 경로 | 내용 |
|------|-----------|------|
| 기업 정보 | `/partner/:id` (내채널) | 회사명, 기업 유형, 슬로건, 채널 프로필, 팀원 관리, 게시글 등 기업 채널 전반 |
| 개인 정보 | `/my` (마이페이지) | 개인 닉네임, 프로필 이미지, 비밀번호, 연락처 등 계정 개인 정보 |

### 9.2 팀원 시스템

- 채널 소유자는 **내채널 > 팀원 관리** 탭에서 게임회원을 팀원으로 추가 가능
- 팀원이 된 게임회원 권한: **파트너 라운지 접근 + 채널 게시글 작성 + 채널 프로필 업데이트**
- 팀원 관리 탭(팀원 추가/제거)은 **채널 소유자(기업 대표 계정)만** 노출
- 팀원 추가/제거: 채널 소유자 전용 (관리자는 관리 패널에서 직접 처리 가능 — 아래 참고)
- 추가 가능 대상: `memberType=individual` 게임회원만 (기업회원 불가)

#### 관리자의 팀원 직접 관리 (normal+)

| 액션 | 엔드포인트 | 설명 |
|------|-----------|------|
| 팀원 추가 | `POST /admin/partner/:partnerId/team` | `{ userId }` — 소유자 확인 없이 추가 |
| 팀원 제거 | `DELETE /admin/partner/team-member/:userId` | userId만으로 소속 파트너 자동 탐색 후 제거 |

- 관리자 패널 게임회원 탭 **관리** 버튼 → "기업 소속 시키기" / "소속된 기업에서 제외" 액션으로 처리

### 9.3 파트너 활동 제한

- 슬로건, 게시글 등은 `status=approved`인 파트너만 가능
- 파트너 게시글 작성/수정/삭제: 본인만

### 9.4 파트너 관리 권한

| 액션 | 필요 등급 |
|------|---------|
| 파트너 상태/공개 변경 | normal+ |
| 파트너 프로필 수정 | normal+ |
| 파트너 채널 팀원 추가/제거 | normal+ |
| 파트너 등록 삭제 | super |
| 토픽 그룹 삭제 | super |
| 파트너 게시글 삭제 | super |

### 9.5 프로젝트 관리 (관리자, `/admin/partner-topics`)

> 2026-07-06: 상태값을 `모집중 / 매칭성공 / 매칭보류` 3단계로 재구성 (기존 초안/진행중/완료/취소 폐지), "삭제 & 복구" 방식 도입

- 프로젝트 상태값: **`모집중(recruiting)`** / **`매칭성공(matched)`** / **`매칭보류(unmatched)`** 3가지만 존재
  - `모집중`: 지원자를 받을 수 있는 상태. 지원 API(`applyToProject`)는 이 상태에서만 허용됨
  - `매칭성공`: 지원자가 결정되어 모집이 종료되고 프로젝트가 진행되는 상태 (기존 `진행중`을 대체)
  - `매칭보류`: 모집은 종료되었지만 지원자가 아직 결정되지 않은 상태 (기존 `완료`를 대체 — 내부 DB 값은 `unmatched`를 그대로 사용)
  - 기존 `초안(draft)` / `취소(cancelled)`는 폐지됨 — 프로젝트 등록 시 바로 `모집중`으로 생성되며(임시저장 없음), 취소가 필요한 경우는 상태 변경이 아닌 **삭제**로 처리

**자동 상태 전환** (2026-07-06 추가)
- 프로젝트 소유자가 지원자를 **승인(approved)** 처리하는 즉시 → 프로젝트 상태 자동으로 `매칭성공` 전환하고, 같은 프로젝트의 승인되지 않은 나머지 지원서는 전부 자동으로 `거절(rejected)` 처리 (`updateApplicationStatus`, `partnerProjectController.ts`)
- `매칭성공` 상태에서 그 승인을 취소(거절/보류/검토중으로 재변경)했을 때, 해당 프로젝트에 승인된 지원자가 더 이상 없으면 → 마감일이 남아있으면 `모집중`, 마감일이 지났으면 `매칭보류`로 자동 복구 (`updateApplicationStatus`, `partnerProjectController.ts`)
- 매시간 배치 작업(`apps/api/src/jobs/closeExpiredProjects.ts`, 서버 시작 시 1회 + 이후 1시간마다)이 `모집중` 상태이면서 `applicationDeadline`이 지난 프로젝트를 검사 → 승인된 지원자가 있으면 `매칭성공`, 없으면 `매칭보류`로 자동 전환
- `매칭보류` 상태의 프로젝트를 소유자가 `applicationDeadline`을 미래 날짜로 수정하면 → 상태가 `모집중`으로 자동 전환 (`updateProject`, `partnerProjectController.ts`). `매칭성공`은 이미 지원자가 승인된 상태이므로 마감일을 바꿔도 전환되지 않음

**마감 후 승인/거절 제한** (2026-07-07 추가)
- `applicationDeadline`이 지난 프로젝트는 아직 결정되지 않은(현재 상태가 `approved`가 아닌) 지원서를 새로 승인/거절할 수 없음 — 지원자 목록 화면(`ProjectsApplicantsView.tsx`)의 승인/거절 버튼이 비활성화되고, API(`updateApplicationStatus`)도 동일 조건으로 400 응답 처리
- 단, 이미 `매칭성공`된 지원서의 승인을 취소(거절/보류/검토중으로 재변경)하는 것은 마감 여부와 무관하게 계속 허용 — 위 자동 복구 로직(`매칭보류`/`모집중` 전환)이 계속 동작해야 하기 때문

**관리자 권한 제한** (2026-07-06 변경)
- 상태(매칭) 전환은 위 자동 로직으로만 이루어지며, **관리자는 프로젝트 상태를 수동으로 변경할 수 없음** — 관리자 페이지의 "관리" 컬럼(상태 변경 드롭다운 + 삭제 버튼)은 폐지되고 **"바로보기"**(새 창으로 프로젝트 상세 페이지 열람)로 대체됨
- **관리자는 파트너사가 등록한 살아있는 프로젝트를 직접 삭제할 수 없음** — 삭제는 프로젝트 소유자(파트너) 본인만 가능 (`DELETE /partner/projects/:id`)
- 단, 이미 삭제된 프로젝트(삭제 로그)에 대한 **조회·복구·완전삭제**는 관리자 권한으로 계속 가능 — 이는 살아있는 프로젝트에 대한 매칭/삭제 권한이 아니라 사후 복구/정리 기능이므로 별개로 유지

- 삭제(프로젝트 소유자 본인) 시 목록에서 제거되고 `PartnerProjectDeletionLog`에 스냅샷 기록
- 삭제된 프로젝트는 **삭제된 프로젝트** 탭(`/admin/partner-topics/deleted`, 파트너라운지 관리 하위)에서 조회 — `GameDeletionLog`/탈퇴 회원 복구와 동일한 패턴 (삭제 시 스냅샷 저장 → 복구 시 스냅샷으로 재생성 → `restoredAt` 기록)

| 액션 | 필요 등급 | 엔드포인트 |
|------|---------|-----------|
| 프로젝트 목록/지원자 조회 (읽기 전용) | 모든 관리자 | `GET /admin/partner/projects`, `GET /admin/partner/projects/:id/applicants` |
| 삭제된 프로젝트 목록 조회 | normal+ | `GET /admin/partner/projects/deleted` |
| 프로젝트 삭제 (소유자 본인만) | 로그인 파트너 | `DELETE /partner/projects/:id` |
| 프로젝트 복구 | super | `POST /admin/partner/projects/deleted/:id/restore` |
| 삭제 로그 완전 삭제 | super | `DELETE /admin/partner/projects/deleted/:id` |

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
