# 좌우 스크롤 화살표 동일 적용 규칙

## 규칙

가로로 나열된 카드/배너를 좌우 화살표 버튼으로 넘기는 UI는 사이트 전체에서 전부 같은 화살표 디자인을 쓴다. **화살표 스타일(색상/크기/위치/아이콘) 중 하나를 수정하면, 사용자가 그 자리에서 명시적으로 "이건 다르게 해줘"라고 지정하지 않는 한 — 즉 사용자가 별도로 말하기 전까지는 항상 — 아래 "동일 그룹" 목록의 나머지 전부에도 묻지 않고 동일하게 반영한다.**

- 사용자에게 "다른 곳에도 적용할까요?"라고 되묻지 않는다 — 무조건 전부 동일하게 반영한다.
- 새로 좌우 화살표 스크롤 UI를 추가하면 이 문서의 목록에도 추가한다.
- 기준(원본)은 메인페이지 상단 히어로 배너 캐러셀(`MainBannerCarousel`)과 추천 게임 대형 배너(`RecommendBigBanner`)의 화살표다.

## 현재 화살표 스펙 (2026-09-11 기준)

- 위치: 이미지/카드 영역 좌우 끝, `absolute left-2`/`right-2 top-1/2 -translate-y-1/2`
- 크기: `w-8 h-8`, 원형(`rounded-full`)
- 배경: `bg-black/40`, hover 시 `bg-black/60` (반투명 검정 오버레이 — 카드 색상과 무관하게 항상 동일)
- 아이콘: `ChevronLeft`/`ChevronRight`, `w-5 h-5 text-white`
- 노출 방식: 평소엔 `opacity-0`, 부모에 `group/banner` 지정 후 `group-hover/banner:opacity-100`으로 마우스 오버 시에만 노출
- 그림자(`shadow-*`) 없음, 테두리(`border`) 없음

## 동일 그룹 (좌우 화살표 스크롤을 쓰는 위치)

| 위치 | 파일 / 컴포넌트 |
|------|------|
| 메인페이지 상단 히어로 배너 캐러셀 — 기준 | `apps/web/src/components/pages/MainPage.tsx` `MainBannerCarousel` |
| 메인페이지 추천 게임 대형 배너 — 기준 | `apps/web/src/components/pages/MainPage.tsx` `RecommendBigBanner` |
| 메인페이지 베타존 참가자 모집 | `apps/web/src/components/pages/MainPage.tsx` `BetaZoneRecommendRow` (2026-09-11 통일 반영) |
| 이벤트 배너 캐러셀(홈/베타존/게임목록 공용) | `apps/web/src/components/EventBannerCarousel.tsx` (2026-09-11 통일 반영) |
| 퍼블리싱 소개 페이지 배너 | `apps/web/src/components/pages/PublishingLandingPage.tsx` `BannerCarousel` (2026-09-11 통일 반영) |
| 지원사업 소개 페이지 배너 | `apps/web/src/components/pages/SupportIntroPage.tsx` `BannerCarousel` (2026-09-11 통일 반영) |
| 커뮤니티 홈 탭 배너 롤링 | `apps/web/src/components/pages/CommunityPage.tsx` (이미 기준 스타일과 동일, 변경 없음) |
| 커뮤니티 홈 탭 "신작게임소개" 대형 카드 | `apps/web/src/components/pages/CommunityPage.tsx` (2026-09-11 통일 반영 — `w-9 h-9`+`ring-2 ring-white/70` 제거하고 기준 스타일로 축소) |
| 게임관리 미디어 탭 "게임 스크린샷" 업로드 슬롯 | `apps/web/src/components/pages/GameDetailManagementPage.tsx` `screenshotCard` (2026-09-16 신설 — 4개 슬롯만 한번에 보이고 5번째부터 좌우 화살표로 슬라이드) |

## 이 그룹에서 제외되는 것 (의도적 제외)

- `apps/web/src/components/pages/MainPage.tsx` `HorizontalGameSection` — 좌우 화살표 스크롤 구조 자체는 동일 패턴이지만 실제로 어디에서도 렌더링되지 않는(호출부 없는) 죽은 코드라 그룹 대상에서 제외. 실제로 페이지에 쓰이게 되면 그룹에 편입하고 이 문서도 업데이트한다.
- `apps/web/src/components/community/TrendingCarousel.tsx` — 완성된 좌우 화살표 캐러셀이지만 어디에서도 import되지 않는 죽은 컴포넌트라 제외. 실제로 쓰이게 되면 편입한다.
- 단순 페이지 번호 pagination, 스텝 위저드 "이전/다음", 뒤로가기 화살표, 사이드바 접기/펼치기 버튼 등은 "가로 카드/배너 좌우 넘기기"가 아니므로 이 규칙 대상이 아니다.

## 참고 — 기술 구현 방식

- 위 목록은 전부 `scrollRef` + `scrollBy({ left, behavior: 'smooth' })` 네이티브 스크롤 방식(transform+index 슬라이드 아님)을 쓴다. 새로 추가할 때도 이 방식을 따른다(`apps/web/src/components/pages/MainPage.tsx`의 `BetaZoneRecommendRow` 참고).

## 발견/변경 이력

- 2026-09-11: 사용자가 "좌우 화살표는 하나 수정하면 다른것도 동일하게 수정해서 모든 좌우 스크롤 다 통일시켜 무조건"이라고 명시적으로 요청 — 이 규칙 문서 자체가 그 요청에 따른 것. 베타존 참가자 모집의 화살표를 기존의 다른(밝은 카드색) 스타일에서 히어로 배너/추천 게임 기준 스타일로 교체한 뒤, 사이트 전체를 전수조사해서 나머지 5곳(이벤트 배너 캐러셀, 퍼블리싱/지원사업 소개 페이지 배너, 커뮤니티 신작게임소개)도 동일 스타일로 한 번에 통일함. 죽은 코드 2곳(`HorizontalGameSection`, `TrendingCarousel`)은 실사용 전까지 제외.
