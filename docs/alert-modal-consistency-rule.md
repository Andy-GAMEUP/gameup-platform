# 알림(alert) 팝업 통일 규칙

## 규칙

사용자에게 단순히 결과를 알리기만 하는 팝업(저장 완료, 처리 실패 등 "확인" 버튼 하나만 있는 경우)은 브라우저 기본 `alert()`을 쓰지 않고, **`apps/web/src/components/AlertModal.tsx`** 컴포넌트로 통일한다.

- `AlertModal`은 공용 컴포넌트이므로, 하나를 수정하면 **묻지 않고** 이 컴포넌트를 쓰는 나머지 화면 전부에 자동 반영된다 (구조상 저절로 보장됨).
- 새로 저장/실패 알림 팝업을 추가할 때도 `alert()`을 새로 쓰지 않고 `AlertModal`을 재사용한다.
- 기존 코드에서 `alert()`을 발견해도, 사용자가 명시적으로 해당 화면을 지목해 바꿔달라고 하기 전까지는 임의로 전체 교체하지 않는다 (2026-08-19 기준 코드베이스에 78곳의 `alert()`이 남아있음 — 전체 일괄 교체는 아직 요청받지 않음, 사용자가 지목하는 화면 단위로 하나씩 교체).

## `ConfirmModal`과의 관계

- `ConfirmModal.tsx`: "정말 삭제하시겠습니까?" 등 **확인/취소 두 버튼**이 필요한 경우 (`docs/confirm-modal-consistency-rule.md`)
- `AlertModal.tsx`: "저장되었습니다" 등 **확인 버튼 하나**만 있으면 되는 알림인 경우 (이 문서)
- 둘 다 동일한 시각 스타일(`bg-bg-card border border-line rounded-xl shadow-2xl p-5`)을 공유한다.

## 사용법

```tsx
import AlertModal from '@/components/AlertModal'

const [alertMessage, setAlertMessage] = useState<string | null>(null)

// 기존: alert('저장되었습니다.')
setAlertMessage('저장되었습니다.')

<AlertModal
  isOpen={!!alertMessage}
  message={alertMessage || ''}
  onConfirm={() => setAlertMessage(null)}
/>
```

## 적용 현황 (2026-08-19)

- `GameDetailManagementPage.tsx`의 "저장되었습니다." 알림 2곳에 최초 적용.
- 나머지 76곳의 `alert()`은 아직 미적용 상태 — 사용자가 개별 화면을 지목하면 그때 `AlertModal`로 교체.
