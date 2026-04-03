'use client'
import { useState } from 'react'
import { X, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'
import supportService from '@/services/supportService'

const GENRES = ['RPG', '액션', '퍼즐', '시뮬레이션', '전략', '기타']
const PLATFORMS = ['iOS', 'Android', 'PC']

interface Props {
  isOpen: boolean
  onClose: () => void
  seasonId: string
  onSuccess: () => void
}

export default function GameApplyModal({ isOpen, onClose, seasonId, onSuccess }: Props) {
  const [gameName, setGameName] = useState('')
  const [genre, setGenre] = useState(GENRES[0])
  const [description, setDescription] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [introVideoUrl, setIntroVideoUrl] = useState('')
  const [introImageUrl, setIntroImageUrl] = useState('')
  const [buildUrl, setBuildUrl] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>(['', ''])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [developmentSchedule, setDevelopmentSchedule] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const addScreenshot = () => {
    if (screenshots.length < 8) setScreenshots(prev => [...prev, ''])
  }

  const removeScreenshot = (idx: number) => {
    if (screenshots.length > 2) setScreenshots(prev => prev.filter((_, i) => i !== idx))
  }

  const updateScreenshot = (idx: number, value: string) => {
    setScreenshots(prev => prev.map((s, i) => (i === idx ? value : s)))
  }

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const handleClose = () => {
    setGameName('')
    setGenre(GENRES[0])
    setDescription('')
    setIconUrl('')
    setIntroVideoUrl('')
    setIntroImageUrl('')
    setBuildUrl('')
    setScreenshots(['', ''])
    setPlatforms([])
    setDevelopmentSchedule('')
    setSubmitting(false)
    setSuccess(false)
    setError('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!gameName.trim()) { setError('게임 이름을 입력해주세요'); return }
    if (!description.trim()) { setError('게임 설명을 입력해주세요'); return }
    setSubmitting(true)
    setError('')
    try {
      await supportService.applyGame({
        seasonId,
        gameName: gameName.trim(),
        genre,
        description: description.trim(),
        iconUrl: iconUrl.trim() || undefined,
        introVideoUrl: introVideoUrl.trim() || undefined,
        introImageUrl: introImageUrl.trim() || undefined,
        buildUrl: buildUrl.trim() || undefined,
        screenshots: screenshots.filter(s => s.trim()),
        platforms,
        developmentSchedule: developmentSchedule.trim() || undefined,
      })
      setSuccess(true)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message || '제출에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
          <h2 className="text-text-primary font-bold text-lg">참가 신청</h2>
          <button onClick={handleClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle className="w-12 h-12 text-accent mb-4" />
            <p className="text-text-primary font-semibold text-lg mb-2">신청이 완료되었습니다!</p>
            <p className="text-text-secondary text-sm mb-6">검토 후 결과를 알려드립니다.</p>
            <button
              onClick={() => { setSuccess(false); onSuccess() }}
              className="bg-red-600 hover:bg-red-700 text-text-primary px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              확인
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <p className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 rounded-xl">{error}</p>
              )}

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-1.5">게임 이름 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={gameName}
                  onChange={e => setGameName(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="게임 이름을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-1.5">장르 <span className="text-red-400">*</span></label>
                <select
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors"
                >
                  {GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-1.5">게임 설명 <span className="text-red-400">*</span></label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-bg-tertiary border border-line rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors resize-none"
                  placeholder="게임에 대한 상세한 설명을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary text-sm font-medium mb-1.5">아이콘 URL</label>
                  <input
                    type="url"
                    value={iconUrl}
                    onChange={e => setIconUrl(e.target.value)}
                    className="w-full bg-bg-tertiary border border-line rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-text-secondary text-sm font-medium mb-1.5">소개 이미지 URL</label>
                  <input
                    type="url"
                    value={introImageUrl}
                    onChange={e => setIntroImageUrl(e.target.value)}
                    className="w-full bg-bg-tertiary border border-line rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-1.5">소개 영상 URL</label>
                <input
                  type="url"
                  value={introVideoUrl}
                  onChange={e => setIntroVideoUrl(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-1.5">빌드 URL</label>
                <input
                  type="text"
                  value={buildUrl}
                  onChange={e => setBuildUrl(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="빌드 파일 URL 또는 다운로드 링크"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-text-secondary text-sm font-medium">스크린샷 URL (2~8장)</label>
                  {screenshots.length < 8 && (
                    <button type="button" onClick={addScreenshot} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 transition-colors">
                      <Plus className="w-3 h-3" />추가
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {screenshots.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="url"
                        value={s}
                        onChange={e => updateScreenshot(idx, e.target.value)}
                        className="flex-1 bg-bg-tertiary border border-line rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors"
                        placeholder={`스크린샷 ${idx + 1} URL`}
                      />
                      {screenshots.length > 2 && (
                        <button type="button" onClick={() => removeScreenshot(idx)} className="text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">플랫폼</label>
                <div className="flex gap-3">
                  {PLATFORMS.map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-bg-tertiary border border-line hover:border-line transition-colors">
                      <input
                        type="checkbox"
                        checked={platforms.includes(p)}
                        onChange={() => togglePlatform(p)}
                        className="w-4 h-4 rounded border-line bg-bg-tertiary accent-red-500 focus:ring-0"
                      />
                      <span className="text-text-secondary text-sm">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-1.5">개발 일정</label>
                <textarea
                  value={developmentSchedule}
                  onChange={e => setDevelopmentSchedule(e.target.value)}
                  rows={3}
                  className="w-full bg-bg-tertiary border border-line rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-red-500 transition-colors resize-none"
                  placeholder="개발 일정을 간략히 적어주세요"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-line flex-shrink-0">
              <button onClick={handleClose} className="px-4 py-2 text-sm text-text-secondary border border-line rounded-xl hover:bg-bg-tertiary transition-colors">
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-text-primary px-5 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                신청하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
