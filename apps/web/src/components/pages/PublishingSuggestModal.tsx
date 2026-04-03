'use client'
import { useState } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import publishingService, { PublishingType } from '@/services/publishingService'

const ADDITIONAL_SERVICES = [
  '마케팅 지원',
  '게임 최적화',
  'QA 테스트',
  '현지화 번역',
  '수익화 컨설팅',
  '커뮤니티 관리',
]

interface PublishingSuggestModalProps {
  type: PublishingType
  onClose: () => void
  onSuccess: () => void
}

export default function PublishingSuggestModal({ type, onClose, onSuccess }: PublishingSuggestModalProps) {
  const [gameName, setGameName] = useState('')
  const [gameDescription, setGameDescription] = useState('')
  const [appIcon, setAppIcon] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>(['', ''])
  const [buildUrl, setBuildUrl] = useState('')
  const [additionalServices, setAdditionalServices] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const addScreenshot = () => {
    if (screenshots.length < 8) setScreenshots(prev => [...prev, ''])
  }

  const removeScreenshot = (idx: number) => {
    if (screenshots.length > 2) setScreenshots(prev => prev.filter((_, i) => i !== idx))
  }

  const updateScreenshot = (idx: number, value: string) => {
    setScreenshots(prev => prev.map((s, i) => (i === idx ? value : s)))
  }

  const toggleService = (service: string) => {
    setAdditionalServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameName.trim() || !gameDescription.trim()) {
      setError('게임 이름과 설명은 필수입니다')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await publishingService.createSuggest(type, {
        gameName: gameName.trim(),
        gameDescription: gameDescription.trim(),
        appIcon: appIcon.trim(),
        coverImage: coverImage.trim(),
        screenshots: screenshots.filter(s => s.trim()),
        buildUrl: buildUrl.trim(),
        additionalServices,
      })
      onSuccess()
    } catch {
      setError('제출에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-line rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
          <h2 className="text-text-primary font-bold text-lg">게임 제안하기</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-1.5">게임 이름 *</label>
            <input
              type="text"
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="게임 이름을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-text-secondary text-sm font-medium mb-1.5">게임 설명 *</label>
            <textarea
              value={gameDescription}
              onChange={e => setGameDescription(e.target.value)}
              rows={4}
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              placeholder="게임에 대한 상세한 설명을 입력하세요"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-1.5">앱 아이콘 URL</label>
              <input
                type="url"
                value={appIcon}
                onChange={e => setAppIcon(e.target.value)}
                className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-1.5">커버 이미지 URL</label>
              <input
                type="url"
                value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
                className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-text-secondary text-sm font-medium">스크린샷 URL (2~8장)</label>
              {screenshots.length < 8 && (
                <button type="button" onClick={addScreenshot} className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 transition-colors">
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
                    className="flex-1 bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-cyan-500 transition-colors"
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
            <label className="block text-text-secondary text-sm font-medium mb-1.5">빌드 파일 / URL</label>
            <input
              type="text"
              value={buildUrl}
              onChange={e => setBuildUrl(e.target.value)}
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="빌드 파일 URL 또는 다운로드 링크"
            />
          </div>

          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">추가 서비스 요청</label>
            <div className="grid grid-cols-2 gap-2">
              {ADDITIONAL_SERVICES.map(service => (
                <label key={service} className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg bg-bg-tertiary border border-line hover:border-line transition-colors">
                  <input
                    type="checkbox"
                    checked={additionalServices.includes(service)}
                    onChange={() => toggleService(service)}
                    className="w-4 h-4 rounded border-line bg-bg-tertiary text-cyan-600 focus:ring-0"
                  />
                  <span className="text-text-secondary text-sm">{service}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
          )}
        </form>

        <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm transition-colors">
            취소
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            제출하기
          </button>
        </div>
      </div>
    </div>
  )
}
