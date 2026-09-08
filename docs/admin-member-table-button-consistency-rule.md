# 계정관리 회원 목록 테이블 버튼 동일 적용 규칙

## 규칙

**`계정 관리`** 사이드바 하위의 회원 목록 테이블들(기업회원/게임회원/관리자 등, 회원 상세정보로 이동하는 "보기" 버튼이 있는 테이블) 중 하나의 버튼 스타일을 수정하면, 사용자가 "이건 이쪽만 다르게 해줘"라고 명시적으로 지정하지 않는 한 **묻지 않고 나머지 전부에도 동일하게 적용**한다.

## 현재 스타일 (2026-09-07 기준)

"보기" 버튼(회원 상세정보 `/admin/users-enhanced/:id`로 이동):

```
className="px-3 py-1 rounded-md text-base font-medium bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white transition-colors whitespace-nowrap"
```

- 이전엔 배경이 테이블과 거의 같은 회색(`bg-bg-tertiary` 계열)이라 눈에 잘 안 띄었음 → 파란색 solid 버튼으로 변경, "관리"(slate 계열) 버튼과 색만 다르고 동일한 무게감으로 통일

적용 대상: `AdminPlayerMembersPage.tsx`(게임회원), `AdminMembersPage.tsx`(기업회원), `AdminAdminMembersPage.tsx`(관리자)

## 예외

- "관리" 버튼(slate 계열 solid) 등 다른 액션 버튼은 이 규칙 대상이 아님 — "보기"(상세정보 이동) 버튼에만 적용
- 새로 회원 목록 테이블에 "보기" 버튼을 추가하면 이 문서의 목록도 함께 업데이트한다
