# 확인 팝업 통일 규칙

## 규칙

사용자에게 "정말 진행하시겠습니까?" 같은 확인을 받아야 하는 모든 동작은 브라우저 기본 `window.confirm()` / `confirm()`을 쓰지 않고, **`apps/web/src/components/ConfirmModal.tsx`** 컴포넌트로 통일한다.

- 새로 삭제/종료/복원/승인 등 확인이 필요한 기능을 추가할 때도 반드시 `ConfirmModal`을 사용한다. `window.confirm()`을 새로 추가하지 않는다.
- 기존 코드에서 `window.confirm()` / `confirm()`을 발견하면, 사용자가 명시적으로 다르게 하라고 하지 않는 한 `ConfirmModal`로 교체한다.
- 관리자(Admin), 개발자/게임 포털, 유저(커뮤니티·파트너) 화면 구분 없이 전부 동일하게 적용한다.

## 왜

브라우저 기본 `confirm()`은 상단에 `localhost:3000 내용:` 같은 브라우저 출처 표시가 강제로 붙고, 버튼 모양/문구를 커스터마이징할 수 없어 서비스 디자인과 어울리지 않는다. `ConfirmModal`은 앱의 `Button` 컴포넌트를 재사용해 GameUp 디자인 시스템과 일치하는 확인 팝업을 보여준다.

## ConfirmModal 사용법

```tsx
import ConfirmModal from '@/components/ConfirmModal'

// 컴포넌트 내부
const [confirmTarget, setConfirmTarget] = useState<T | null>(null) // 또는 boolean

<ConfirmModal
  isOpen={!!confirmTarget}
  title="대화 종료"                 // 팝업 제목
  message="이 대화를 종료하시겠습니까? 종료한 대화는 휴지통으로 이동하며, 상대방은 답장을 보낼 수 없게 됩니다."
  confirmLabel="종료"               // 기본값 "확인"
  danger                            // 삭제/종료 등 위험한 동작이면 지정 (확인 버튼이 danger 색상)
  onConfirm={() => {
    // 실제 동작 수행
    doSomething(confirmTarget)
    setConfirmTarget(null)
  }}
  onCancel={() => setConfirmTarget(null)}
/>
```

`window.confirm()`은 동기(synchronous)라서 `if (!confirm(...)) return` 형태로 바로 쓸 수 있었지만, `ConfirmModal`은 React 상태 기반이라 **"확인 대상을 state에 저장 → 모달 오픈 → onConfirm에서 실제 동작 실행"** 형태로 바꿔야 한다. 단순 `if (confirm(...)) doThing()` 형태의 인라인 확인도 동일하게 state 기반으로 전환한다.

## 참고 (2026-07-16 적용 현황)

파트너 라운지 메시지 기능(`ReceivedMessagesSection.tsx`의 "종료" 버튼)에 먼저 샘플로 적용한 뒤, 관리자/개발자/유저 포털 전체의 `window.confirm()` 호출을 이 컴포넌트로 일괄 교체했다.
