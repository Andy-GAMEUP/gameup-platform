'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Loader2, Send } from 'lucide-react'
import { partnerService } from '@/services/partnerService'

interface Props {
  isOpen: boolean
  partnerId: string
  partnerName: string
  onClose: () => void
}

export default function ContactPartnerModal({ isOpen, partnerId, partnerName, onClose }: Props) {
  const [content, setContent] = useState('')

  const handleClose = () => {
    setContent('')
    sendMutation.reset()
    onClose()
  }

  const sendMutation = useMutation({
    mutationFn: () => partnerService.sendMessage(partnerId, content),
    onSuccess: () => {
      handleClose()
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h3 className="text-text-primary font-bold">{partnerName}에게 메시지 보내기</h3>
          <button onClick={handleClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="전달할 메시지를 입력해주세요"
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
          />
          {sendMutation.isError && (
            <p className="text-danger text-xs mt-2">
              {(sendMutation.error as any)?.response?.data?.message || '메시지 전송에 실패했습니다'}
            </p>
          )}
        </div>
        <div className="flex gap-2 p-5 pt-0">
          <button onClick={handleClose} className="px-4 py-2.5 border border-line text-text-secondary rounded-lg text-base hover:bg-bg-tertiary">취소</button>
          <button
            onClick={() => content.trim() && sendMutation.mutate()}
            disabled={sendMutation.isPending || !content.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary rounded-lg text-base font-medium"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 보내기
          </button>
        </div>
      </div>
    </div>
  )
}
