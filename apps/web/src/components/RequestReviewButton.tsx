'use client'
import { useState } from 'react'
import { Send } from 'lucide-react'
import { gameService } from '../services/gameService'

interface Props {
  gameId: string
  gameTitle: string
  approvalStatus: string
  onSuccess?: () => void
  size?: 'sm' | 'md' | 'full'
  extraDisabled?: boolean
  extraDisabledTitle?: string
}

export default function RequestReviewButton({
  gameId,
  gameTitle,
  approvalStatus,
  onSuccess,
  size = 'md',
  extraDisabled,
  extraDisabledTitle,
}: Props) {
  const [requesting, setRequesting] = useState(false)

  const approvalDisabled = approvalStatus === 'pending' || approvalStatus === 'review' || approvalStatus === 'approved'
  const isDisabled = requesting || approvalDisabled || !!extraDisabled

  const handleClick = async () => {
    if (!confirm(`"${gameTitle}" 게임의 심사를 요청하시겠습니까?`)) return
    setRequesting(true)
    try {
      await gameService.requestReview(gameId)
      alert('심사가 요청되었습니다. 관리자 검토 후 승인됩니다.')
      onSuccess?.()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '심사 요청에 실패했습니다.')
    } finally {
      setRequesting(false)
    }
  }

  const smCls = 'flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium rounded-md'
  const mdCls = 'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md'
  const fullCls = 'w-full flex items-center justify-center gap-1.5 py-1.5 text-[12px] font-semibold rounded-md'

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={extraDisabled && extraDisabledTitle ? extraDisabledTitle : undefined}
      className={`${size === 'sm' ? smCls : size === 'full' ? fullCls : mdCls} text-accent hover:text-text-primary bg-accent/10 hover:bg-accent border border-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <Send className={size === 'sm' ? 'w-2.5 h-2.5' : size === 'full' ? 'w-3 h-3' : 'w-4 h-4'} />
      {requesting ? '요청중...' : '심사 등록'}
    </button>
  )
}
