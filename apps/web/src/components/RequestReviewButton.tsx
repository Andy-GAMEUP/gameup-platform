'use client'
import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { gameService } from '../services/gameService'

interface Props {
  gameId: string
  gameTitle: string
  approvalStatus: string
  hasSnapshot?: boolean
  onSuccess?: () => void
  size?: 'sm' | 'md' | 'lg' | 'full'
  extraDisabled?: boolean
  extraDisabledTitle?: string | string[]
  onDisabledClick?: () => void
  color?: 'accent' | 'emerald' | 'violet'
}

export default function RequestReviewButton({
  gameId,
  gameTitle,
  approvalStatus,
  hasSnapshot,
  onSuccess,
  size = 'md',
  extraDisabled,
  extraDisabledTitle,
  onDisabledClick,
  color = 'accent',
}: Props) {
  const [requesting, setRequesting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const isUnderReview = approvalStatus === 'pending' || approvalStatus === 'review'
  const isDisabled = requesting || approvalStatus === 'approved' || (!isUnderReview && !!extraDisabled)

  const handleConfirm = async () => {
    setModalOpen(false)
    setRequesting(true)
    try {
      if (isUnderReview) {
        await gameService.cancelReview(gameId)
      } else {
        await gameService.requestReview(gameId)
      }
      onSuccess?.()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || (isUnderReview ? '심사 취소에 실패했습니다.' : '심사 요청에 실패했습니다.'))
    } finally {
      setRequesting(false)
    }
  }

  const smCls = 'flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium rounded-md'
  const mdCls = 'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md'
  const lgCls = 'flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-lg'
  const fullCls = 'w-full flex items-center justify-center gap-1.5 py-1.5 text-[12px] font-semibold rounded-md'

  const tooltipLines: string[] = !isUnderReview && extraDisabled && extraDisabledTitle
    ? Array.isArray(extraDisabledTitle) ? extraDisabledTitle : [extraDisabledTitle]
    : []

  const modalDesc = isUnderReview
    ? '심사를 취소할까요?'
    : `"${gameTitle}" 게임의 심사를 요청합니다.`

  const confirmLabel = isUnderReview ? '심사 취소' : '심사 넣기'

  return (
    <>
      {/* 팝업 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-text-primary font-bold text-base mb-2">심사 진행</h3>
            <p className="text-text-secondary text-sm mb-6">{modalDesc}</p>
            <div className="flex gap-3">
              {isUnderReview ? (
                <>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2.5 text-sm text-text-secondary border border-line rounded-xl hover:bg-bg-tertiary transition-colors"
                  >
                    심사 취소
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors text-white bg-accent hover:bg-accent-hover"
                  >
                    계속 진행
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-2.5 text-sm text-text-secondary border border-line rounded-xl hover:bg-bg-tertiary transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors text-white bg-accent hover:bg-accent-hover"
                  >
                    심사 넣기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative group inline-flex">
        <button
          onClick={() => {
            if (isDisabled && onDisabledClick) { onDisabledClick(); return }
            if (!isDisabled) setModalOpen(true)
          }}
          disabled={isDisabled && !onDisabledClick}
          className={`${size === 'sm' ? smCls : size === 'lg' ? lgCls : size === 'full' ? fullCls : mdCls} transition-colors ${
            isDisabled
              ? `opacity-30 cursor-not-allowed ${
                  color === 'emerald' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/50'
                  : color === 'violet' ? 'text-white bg-blue-600 border border-blue-500'
                  : 'text-accent bg-accent/10 border border-accent/50'
                }`
              : color === 'emerald' ? 'text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/50 cursor-pointer'
              : color === 'violet'  ? 'text-white bg-blue-600 hover:bg-blue-500 border border-blue-500 cursor-pointer'
              : 'text-accent hover:text-text-primary bg-accent/10 hover:bg-accent border border-accent/50 cursor-pointer'
          }`}
        >
          {requesting
            ? <Loader2 className={`animate-spin ${size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />
            : <Send className={size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-5 h-5' : size === 'full' ? 'w-3 h-3' : 'w-4 h-4'} />
          }
          심사 진행
        </button>
        {tooltipLines.length > 0 && (
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
            <div className="bg-bg-primary border border-line rounded-lg shadow-lg px-3 py-2 text-xs text-text-secondary whitespace-nowrap">
              {tooltipLines.map((line, i) => (
                <p key={i} className="leading-5">{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
