'use client'
import Button from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-bg-card border border-line rounded-xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-text-primary font-semibold mb-1.5">{title}</h3>
        <p className="text-text-secondary text-sm mb-5 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'destructive' : 'default'} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
