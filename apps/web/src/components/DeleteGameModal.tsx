'use client'
import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { gameService } from '@/services/gameService'

interface DeleteGameModalProps {
  gameId: string
  gameTitle: string
  onClose: () => void
  onDeleted?: () => void
}

export default function DeleteGameModal({ gameId, gameTitle, onClose, onDeleted }: DeleteGameModalProps) {
  const [confirmTitle, setConfirmTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (confirmTitle.trim() !== gameTitle) {
      setError('게임명이 일치하지 않습니다')
      return
    }

    setLoading(true)
    try {
      await gameService.deleteGame(gameId)
      onDeleted?.()
      onClose()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '삭제에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-bg-secondary border border-red-500/40 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-text-primary">게임 삭제</h2>
          </div>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary" disabled={loading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-md p-3 text-sm text-red-300">
            이 작업은 <strong>되돌릴 수 없습니다.</strong>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              삭제 확인을 위해 게임명 <strong className="text-text-primary">{gameTitle}</strong>을(를) 입력해주세요
            </label>
            <input
              type="text"
              value={confirmTitle}
              onChange={(e) => setConfirmTitle(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm text-text-primary focus:outline-none focus:border-red-500"
              placeholder={gameTitle}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-base text-text-secondary hover:text-text-primary rounded-md border border-line">
              취소
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-base font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50">
              {loading ? '삭제 중...' : '영구 삭제'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
