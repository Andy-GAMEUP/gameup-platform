'use client'
import Button from './Button'

interface AlertModalProps {
  isOpen: boolean
  title?: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
}

export default function AlertModal({
  isOpen,
  title,
  message,
  confirmLabel = '확인',
  onConfirm,
}: AlertModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={onConfirm}>
      <div
        className="w-full max-w-sm bg-bg-card border border-line rounded-xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className="text-text-primary font-semibold mb-1.5">{title}</h3>}
        <p className="text-text-secondary text-sm mb-5 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end">
          <Button variant="default" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
