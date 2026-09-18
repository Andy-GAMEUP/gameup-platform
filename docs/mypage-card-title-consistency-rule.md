# 마이페이지 카드 제목 통일 규칙

마이페이지(플레이어/기업/관리자) 탭 안에 들어가는 카드들의 "제목" 스타일은 전부 동일하게 맞춘다.

## 확정 스펙

- 폰트: `text-lg font-semibold` (색상은 기본 텍스트 색 그대로, 별도 지정 안 함)
- 아이콘 없음 — 제목 앞에 아이콘을 붙이지 않는다
- 제목 바로 아래 구분선: 제목(+ 우측 버튼이 있으면 그 버튼까지 포함한) 헤더 줄 전체에 `pb-3 border-b border-line`을 적용해 제목 아래 가로선이 카드 폭 전체에 걸치게 한다
- 카드 제목 텍스트는 그 카드가 속한 **탭 이름과 반드시 일치**해야 한다 (예: "계정 정보" 탭 안의 카드도 제목이 "계정 정보"여야 함) — 단, 사용자가 특정 카드는 다르게 하라고 명시적으로 지정하면 예외로 둔다. `MyInquiryTab.tsx`의 카드 제목은 탭 이름("문의하기")과 다른 "나의 문의하기 목록"으로 명시적으로 지정됨(2026-09-09)

### 헤더 마크업 예시 (버튼 있는 경우)

```tsx
<div className="flex items-center justify-between mb-6 pb-3 border-b border-line">
  <h2 className="text-lg font-semibold">계정 정보</h2>
  <button>...</button>
</div>
```

### 헤더 마크업 예시 (버튼 없는 경우)

```tsx
<div className="flex items-center gap-2 mb-6 pb-3 border-b border-line">
  <h2 className="text-lg font-semibold">비밀번호 변경</h2>
</div>
```

## 적용 대상 (동일 그룹)

- `apps/web/src/components/pages/PlayerMyPage.tsx` — 계정 정보 카드, 비밀번호 변경 카드
- `apps/web/src/components/pages/CorporateMyPage.tsx` — 계정 정보 카드, 비밀번호 변경 카드
- `apps/web/src/components/pages/AdminMyPage.tsx` — 계정 정보 카드, 비밀번호 변경 카드
- `apps/web/src/components/MyInquiryTab.tsx` — 문의하기 카드
- `apps/web/src/components/TwoFactorSettings.tsx` — 2단계 인증 (OTP) 카드

하나를 수정하면, 사용자가 명시적으로 다르게 하라고 하지 않는 한 **묻지 않고 위 목록 전부에 동일하게 적용**한다. 새로 마이페이지 카드를 추가하면 이 스펙을 그대로 따르고, 이 문서의 목록도 함께 업데이트한다.

(참고: 계정 삭제 확인 모달, 2단계 인증 해제 확인 모달 등 팝업/모달의 제목은 이 규칙 대상이 아니다 — `docs/confirm-modal-consistency-rule.md`를 따른다.)
