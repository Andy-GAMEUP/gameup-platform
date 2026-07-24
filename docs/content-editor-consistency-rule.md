# 게시물 작성용 입력 필드 동일 적용 규칙

## 규칙

아래 "동일 그룹" 목록에 속한 입력 필드(전부 `apps/web/src/components/Editor.tsx` 기반 리치 텍스트 에디터) 중 **하나에 기능을 추가하거나 수정하면, 사용자가 명시적으로 "이건 다르게 해줘"라고 지정하지 않는 한 목록의 나머지 전부에도 동일하게 적용한다.**

- 사용자에게 "다른 곳에도 적용할까요?"라고 되묻지 않는다 — 무조건 전부 동일하게 반영한다.
- 새로 이런 종류의 입력 필드를 추가하는 경우, 이 문서의 목록에도 추가한다.
- 스타일링 클래스(툴바 배치, HTML 렌더링 시 prose 스타일)도 가능한 한 동일하게 유지한다.

## 동일 그룹 (게시물류 콘텐츠 작성 필드)

| 위치 | 파일 | 필드 |
|------|------|------|
| 프로젝트 등록/수정 | `apps/web/src/components/pages/PartnerProjectWritePage.tsx` | 설명 (`description`) |
| 파트너 채널 게시글 작성/수정 | `apps/web/src/components/pages/PartnerPostWritePage.tsx` | 내용 |
| 커뮤니티 글쓰기 | `apps/web/src/components/pages/CommunityWritePage.tsx` | 내용 |
| 내채널 소개 | `apps/web/src/components/pages/partner-profile/IntroSection.tsx` | 소개 (`introduction`) |
| 내채널 활동 계획 | `apps/web/src/components/pages/partner-profile/PlanSection.tsx` | 활동 계획 (`activityPlan`) |
| 내채널 포트폴리오 항목 | `apps/web/src/components/pages/partner-profile/PortfolioSection.tsx` | 항목별 설명 (`description`) |

이미지 업로드는 전부 `partnerService.uploadImages()` / `communityService.uploadImages()` 처럼 각 도메인의 업로드 API를 통해 `/uploads/<도메인>/` 아래 저장하는 방식을 따른다 (커뮤니티는 `communityService`, 파트너 관련은 전부 `partnerService.uploadImages` 재사용).

## 이 그룹에서 제외되는 것 (의도적 제외)

관리자 전용 콘텐츠 편집 화면은 "게시물 작성"과 성격이 달라(운영 공지/약관/배너 등) 기본적으로 이 규칙 대상에서 제외한다. 다만 사용자가 명시적으로 포함하라고 하면 추가한다.

- `apps/web/src/components/pages/AdminPublishingPage.tsx`
- `apps/web/src/components/pages/AdminSupportBannersPage.tsx`
- `apps/web/src/components/pages/AdminTermsPage.tsx`

## 예시

"소개 입력 필드에 이미지 넣는 기능 추가해" 같은 요청을 받으면, 소개뿐 아니라 위 "동일 그룹" 표에 있는 나머지 필드(활동 계획, 프로젝트 설명, 파트너 게시글, 커뮤니티 글쓰기)에도 같은 기능을 자동으로 함께 추가한다.
