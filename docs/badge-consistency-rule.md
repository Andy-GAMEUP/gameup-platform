# 배지(뱃지) 재사용 규칙

## 규칙

**같은 의미(상태/유형/카테고리 등)를 나타내는 배지가 여러 화면에 쓰인다면, 반드시 공용 컴포넌트 하나로 구현한다.** 화면마다 각자 색상 클래스를 하드코딩해서 베끼는 방식은 금지 — 시간이 지나면서 화면별로 조금씩 다른 디자인으로 벌어지기 때문(실제로 2026-08-13 기준, 공지 유형 배지가 커뮤니티 목록/상세/공지 작성 화면 4곳에서 전부 다른 색상·여백·테두리로 벌어져 있었음).

- 배지 하나를 수정하면 **묻지 않고** 같은 배지를 쓰는 나머지 전부에도 자동으로 반영되어야 한다 — 공용 컴포넌트로 만들면 이건 저절로 보장된다.
- 새로 배지를 추가할 때, 이미 같은 개념(예: 공지 유형, 게시글 상태, 회원 등급 등)의 배지가 다른 화면에 있는지 먼저 확인한다. 있으면 그 공용 컴포넌트를 재사용하고, 없으면 새로 만들어서 이 문서의 목록에 추가한다.
- 배지 색상/여백/폰트를 바꾸고 싶으면 그 공용 컴포넌트 파일 하나만 고친다 — 각 화면 파일을 돌아다니며 개별 수정하지 않는다.

## 현재 공용 배지 컴포넌트

| 배지 | 파일 | 의미 | 쓰이는 곳 |
|------|------|------|-----------|
| 베스트 댓글 배지 (인라인) | `apps/web/src/components/community/CommentSection.tsx`의 `CommentBlock` | 댓글 "베스트순" 정렬 시 Wilson Score 1위 댓글(순추천 > 0)에 표시 | `CommentSection`이 커뮤니티 게시글 상세(`CommunityPostPage.tsx`)·관리자 신작게임소개(`AdminCommunityPage.tsx`) 양쪽에서 공유되므로 별도 컴포넌트로 안 뽑아도 이미 공용 — 댓글 UI가 쓰이는 곳이 늘어나면 자동으로 같이 적용됨 |
| `GameApprovalStatusBadge` | `apps/web/src/components/GameApprovalStatusBadge.tsx` | 게임 심사 상태 (초안/심사중/출시 대기/운영 중/심사 거부) — `approvalStatus`+`status`(published 여부)를 받아 판단. 2026-09-10부터 출시(published) 후에도 심사 거부가 아니면 빈 배지 대신 **"운영 중"**을 표시함 — 이전엔 published면 배지 없이 평점(별점)만 보여줬으나, 평점을 빼고 이 배지로 통일함. 색상: `not_submitted`=회색(`text-text-muted`), `pending`/`review`/`approved`/`published`(운영 중)=전부 검은색(`text-text-primary`, pending·review·approved는 pulse 있음, 운영 중은 없음), `rejected`=빨강 | 개발사 게임 관리 카드 목록(`GamesManagementPage.tsx`의 `GameCard`, 라이브존/베타존 탭 공통, 평점 표시 완전히 제거됨), 게임 상세 관리 화면 헤더(`GameDetailManagementPage.tsx`, 제목 옆 "라이브"/"베타" 배지 다음) |
| `InquiryStatusBadge` | `apps/web/src/components/InquiryStatusBadge.tsx` | 문의하기 상태 (오픈/진행 중/문의 종료) | 마이페이지 문의하기 탭(`MyInquiryTab.tsx`, 문의 목록·대화창 헤더), 관리자 문의하기 관리(`AdminInquiriesPage.tsx`, 문의 목록·대화창 헤더) — 처음엔 배지 대신 `[진행 중]` 같은 대괄호 텍스트로 바꿨다가, 다시 배지로 되돌리면서 `NoticeTypeBadge` 색상 포뮬러(`/15` bg + `600`/`dark:300` text + `/40` border)에 맞춰 트렌디하게 재정의함(2026-09-08). `open`=sky, `in_progress`=amber, `closed`=slate (2026-09-08, 관리자 목록에서 활성 카드 배경과 겹쳐 안 보인다는 지적으로 중립 회색→slate로 변경) |
| `OfficialBadge` / `AdminBadge` | `apps/web/src/components/OfficialBadge.tsx` / `AdminBadge.tsx` | 닉네임 옆에 붙는 역할 표시 — 기업회원(개발사)=`OfficialBadge`(에메랄드), 관리자=`AdminBadge`(호박색). 2026-09-09부터 텍스트+pill이 아니라 **같은 체크마크 아이콘(`BadgeCheck`)을 색으로만 구분**하는 방식으로 통일 | 커뮤니티 게시글 카드(`PostCard.tsx`, small/medium/large 전부), 댓글(`CommentSection.tsx`), 게시글 상세(`CommunityPostPage.tsx`), 게임 리뷰·Q&A(`PlayerGameDetailPage.tsx`), 파트너 채널 목록(`PartnerDirectoryPage.tsx`), 메시지함(`MessagesPage.tsx` — 채팅방 목록/헤더), 플랫폼 공지 상세(`AnnouncementDetailPage.tsx`), 게임 공지 상세(`GameAnnouncementDetailPage.tsx`), 파트너 매칭 목록(`PartnerMatchingDirectoryPage.tsx`), 파트너 매칭 프로젝트 문의(`PartnerMatchingProjectDetailPage.tsx`), 파트너 채널 팀원 목록(`partner-profile/TeamSection.tsx`) — **"닉네임이 나오는 모든 곳에 동일 적용" 지시(2026-09-09)로 사이트 전체 조사 후 적용 완료.** 회사명/부서명만 보여주고 개인 닉네임이 아닌 곳(예: `ProjectsApplicantsView.tsx`의 지원자 회사명 표시)은 대상 아님 |

**2026-09-11 삭제**: 공지 유형 배지(`NoticeTypeBadge`, 공지/이벤트/점검/업데이트)는 사용자가 "공지 배찌 기능 삭제해, 입력하는 쪽이랑 나오는거 전부 다"라고 명시 요청하여 기능 자체를 완전히 제거함 — 컴포넌트 파일 삭제, `CommunityPage.tsx`/`MainPage.tsx`/`AnnouncementDetailPage.tsx`/`GameAnnouncementDetailPage.tsx`의 표시, `AnnouncementManager.tsx`(공용 공지 작성 폼)와 `AdminAnnouncementsPage.tsx`(관리자 전용 별도 폼)의 입력 `<select>` 모두 삭제. 백엔드 `Announcement`/`GameAnnouncement` 모델의 `type` 필드 자체는 남아있음(항상 기본값 `notice`로 저장됨, 마이그레이션 안 함) — 프론트엔드에서 더 이상 보여주지도 입력받지도 않을 뿐.

**2026-08-27에 발견해서 고친 누락**: `GameDetailManagementPage.tsx`의 제목 옆 "초안 작성 중"/"심사중"/"출시 대기"/"심사 거부" 배지가 `GamesManagementPage.tsx` 카드 목록의 "• 초안"류 표시와 스타일(필 배경 배지 vs 점+텍스트)·문구("초안 작성 중" vs "초안")가 서로 달랐다. 사용자가 "카드의 초안 텍스트랑 동일하게 맞춰"라고 지적해서 발견 — `GameApprovalStatusBadge` 공용 컴포넌트로 뽑아 양쪽 다 교체함. 디자인은 점(dot, `w-1 h-1 rounded-full`) + `text-[15.6px]` 무배경 텍스트, `not_submitted`=회색(`text-text-muted`), `pending`/`review`=노랑(pulse), `approved`=accent(pulse), `rejected`=빨강 — 카드 목록 쪽 기존 디자인이 기준.

## 예시

"게임 심사 상태 배지 색깔 좀 바꿔줘" 같은 요청을 받으면, `GameApprovalStatusBadge.tsx` 하나만 고치고 끝 — 그 배지를 쓰는 화면 전부 자동으로 같이 바뀐다. 특정 화면 하나만 다르게 해달라는 명시적 요청이 없는 한, 화면별로 분기해서 스타일을 따로 주지 않는다.
