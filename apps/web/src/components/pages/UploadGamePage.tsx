'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gameService } from '@/services/gameService'
import { Loader2, Globe } from 'lucide-react'

interface FormData {
  title: string
  serviceType: string
  gameDomain: string
  startDate: string
  endDate: string
  maxTesters: string
  testType: string
  requirements: string
}

export default function UploadGamePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<FormData>({
    title: '',
    serviceType: 'beta',
    gameDomain: '',
    startDate: '',
    endDate: '',
    maxTesters: '',
    testType: '',
    requirements: '',
  })

  const isValidUrl = (url: string) => {
    try { new URL(url); return true } catch { return false }
  }


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.gameDomain.trim()) {
      setError('게임 서비스 URL을 입력해주세요.')
      return
    }

    if (!isValidUrl(formData.gameDomain.trim())) {
      setError('유효한 URL 형식으로 입력해주세요. (예: https://mygame.com)')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', formData.title)
      fd.append('serviceType', formData.serviceType)
      fd.append('monetization', 'freemium')
      fd.append('price', '0')
      fd.append('isPaid', 'false')
      fd.append('status', 'draft')
      fd.append('gameDomain', formData.gameDomain.trim())
      fd.append('startDate', formData.startDate)
      fd.append('endDate', formData.endDate)
      fd.append('maxTesters', formData.maxTesters)
      fd.append('testType', formData.testType)
      fd.append('requirements', formData.requirements)

      await gameService.createGame(fd)
      alert('게임이 등록되었습니다. 게임 세팅을 진행해주세요.')
      router.push('/games-management')
    } catch (err: any) {
      setError(err.response?.data?.message || '게임 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-lg">

        {/* 헤더 */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">게임 등록</h1>
          <p className="text-text-muted text-sm">등록 후 게임 관리에서 심사를 준비해 주세요.</p>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* 게임명 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">게임명</label>
            <input
              name="title"
              placeholder="게임 제목을 입력해주세요"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-0 py-3 bg-transparent border-b border-line text-xl font-medium text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              required
            />
          </div>

          {/* 게임 URL */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">게임 URL</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                name="gameDomain"
                type="url"
                placeholder="https://mygame.com"
                value={formData.gameDomain}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 bg-bg-secondary border border-line rounded-2xl text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                required
              />
            </div>
          </div>

          {/* 서비스 유형 */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">서비스 유형</label>
            <div className="flex gap-3">
              {[
                { value: 'beta', label: '베타', desc: '테스트 & 피드백' },
                { value: 'live', label: '라이브', desc: '정식 서비스' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, serviceType: opt.value }))}
                  className={`flex-1 py-4 rounded-2xl border transition-all text-left px-5 ${
                    formData.serviceType === opt.value
                      ? 'border-transparent bg-accent text-white shadow-lg shadow-accent/30 scale-[1.02]'
                      : 'border-line hover:border-line/60 bg-bg-secondary'
                  }`}
                >
                  <p className={`font-bold text-sm mb-0.5 ${formData.serviceType === opt.value ? 'text-white' : 'text-text-primary'}`}>{opt.label}</p>
                  <p className={`text-xs ${formData.serviceType === opt.value ? 'text-white/70' : 'text-text-muted'}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 베타 테스트 정보 */}
          {formData.serviceType === 'beta' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">베타 테스트 정보</label>
              <div className="bg-bg-secondary border border-line rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block text-text-secondary">시작일</label>
                    <input name="startDate" type="date" value={formData.startDate} onChange={handleChange}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium block text-text-secondary">종료일</label>
                    <input name="endDate" type="date" value={formData.endDate} onChange={handleChange}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block text-text-secondary">최대 테스터 수</label>
                    <input name="maxTesters" type="number" placeholder="1000" value={formData.maxTesters} onChange={handleChange}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-xl text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium block text-text-secondary">테스트 유형</label>
                    <select name="testType" value={formData.testType} onChange={handleChange}
                      className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent transition-colors">
                      <option value="">유형 선택</option>
                      <option value="closed">비공개 베타</option>
                      <option value="open">공개 베타</option>
                      <option value="alpha">알파 테스트</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/games-management')}
              className="px-5 py-3 rounded-2xl border border-line text-sm text-text-secondary hover:bg-bg-secondary transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting || (formData.serviceType === 'beta' && (!formData.startDate || !formData.endDate || !formData.maxTesters || !formData.testType))}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-colors"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 등록 중...</> : '게임 생성'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
