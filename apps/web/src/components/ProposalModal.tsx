'use client'
import { useState } from 'react'
import minihomeService, { MiniHomeGame } from '@/services/minihomeService'
import { X, Loader2, CheckCircle } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  minihomeId: string
  games: MiniHomeGame[]
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export default function ProposalModal({ isOpen, onClose, minihomeId, games }: Props) {
  const [type, setType] = useState<'investment' | 'publishing'>('investment')
  const [selectedGameId, setSelectedGameId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) { setErrorMsg('제목을 입력해주세요'); return }
    if (!content.trim()) { setErrorMsg('내용을 입력해주세요'); return }
    setErrorMsg('')
    setSubmitState('loading')
    try {
      await minihomeService.sendProposal({
        type,
        toMinihomeId: minihomeId,
        gameId: type === 'publishing' && selectedGameId ? selectedGameId : undefined,
        title,
        content,
      })
      setSubmitState('success')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setErrorMsg(err?.response?.data?.message || '전송 실패. 다시 시도해주세요.')
      setSubmitState('error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-text-primary font-bold text-lg">제안 보내기</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitState === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle className="w-12 h-12 text-accent mb-4" />
            <p className="text-text-primary font-semibold text-lg mb-2">제안이 전송되었습니다!</p>
            <p className="text-text-secondary text-sm mb-6">상대방이 검토 후 답변을 드릴 것입니다.</p>
            <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-text-primary px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              확인
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {errorMsg && (
                <p className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 rounded-xl">{errorMsg}</p>
              )}

              <div>
                <label className="text-text-secondary text-sm font-medium mb-2 block">제안 유형</label>
                <div className="flex gap-3">
                  {(['investment', 'publishing'] as const).map(t => (
                    <button key={t} type="button" onClick={() => { setType(t); setSelectedGameId('') }}
                      className={`flex-1 py-2.5 text-sm rounded-xl border transition-colors ${type === t ? 'bg-red-600/20 border-red-500/40 text-red-300 font-medium' : 'border-line text-text-secondary hover:text-text-primary'}`}>
                      {t === 'investment' ? '투자 제안' : '퍼블리싱 제안'}
                    </button>
                  ))}
                </div>
              </div>

              {type === 'publishing' && games.length > 0 && (
                <div>
                  <label className="text-text-secondary text-sm font-medium mb-2 block">대상 게임 (선택)</label>
                  <select value={selectedGameId} onChange={e => setSelectedGameId(e.target.value)}
                    className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors">
                    <option value="">게임 선택 (선택사항)</option>
                    {games.map(g => (
                      <option key={g._id} value={g._id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-text-secondary text-sm font-medium mb-2 block">제목 <span className="text-red-400">*</span></label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="제안 제목을 입력하세요"
                  className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors" />
              </div>

              <div>
                <label className="text-text-secondary text-sm font-medium mb-2 block">
                  내용 <span className="text-red-400">*</span>
                  <span className="text-text-muted font-normal ml-1">({content.length}/1000)</span>
                </label>
                <textarea value={content} onChange={e => setContent(e.target.value)} maxLength={1000} rows={6}
                  placeholder="제안 내용을 구체적으로 작성해주세요"
                  className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl resize-none focus:outline-none focus:border-red-500 transition-colors" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-line">
              <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary border border-line rounded-xl hover:bg-bg-tertiary transition-colors">
                취소
              </button>
              <button onClick={handleSubmit} disabled={submitState === 'loading'}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-text-primary px-5 py-2 rounded-xl text-sm font-medium transition-colors">
                {submitState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                전송
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
