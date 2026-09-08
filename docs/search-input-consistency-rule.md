# 검색 입력창 디자인 규칙

## 규칙

**새로 검색 입력창을 만들 때는 무조건 아래 디자인을 그대로 쓴다** — 사용자가 특정 화면을 지목해 "이건 다르게 해줘"라고 명시적으로 말하기 전까지는 예외 없이 이 스타일을 따른다.

## 현재 표준 디자인 (2026-09-07, `AdminPlayerMembersPage.tsx` 기준)

```tsx
<div className="relative w-[35%]">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
  <input
    value={search}
    onChange={e => { setSearch(e.target.value); setPage(1) }}
    placeholder="닉네임 · 이메일 검색..."
    className="w-full bg-bg-secondary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
  />
</div>
```

- **바깥에 카드(`bg-bg-secondary border rounded-xl p-4`)로 한 번 더 감싸지 않는다** — 입력창 하나만 두는 게 표준. 예전엔 입력창을 카드로 한 번 더 감싼 이중 테두리 스타일이었는데, 답답하고 두꺼워 보여서 제거함
- 검색 아이콘 색: `text-text-muted` (연한 회색, 기존 `text-text-secondary`보다 옅음)
- 입력창 배경: `bg-bg-secondary` (기존 `bg-bg-tertiary`보다 밝음)
- placeholder 문구는 검색 가능한 필드를 가운뎃점(`·`)으로 구분 + 말줄임표(`...`)로 끝맺는다 (예: "닉네임 · 이메일 검색...") — 슬래시(`/`)로 구분하지 않는다
- placeholder에는 **실제로 백엔드에서 검색되는 필드만** 나열한다 (검색 안 되는 필드를 placeholder에 적어놓지 않는다 — 예: 회원번호는 백엔드에서 검색 안 되는데 placeholder에 있었던 사례가 있었음)

## 적용 범위

- **새로 만드는 검색 입력창**에는 무조건 이 디자인을 적용
- 기존에 이미 있는 다른 화면의 검색창들(관리자 목록, 기업회원 목록, 커뮤니티, 결제 내역 등 다수)은 **아직 이 디자인으로 일괄 전환하지 않았음** — 사용자가 특정 화면을 지목해서 바꿔달라고 할 때마다 그 화면부터 순차적으로 전환
- 현재 적용된 화면: `apps/web/src/components/pages/AdminPlayerMembersPage.tsx` (게임회원 목록, 2026-09-07)
