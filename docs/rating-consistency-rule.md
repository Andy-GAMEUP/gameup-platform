# 별점(평점) 디자인 동일 적용 규칙

## 규칙

게임 평점을 별점으로 표시하는 곳은 전부 공용 컴포넌트 `apps/web/src/components/StarRating.tsx` 하나로 구현한다 — 화면마다 별 아이콘/색상을 따로 하드코딩하지 않는다.

- 공용 컴포넌트 하나를 수정하면 **묻지 않고** 같은 컴포넌트를 쓰는 나머지 화면 전부에 자동 반영된다 (공용 컴포넌트 구조상 저절로 보장됨).
- 새로 평점(별점)을 표시하는 화면/카드를 추가할 때는 반드시 `StarRating`을 재사용하고, 이 문서의 목록도 함께 업데이트한다.
- 별점 옆 숫자(평균 평점 값)의 색상/굵기도 항상 통일한다: `text-yellow-400 font-bold`.

## `StarRating` 컴포넌트

`apps/web/src/components/StarRating.tsx`

```tsx
<StarRating value={Math.round(avgRating)} size={3.5} />
```

- `value`: 채워진 별 개수 (0~5, 반올림해서 전달)
- `size`: 별 하나의 한 변 길이를 `size * 4`px로 결정 (기본값 6 → 24px). 카드처럼 작은 공간에서는 `3.5`(14px) 사용.
- `onChange`: 전달하면 클릭/호버로 값을 바꿀 수 있는 입력형 별점이 됨 (리뷰 작성 폼 등). 전달하지 않으면 읽기 전용 표시.
- 채워진 별: `fill-yellow-400 text-yellow-400`
- 빈 별: `fill-text-muted/40` — 2026-09-02, 게임 카드(`bg-bg-tertiary` 배경)에 그대로 재사용했더니 기존 `fill-bg-tertiary` 색이 카드 배경색과 완전히 같아서 별이 안 보이는 문제 발견, 배경에 상관없이 항상 보이도록 `text-muted` 40% 투명도로 교체함. 이 변경으로 기존 사이드바(`이용 등급`/`별점` 카드) 쪽 별도 더 또렷하게 보이도록 개선됨.

## 동일 그룹 (별점을 표시하는 위치)

| 위치 | 파일 | 비고 |
|------|------|------|
| 게임 상세 페이지(`/games/[id]`) 사이드바 "별점" 카드 | `apps/web/src/components/pages/PlayerGameDetailPage.tsx` | 기준(원본) — `avgRating`/`reviewTotal` 표시, `text-yellow-400 font-bold` 숫자 + `(N개 리뷰)` |
| 게임 상세 페이지 리뷰 목록/작성 폼의 별점 입력 | `apps/web/src/components/pages/PlayerGameDetailPage.tsx` | `onChange` 전달해 입력형으로 사용 |
| 베타존 카드 (`/betazone`) | `apps/web/src/components/pages/BetazonePage.tsx` | `game-card-consistency-rule.md`의 게임 카드 그룹과 동일 위치, `size={3.5}` |
| 라이브게임 카드 (`/live_games`) | `apps/web/src/components/pages/LiveGamesPage.tsx` | 위와 동일 |

## 발견/변경 이력

**2026-09-02**:
1. `PlayerGameDetailPage.tsx`에 로컬로만 정의돼 있던 `StarRating` 함수를 `apps/web/src/components/StarRating.tsx`로 분리 — 다른 화면에서도 import해서 쓸 수 있도록 공용화.
2. 베타존/라이브게임 카드의 별점을 기존 `lucide-react`의 `Star` 아이콘 직접 렌더링 방식에서 공용 `StarRating` 컴포넌트로 교체, 숫자 색상도 `text-text-secondary` → `text-yellow-400 font-bold`로 통일 ("평점 디자인이랑 칼라, 밖에 카드에 평점이랑 통일시켜" 요청).
3. 위 통일 과정에서 카드 배경(`bg-bg-tertiary`)과 빈 별 색(`fill-bg-tertiary`)이 같아 별이 안 보이는 문제를 발견 → 컴포넌트 자체의 빈 별 색을 배경 비의존적인 `fill-text-muted/40`으로 수정 (모든 사용처에 자동 반영).
4. 사용자가 "이후에도 평점 어디 들어갈 때 있으면 같은 디자인으로 하나 수정하면 다른 것도 동일하게 수정해" 요청 — 이 규칙 문서 자체가 그 요청에 따른 것 (`badge-consistency-rule.md`, `game-card-consistency-rule.md`와 동일한 패턴).
