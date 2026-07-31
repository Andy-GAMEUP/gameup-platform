# GameUp 플랫폼 운영 규칙

> 작성일: 2026-06-19 / 최종 수정: 2026-07-24  
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

#### 사업 형태(companyType) 수정

- 승인된 기업회원 대표 계정은 **파트너 라운지 프로필 > 소개 수정** 화면에서 `사업 형태`를 언제든 재설정할 수 있다 (`PATCH /api/users/company-type`)
- 재신청(`reapply`)과 달리 `approvalStatus`를 변경하지 않으며, `companyInfo.companyType`만 갱신된다
- 팀원 계정은 수정 불가 (대표 계정 본인만 가능)
- **가입/재신청과 달리 이 수정 화면에서는 최소 선택 개수 제한이 없다** (전체 해제하여 빈 배열로 저장 가능)

#### 기업 유형(companyCategory) 관리자 수정

- 가입 시 선택한 `companyCategory`(개발사/파트너)가 잘못 분류된 경우, **어드민(normal 이상) > 회원관리 > 기업회원** 목록의 "기업 유형" 컬럼에서 "변경" 버튼으로 되돌릴 수 있다 (`PATCH /api/admin/users-enhanced/:id`)
- 이 API는 전달된 `companyInfo` 필드만 병합 적용하므로, 회사명·사업자번호·사업 형태 등 다른 기업 정보는 유지된다
- 개발사 ↔ 파트너 전환은 접근 가능한 기능이 바뀌는 중요한 변경이므로 `ConfirmModal` 확인 팝업을 거친다

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

> 최종 업데이트: 2026-07-24

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

**지원서 상태값과 최종 결정** (2026-07-24 도입, 2026-07-27 전면 개편 — 승인 2단계 폐지)
- 지원서 상태값: `pending(검토중)` / `approved(협의 중, 레거시)` / `on-hold(보류중)` / `rejected(거절)` / `confirmed(확정)` 5가지
- **승인(approved) 단계는 수동 승인 버튼으로는 폐지됨** — 예전에는 지원자를 먼저 "승인"해야 메시지를 보내고 대화 후 확정할 수 있었지만(2026-07-24 도입), 이 중간 단계를 없애고 **pending 상태에서 바로 메시지 발신 → 확정**이 가능하도록 단순화함(2026-07-27)
- **첫 메시지 발신 시 pending → approved 자동 전환(2026-07-27 추가)** — `sendApplicationMessage`에서 지원서 상태가 아직 `pending`이면 메시지 생성과 함께 자동으로 `approved`("협의 중")로 바뀜. 수동 승인 버튼은 없지만, 대화가 시작됐다는 사실 자체가 "협의 중" 상태를 나타냄. 이미 `on-hold`/`rejected`/`confirmed`인 지원서는 건드리지 않음
- **거절(rejected)과 확정(confirmed)은 둘 다 영구적인 최종 결정** — 한 번 거절되거나 확정되면 어떤 상태로도 다시 바꿀 수 없음(`updateApplicationStatus`가 대상 지원서가 이미 `rejected` 또는 `confirmed`면 무조건 400 응답). 지원자 목록 화면에서도 해당 행의 확정/거절 버튼이 영구 비활성화됨
- **확정(confirmed)**: 지원자 목록에 별도 "확정" 컬럼은 없음 — "협의 하기" 버튼으로 여는 메시지 팝업(`MessageComposeModal`) 안의 "매칭 확정" 버튼으로 처리(§9.7 참고). 그 지원자와 주고받은 메시지가 하나라도 있어야 활성화됨(승인 단계가 없어졌으므로 "대화가 있었는지"가 확정 가능 조건). 클릭 시 `ConfirmModal`로 재확인 후 처리
- **확정(confirmed) 처리 시 자동 처리** (`updateApplicationStatus`, `partnerProjectController.ts`):
  - 같은 프로젝트의 아직 최종 결정(거절/확정) 안 된 다른 지원서 전부 자동으로 `거절(rejected)` 처리
  - 프로젝트 상태 자동으로 `매칭성공`으로 전환 (확정이 영구적이므로 이후 다시 `모집중`/`매칭보류`로 되돌아가지 않음)
- 매시간 배치 작업(`apps/api/src/jobs/closeExpiredProjects.ts`, 서버 시작 시 1회 + 이후 1시간마다)이 `모집중` 상태이면서 `applicationDeadline`이 지난 프로젝트를 검사 → **확정된** 지원자가 있으면 `매칭성공`, 없으면 `매칭보류`로 자동 전환
- `매칭보류` 상태의 프로젝트를 소유자가 `applicationDeadline`을 미래 날짜로 수정하면 → 상태가 `모집중`으로 자동 전환 (`updateProject`, `partnerProjectController.ts`). `매칭성공`은 이미 지원자가 확정된 상태이므로 마감일을 바꿔도 전환되지 않음

**마감 후 거절/확정 제한** (2026-07-07 도입, 2026-07-27 승인 폐지 반영해 갱신)
- `applicationDeadline`이 지난 프로젝트는 아직 확정되지 않은 지원서를 새로 거절할 수 없음 — 지원자 목록 화면(`ProjectsApplicantsView.tsx`)의 거절 버튼이 비활성화되고, API(`updateApplicationStatus`)도 동일 조건으로 400 응답 처리
- **확정(confirmed) 처리 자체는 마감 여부와 무관하게 항상 허용** — 모집은 마감됐어도 이미 대화해둔 후보들 중 최종 1곳을 고르는 절차이기 때문
- **마감된 프로젝트의 미결(pending/approved) 지원 건은 지원자 목록의 "진행 상태" 컬럼(구 "결정")이 상태 배지 대신 "마감"으로 표시되고, "협의 하기" 버튼도 비활성화됨**(프론트 전용 표시 변경 — API 차단은 아님) — 이미 `확정`/`거절`로 최종 결정된 건은 그 결과를 그대로 보여줘야 하므로 이 표시 변경에서 제외됨

**지원 취소 및 재지원** (2026-07-27 추가)
- 지원자 본인은 본인 채널의 **내가 한 지원** 탭에서 "취소" 버튼으로 자신의 지원서를 언제든 취소할 수 있음(단, `confirmed` 상태는 취소 불가) — 취소 시 지원서 자체가 삭제되고(`DELETE /partner/applications/:appId`) 프로젝트 `applicantCount`가 차감됨
- 지원서 존재 여부(상태 무관, 거절된 것 포함)만으로 재지원을 막기 때문에(`{projectId, applicantId}` unique index), **거절당한 지원자가 같은 프로젝트에 다시 지원하려면 먼저 본인이 그 지원서를 "취소"해야 함** — 취소 후에는 제한 없이 재지원 가능
- 프로젝트 상세 페이지는 로그인 사용자의 지원 여부(`hasApplied`)를 `GET /partner/projects/:id` 응답에 함께 내려주며, 이미 지원 중이면 "지원하기" 버튼이 "지원완료"로 비활성화됨

**지원서 제목/내용 열람** (2026-07-24 추가)
- 지원 시 applicant가 작성한 제목/내용은 프로젝트 소유자의 **채널 관리 > 프로젝트 활동 > 지원자 목록**(`ProjectsApplicantsView.tsx`)에서 "지원서" 컬럼의 "보기" 버튼으로 확인 가능 (관리자 화면 `/admin/partner-topics`에서는 기존부터 노출)
- 지원자 본인의 **내가 한 지원** 화면(`ProjectsApplicationsView.tsx`)에는 아직 제목/내용이 노출되지 않음 — 필요 시 추후 추가

**지원 기업명 → 파트너 채널 링크(2026-07-27 추가)**
- 지원자 목록의 "지원 기업명"에 해당 지원자가 **승인된(status=approved) 파트너 채널**을 갖고 있으면 클릭 시 새 탭에서 그 회사의 `/partner/:id` 채널 페이지로 이동. 채널이 없거나 미승인이면 그냥 텍스트(링크 아님)
- `getMyProjectApplicants`(`GET /partner/projects/applicants/me`)가 지원자 userId로 `Partner`를 조회해 `applicantId.partnerChannelId`를 붙여서 내려줌

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

### 9.6 파트너 프로필 페이지 구조 (미니홈 흡수, 2026-07-24 개편)

> 파트너 매칭에 필요한 프로필 정보(소개, 포트폴리오, 연혁, 보유 기술, 연락처, 게임 목록)가 별도의 미니홈(MiniHome) 컬렉션과 파트너(Partner) 컬렉션으로 나뉘어 있던 것을 **Partner 컬렉션으로 흡수 통합**. MiniHome 컬렉션 자체는 삭제하지 않으며(뉴스피드/제안함/공개 미니홈 디렉토리는 계속 MiniHome 사용), 1회성 마이그레이션 스크립트(`scripts/merge-minihome-into-partner.ts`)로 데이터를 이관함.

- Partner 모델에 확장 필드 추가: `displayNameOverride`, `coverImage`, `website`, `tags`, `keywords`, `hourlyRate`, `location`, `isVerified`, `rating`, `reviewCount`, `portfolio[]`, `history[]`, `skills[]`, `contactEmail`, `contactPhone`, `representativeGameId`
- 폐지된 필드: `activityPlan`(활동 계획), `availability`(활동 가능 여부) — 정리 스크립트(`apps/api/src/scripts/cleanup-partner-experience-fields.ts`)로 구필드 제거
- 공개 프로필은 `/partner/:id` 하위 탭으로 재구성: **파트너 홈**(`/partner/:id`) / **회사 연혁**(`/history`) / **보유 기술**(`/skills`) / **개발 게임**(`/games`, 개발사 유형만 노출) / **포트폴리오**(`/portfolio`) / **등록 프로젝트**(`/posts`)
- 소유자 전용 관리 기능은 `/partner/:id/manage` 하위로 통합: **프로젝트 활동**(`/manage/projects`, **지원자 목록 / 내가 한 지원** 2탭) / **팀원 관리**(`/manage/team`) — 소유자가 아니면 접근 불가
- **"등록 프로젝트" 탭과 "받은 메시지" 탭은 폐지됨 (2026-07-27, §9.7 참고)** — 등록한 프로젝트는 공개 프로필의 **등록 프로젝트**(`/partner/:id/posts`) 탭에서 보고, 메시지는 별도 편지함 화면 없이 지원자 목록·내가 한 지원의 **"협의 하기"** 버튼으로만 주고받는다
- 기존 `/plan`(활동계획), `/topics`(토픽), `/team`·`/projects`·`/projects/applicants`·`/projects/applications`(구 경로) 라우트는 전부 폐지되고 위 신규 구조로 대체됨
- 독립 운영되던 `/minihome-manage` 화면은 폐지되고 파트너 프로필 관리로 완전히 흡수됨

### 9.7 파트너 쪽지(메시지)

> 파트너 채널 간 1:1 쪽지 기능. **2026-07-27 전면 개편**: 승인(approved) 게이트를 없애고, 메시지 발신/수신·히스토리 열람·매칭 확정을 전부 지원자 목록·내가 한 지원의 **"협의 하기"** 버튼 하나(`MessageComposeModal`)로 통합. 별도의 "받은 메시지" 편지함 탭 자체가 폐지됨(9.6절 참고).

**메시지 발신 조건 (2026-07-27 변경)**
- 지원서 상태와 무관하게(`pending`/`rejected` 포함) 프로젝트 소유자와 지원자는 언제든 서로 메시지를 보낼 수 있음 — 과거의 "매칭승인/확정 상태에서만 발신 가능" 제한(2026-07-24 도입)은 폐지됨
- 발신 위치: 소유자는 **채널 관리 > 프로젝트 활동 > 지원자 목록**의 "협의 하기" 컬럼, 지원자는 본인 채널의 **내가 한 지원** 탭의 "협의 하기" 컬럼 — 둘 다 클릭 시 공용 `MessageComposeModal`(작성 + 히스토리 보기 토글)이 뜨며, `ProjectApplication._id` 기준으로 상대를 특정해 발신(`POST /partner/applications/:appId/message`). 히스토리 조회(`GET /partner/applications/:appId/messages`)도 같은 지원 건 기준 — 같은 회사와 다른 프로젝트에서 나눈 무관한 대화가 섞이지 않도록 상대방(counterpart) 기준이 아니라 일부러 지원 건 기준으로 스코프함
- 버튼은 이미 대화가 있었는지 여부와 무관하게 항상 새 메시지 작성 모달을 띄움(예전의 "대화 중" 링크/받은 메시지 탭으로의 자동 이동은 폐지) — 이전 대화 확인은 모달 안의 "히스토리 보기" 토글로 함
- 파트너 찾기(`/partner/directory`) 목록의 "연락하기" 버튼 및 파트너 채널 아무 곳에나 보낼 수 있던 범용 발신 API(`POST /partner/:partnerId/messages`)는 이미 폐지된 상태(2026-07-24)이며 그대로 유지
- 본인에게는 메시지를 보낼 수 없음 (프로젝트 소유자가 자기 프로젝트에 지원하는 경우는 애초에 발생하지 않음)
- **이메일/전화번호 등 연락처 포함 메시지는 차단됨(2026-07-27 추가)** — `containsContactInfo`(`apps/api/src/utils/contactInfoFilter.ts`)가 이메일 형식 또는 전화번호 형식(구분자 있는/없는 9~12자리 숫자열)을 감지하면 400으로 거부. `sendApplicationMessage`와 (더 이상 프론트에서 안 쓰지만 남아있는) `replyToPartnerMessage` 둘 다 적용. 메시지 작성 입력창 placeholder에도 "이메일 주소, 전화 번호 등을 보내지 못할 수 있습니다." 안내 문구 표시
- **지원자는 먼저 대화를 시작할 수 없음(2026-07-27 추가)** — 프로젝트 소유자와 지원자 사이에 주고받은 메시지가 하나도 없으면 지원자 쪽 발신은 403으로 차단됨(`sendApplicationMessage`, 이 지원 건뿐 아니라 두 사람 사이 전체 메시지 기준). 소유자가 먼저 연락한 뒤에만 지원자가 답할 수 있음. 프론트에서는 "내가 한 지원" 탭의 협의 하기 버튼이 대화가 없을 땐 클릭 불가한 "기다리는 중"(시계 아이콘)으로 표시되고, 소유자 쪽은 이 제한이 없어 "협의 시작" 버튼이 항상 활성화됨
- **거절된 지원 건은 지원자 쪽에서 더 이상 협의 불가(2026-07-27 추가)** — `application.status === 'rejected'`면 지원자 쪽 발신은 403으로 차단(`sendApplicationMessage`). "내가 한 지원" 탭에서 협의 하기 버튼이 X 아이콘의 "거절됨"(빨간 톤, 클릭 불가)으로 바뀜. 소유자 쪽은 이 제한이 없어 거절 후에도 계속 메시지를 보낼 수 있음(예: 정중한 안내 메시지)

**협의 하기 버튼의 우편 아이콘 & 안읽음 배지 (2026-07-27 추가)**
- "협의 하기" 버튼은 텍스트 대신 그 상대와의 대화 방향에 따라 3가지 우편 아이콘 중 하나를 보여줌: 대화 없음(`Mail`) / 내가 마지막으로 보내고 아직 답장 없음(`MailCheck`) / 상대가 마지막으로 보냄(`MailOpen`) — `mailButtonState.ts`의 `getMailButtonState`로 계산
- **안읽음 배지(작은 빨간 점)는 이제 이 우편 아이콘 위(오른쪽 상단)에만 표시됨** — 상대가 보낸 최신 메시지를 아직 "본 것"으로 표시하지 않았을 때만 뜸. 예전에 받은 메시지 탭 카드마다 뜨던 "NEW" 배지는 폐지됨(대신 아래 참고)
- 협의 하기 버튼을 클릭해 모달을 열면(또는 그 지원 건을 거절/확정 처리하면) 그 상대의 안읽음 상태가 즉시 "본 것"으로 처리됨(`markMessageSeen`, `ProjectsApplicantsView.tsx`/`ProjectsApplicationsView.tsx`) — `localStorage` 키(`partnerMessageCardSeen:{partnerId}`)에 기록되므로 지원자 목록/내가 한 지원 등 같은 상대를 표시하는 다른 화면에도 즉시 반영됨

**"받은 메시지" 편지함 탭 자체가 폐지됨 (2026-07-27 변경)**
- 전용 편지함 화면(`ReceivedMessagesSection.tsx`)이 삭제되어, 메시지 열람은 오직 "협의 하기" 버튼으로 여는 `MessageComposeModal` 안(작성 / 히스토리 보기 두 화면)에서만 이뤄짐 — 답장 작성, 프로필 보기 등 편지함 화면에 있던 다른 기능은 없음
- **매칭 확정도 이 모달 안에 있음** — 지원자 목록 테이블에 별도 "확정" 컬럼은 없고, 협의 하기 버튼을 눌러 뜨는 모달의 작성 화면 하단 왼쪽에 "매칭 확정" 버튼이 있음. 그 지원자와 주고받은 메시지가 하나라도 있어야 활성화됨(9.5절 참고). **프로젝트를 등록한 소유자(파트너) 쪽에만 노출** — 지원자 본인의 "내가 한 지원" 화면의 협의 하기 팝업에는 이 버튼이 뜨지 않음(`MessageComposeModal`의 `confirmMatch` prop을 소유자 쪽 화면에서만 넘김)

**매칭 확정 시 연락처 상호 공개 (2026-07-27 추가)**
- 매칭 확정(confirmed) 순간, 지원자 목록에서 "매칭 확정"을 누른 소유자에게는 그 지원자의 회사명/이메일/연락처를 담은 "매칭이 확정됐습니다. 연락해 보세요" 팝업이 자동으로 뜸 — 값은 지원 시점에 지원서(`ProjectApplication.applicantName/email/phone`)에 스냅샷으로 저장돼 있던 걸 그대로 사용(추가 조회 없음)
- 확정된 지원 건은 지원자 목록/내가 한 지원 양쪽 모두 "협의 하기" 버튼이 연락처 아이콘(`Contact`)의 "연락처 열람" 버튼으로 바뀌어, 이후 언제든 다시 눌러서 상대 연락처를 볼 수 있음
- **지원자 쪽에서 보는 프로젝트 소유자의 이메일/연락처는 확정 전에는 절대 노출되지 않음** — `getMyApplications`(`GET /partner/applications/me`)가 지원서 상태가 `confirmed`가 아니면 응답에서 `projectId.ownerId.email`/`companyInfo.phone`/`contactPerson`을 서버에서 지워서 내려보냄. 반대 방향(지원자의 연락처를 소유자가 보는 것)은 지원 시점에 이미 지원서에 스냅샷된 정보라 예전부터 상태와 무관하게 노출되어 있었음(변경 없음)
- "내가 한 지원"에서 매칭이 확정되면 프로젝트명 옆에 "매칭을 축하드립니다!" 배지(2줄, NEW 배지와 같은 스타일)가 뜨고, 한 번 보면 다시 안 뜸(`partnerApplicationConfirmedSeen:{partnerId}` localStorage 키로 seen 처리)

**데이터 모델 및 안읽음 계산**
- 데이터 모델: `PartnerMessage`(개별 메시지, `rootId`로 대화를 묶음) + `PartnerMessageThread`(대화별 상태 문서, `rootId` 기준 1개) — "협의 하기"로 메시지를 보낼 때마다 매번 새 `rootId`(자기참조)로 독립된 대화가 시작됨
- 편지함 UI는 없어졌지만 `GET /partner/messages/received`(`getReceivedMessages`, `isOutgoing`으로 내가 보낸 것도 구분해서 반환)는 여전히 호출됨 — 그 상대와 주고받은 **모든** 메시지(여러 rootId 통합, 발신 방향 무관)를 받아와 두 가지 계산에만 씀:
  1. `mailButtonState.ts`의 `getMailButtonState`가 상대별 마지막 발신자를 판단해 "협의 하기" 버튼의 우편 아이콘(Mail/MailCheck/MailOpen) 결정
  2. 지원자 목록·내가 한 지원 탭과 "프로젝트 활동" 사이드바 뱃지의 안읽음 점(`hasUnreadFromApplicants`/`hasUnreadFromOwners`/`hasUnreadMessage`) 계산 — 상대가 보낸 메시지 중 아직 "본 것"(`partnerMessageCardSeen:{partnerId}` localStorage)으로 표시 안 된 게 있으면 켜짐. **상대방이 보낸** 메시지만 기준으로 계산됨(내가 보낸 메시지는 스스로에게 안읽음을 띄우지 않음)
- 대화(rootId) 상태 값(`open`/`closed`/`deleted`)은 스키마에 남아있지만, 이를 바꾸는 "대화 종료/복원/완전삭제" 기능은 UI에서 폐지됨 — 지금은 도달할 화면이 없어 사실상 모든 대화가 `open` 상태로만 존재함
- (레거시, 정리 대상) 대화 종료/복원/완전삭제 API(`POST /partner/messages/thread/:rootId/close|restore|delete`, 프론트 `partnerService.closeMessageThread`/`restoreMessageThread`/`deleteMessageThread`)와 예전 답장 API(`replyToMessage`, `POST /partner/messages/:messageId/reply`)는 "받은 메시지" 탭이 있던 시절의 기능으로, 백엔드/서비스 레이어에는 그대로 남아있지만 지금은 어떤 화면에서도 호출하지 않는 죽은 코드

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
| 파트너 라운지 메시지 수신 (2026-07-27 추가) | `proposal` | 지원 건에 "협의 하기"로 메시지를 보내면 수신자에게 발송 ("파트너 라운지 새 메시지 도착", `sendApplicationMessage`) |
| 매칭 확정 (2026-07-27 추가) | `proposal` | 프로젝트 소유자가 지원자를 확정 처리하면 그 지원자에게 발송 ("매칭이 확정되었습니다", `updateApplicationStatus`) |

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
