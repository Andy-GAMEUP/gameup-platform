'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gameService } from '@/services/gameService'
import { Loader2 } from 'lucide-react'

interface FormData {
  serviceType: string
  requirements: string
}

const SERVICE_TYPE_OPTIONS = [
  {
    value: 'beta',
    label: '베타존',
    scopeClassName: 'accent-green',
    detail: '게임의 베타 테스트를 지정된 기간 진행할 수 있어요. 게임을 등록하고 평가가 좋다면 게임업의 다양한 지원을 받아서 정식 출시할 수 있어요.\n* 베타존은 무료 버전만 신청 가능합니다.',
  },
  {
    value: 'live',
    label: '라이브존',
    scopeClassName: 'accent-cyan',
    detail: '정식으로 게임을 출시합니다. 다양한 수익모델을 자유롭게 설정할 수 있습니다.',
  },
]

export default function UploadGamePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<FormData>({
    serviceType: 'beta',
    requirements: '',
  })

  const selectedServiceType = SERVICE_TYPE_OPTIONS.find(opt => opt.value === formData.serviceType)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('serviceType', formData.serviceType)
      fd.append('monetization', 'freemium')
      fd.append('price', '0')
      fd.append('isPaid', 'false')
      fd.append('status', 'draft')
      fd.append('requirements', formData.requirements)

      const data = await gameService.createGame(fd)
      router.push(`/games-management/${data.game._id}/manage?tab=${formData.serviceType}`)
    } catch (err: any) {
      setError(err.response?.data?.message || '게임 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-6 pt-16">
      <div className="w-full max-w-lg">

        {/* 헤더 */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-text-primary">게임 등록</h1>
          <p className="text-text-muted text-sm">등록 후 게임 관리에서 심사를 준비해 주세요.</p>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 서비스 유형 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_TYPE_OPTIONS.map(opt => {
                const selected = formData.serviceType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, serviceType: opt.value }))}
                    className={`${opt.scopeClassName} py-5 rounded-2xl border transition-colors text-center px-5 ${
                      selected
                        ? 'border-transparent text-white bg-accent'
                        : 'border-line hover:border-text-muted bg-bg-secondary'
                    }`}
                  >
                    <p className={`font-bold text-[28px] ${selected ? 'text-white' : 'text-text-primary'}`}>{opt.label}</p>
                  </button>
                )
              })}
            </div>

            {/* 설명 카드 */}
            {selectedServiceType && (
              <div className="h-32 px-5 py-4 rounded-2xl bg-bg-secondary border border-line overflow-y-auto">
                <p className="font-bold text-sm text-text-primary mb-1.5">{selectedServiceType.label} 서비스란?</p>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{selectedServiceType.detail}</p>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => router.push('/games-management')}
              className="w-[104px] py-3 rounded-2xl border border-line text-[19px] text-text-secondary hover:bg-bg-tertiary transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="accent-violet w-1/2 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-[19px] font-bold text-white transition-colors"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 등록 중...</> : '게임 등록 시작'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
