# 커뮤니티 뒤로가기 버튼 규칙

## 범위

**이 문서는 커뮤니티(`/community/*`) 화면의 "← 뒤로가기" 버튼만 다룬다.** 관리자/파트너/퍼블리싱/지원 화면 등 다른 도메인의 뒤로가기 버튼은 2026-08-14 조사에서 스타일·동작이 제각각인 게 확인됐지만(아이콘 크기, 텍스트 크기, `router.back()` vs `<Link>` 혼용, 일부 페이지는 텍스트가 클릭 영역 밖에 있는 등), **사용자가 "일단 커뮤니티만 하자"고 범위를 좁혀서 이번 라운드에서는 건드리지 않았다.** 나중에 그쪽도 정리하게 되면 이 문서와 같은 방식으로 별도 문서를 만든다(예: `docs/admin-back-button-consistency-rule.md`).

## 규칙

**커뮤니티 상세/작성 화면의 뒤로가기 버튼은 항상 아래 형태를 그대로 재사용한다:**

```tsx
<button onClick={() => fromHref ? router.push(fromHref) : router.back()} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-base mb-5 transition-colors">
  <ArrowLeft className="w-4 h-4" /> {fromLabel}
</button>
```

핵심 설계 (2026-08-14 변경): **라벨(`from`)과 실제 이동 목적지(`fromHref`)는 반드시 같은 곳을 가리켜야 한다.** 처음엔 "라벨은 텍스트일 뿐, 실제 이동은 항상 `router.back()`"으로 설계했는데, 메인페이지에서 들어온 경우 라벨은 "자유게시판" 등으로 정확히 바뀌었는데도 실제 클릭 시 브라우저 히스토리상 진짜 이전 페이지(메인)로 가버려서 사용자가 "텍스트만 바뀌었지 실제로는 다 메인으로 가는데?"라고 지적함 — 라벨과 실제 동작이 다르면 그 자체로 버그다. 그래서 각 링크 생성 지점에서 `fromHref` 쿼리 파라미터(그 글/공지가 실제로 속한 탭의 URL, 예: `/community?channel=free`)를 **반드시 같이 넘기고**, 상세 페이지는 `fromHref`가 있으면 그쪽으로 `router.push`, 없으면(방어적 폴백) `router.back()`을 쓴다.

- `fromHref` 생성은 `PostCard.tsx`에서 export하는 `communityTabHref(channel, gameId?)` 헬퍼를 그대로 쓴다 (`/community?channel=...&gameId=...&gameTitle=...&gameServiceType=...` 형태로 조립).
- 게시물(`PostCard.tsx`)은 `post.channel`/`post.gameId`로 자동 계산되므로 별도로 넘길 필요 없음.
- 공지(플랫폼/게임)는 링크를 생성하는 쪽(`CommunityPage.tsx`, `MainPage.tsx`)에서 `communityTabHref('notice-platform')` / `communityTabHref('notice-game')` / (특정 게임 공지 목록이면) `communityTabHref('notice-game', {_id, title, serviceType})`를 직접 만들어 넘긴다.
- **게임에 속한 글/공지는 부모 카테고리가 아니라 그 게임의 "자녀 탭"으로 가야 한다** (2026-08-14): 게시물이나 게임 공지가 특정 게임(`gameId`/`game`)에 속해 있으면, 라벨과 `fromHref` 둘 다 그 게임 이름 + `gameId`를 써야 한다 — 부모 카테고리(예: "라이브게임", "게임 공지")로 뭉뚱그리면 안 된다. 게임이 없는 글/공지만 부모 카테고리 라벨로 폴백한다.
  - 게시물: `PostCard.tsx`의 `backLabel = fromLabel ?? post.gameId?.title ?? ch.label` (게임 있으면 게임명 우선).
  - 게임 공지: `CommunityPage.tsx`의 `gameNoticeNav(n)` 헬퍼(`n.game?.title ?? '게임 공지'` + `communityTabHref('notice-game', n.game ?? undefined)`)를 재사용한다 — 게임별 공지사항이 나오는 모든 위치(홈 탭 위젯, 게임 공지 탭 대형/리스트 뷰)에서 이 헬퍼로 통일했다.
  - 커스텀 마크업(“인기글” 위젯처럼 `PostCard`를 안 쓰고 직접 `<li>`를 그리는 곳)도 동일 원칙 적용: `MainPage.tsx`/`CommunityPage.tsx` 홈 탭 인기글 위젯은 `p.gameId?.title ?? CHANNEL_MAP[p.channel].label`로 라벨을 계산한다.

## 동일 그룹 (전부 위 스타일 그대로 사용 중, 2026-08-14 확인)

| 파일 | 라벨 소스 |
|------|-----------|
| `apps/web/src/components/pages/AnnouncementDetailPage.tsx` | `searchParams.get('from') ?? '커뮤니티'` |
| `apps/web/src/components/pages/CommunityPostPage.tsx` | `searchParams.get('from') ?? '커뮤니티'` |
| `apps/web/src/components/pages/GameAnnouncementDetailPage.tsx` | `searchParams.get('from') ?? '커뮤니티'` |
| `apps/web/src/components/pages/CommunityWritePage.tsx` | 고정 텍스트 "커뮤니티로 돌아가기" (진입 경로가 항상 커뮤니티라 `from` 불필요) |

## `from`/`fromHref` 파라미터를 넘기는 쪽의 규칙

`/community/{postId}`, `/community/announcement/{id}`, `/community/game-announcement/{id}`로 이동하는 링크를 새로 추가할 때는 **`from`(라벨)과 `fromHref`(실제 이동 목적지 URL)를 항상 같이 넣는다** (`?from=${encodeURIComponent(라벨)}&fromHref=${encodeURIComponent(communityTabHref(...))}`). 기본값(`from` 없으면 `'커뮤니티'`, `fromHref` 없으면 `router.back()`)에만 의존하지 않는다 — 기본값은 안전망이지, "정확히 안 넘겨도 되는 핑계"가 아니다.

- 게시물 카드(`PostCard.tsx`)는 `postBackNav(post)` 헬퍼(`PostCard.tsx`에서 export)로 라벨/`fromHref`를 자동 계산 — 새로 게시물 카드를 쓰는 화면을 추가할 때도 `fromLabel` 프롭을 최대한 명시적으로 넘긴다.
- **버그 수정 (2026-08-18)**: `postBackNav`는 `post.gameId`가 있어도 **`post.channel`이 `beta-game`/`live-game`일 때만** gameId를 사용한다. 그 전에는 채널과 무관하게 gameId만 있으면 무조건 게임 자녀 탭으로 보냈는데, 신작게임소개 글에 "관련 게임"을 태그하는 기능이 추가되면서 `channel=new-game-intro`인데 `gameId`도 있는 글이 생겼고, 그 글로 들어갔다 나오면 사이드바에서 "신작게임소개"(채널 일치)와 "라이브게임 > 그 게임"(gameId의 serviceType 일치)이 **동시에 강조되는 버그**가 생겼음. 원인은 사이드바 강조 로직(`isCategoryActive`)이 채널 일치와 "지금 보고 있는 게임의 serviceType 일치" 두 조건을 OR로 판단하기 때문 — 둘 다 동시에 참이 될 수 있는 URL(`channel=new-game-intro&gameId=...`)이 나오면 항상 이 문제가 생긴다. **원칙**: gameId는 그 채널이 진짜로 게임별 자녀 탭 구조를 가진 채널(베타게임/라이브게임)일 때만 네비게이션에 사용하고, 그 외 채널(자유게시판/신작게임소개/공지)의 "관련 게임 태그"는 뒤로가기 목적지에 절대 반영하지 않는다 — 그 글의 진짜 소속 탭(채널)으로만 돌아간다.
- **원칙: `from`/`fromHref`는 "메인/홈" 같은 진입 페이지가 아니라, 그 게시물/공지가 실제로 속한 탭이어야 한다.** 메인페이지에서 클릭해서 들어왔어도, 뒤로가기는 "메인"이 아니라 그 글이 속한 탭(자유게시판/베타게임/라이브게임/게임업 공지 등)으로 실제로 이동한다 — 라벨과 실제 목적지가 항상 일치해야 하기 때문(2026-08-14, 처음엔 라벨만 `from=메인`→`from=게임업 공지`로 고쳤다가, 실제 클릭 시 여전히 `router.back()`이라 메인으로 가버리는 걸 사용자가 지적해서 `fromHref`+`router.push`로 재정정).
- **2026-08-14에 발견해서 고친 버그 1**: `MainPage.tsx`의 "커뮤니티 공지" 위젯 링크에 `from`이 아예 빠져 있었다.
- **2026-08-14에 발견해서 고친 버그 2 (더 근본적)**: `from` 라벨만 고치고 실제 이동은 여전히 `router.back()`이라, 라벨과 실제 목적지가 달랐다 — 라벨은 텍스트일 뿐이라는 최초 설계 자체가 틀렸음. `fromHref` + `router.push(fromHref)`로 라벨=실제 목적지를 강제하도록 전면 수정.

## 새 화면을 추가할 때

- 커뮤니티 상세 화면을 새로 만들면 이 문서의 표에 있는 파일들과 동일한 버튼 마크업(`fromHref ? router.push(fromHref) : router.back()`)을 그대로 복사해서 쓴다.
- 그 화면으로 들어가는 모든 링크(리스트/카드/위젯 등)에 `from`과 `fromHref`를 빠짐없이 넣었는지 확인하고, 이 문서의 표/목록에도 추가한다.
