'use client'
import { useState, useEffect } from 'react'
import { X, CheckCircle, ChevronRight } from 'lucide-react'
import solutionService, { Solution } from '@/services/solutionService'

interface Props {
  isOpen: boolean
  onClose: () => void
  solutionId: string | null
}

const categoryColors: Record<string, string> = {
  QA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  보안: 'bg-red-500/20 text-red-300 border-red-500/30',
  음성: 'bg-green-500/20 text-green-300 border-green-500/30',
  분석: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  결제: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  기타: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

export default function SolutionDetailModal({ isOpen, onClose, solutionId }: Props) {
  const [solution, setSolution] = useState<Solution | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    managerName: '',
    phone: '',
    email: '',
    message: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !solutionId) return
    setShowForm(false)
    setSubmitted(false)
    setError('')
    setLoading(true)
    solutionService.getSolutionDetail(solutionId)
      .then(({ solution: s }) => setSolution(s))
      .catch(() => setError('솔루션을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [isOpen, solutionId])

  if (!isOpen) return null

  const catColor = solution ? (categoryColors[solution.category] ?? categoryColors['기타']) : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!solution) return
    setSubmitting(true)
    setError('')
    try {
      await solutionService.subscribe({ solutionId: solution._id, ...form })
      setSubmitted(true)
    } catch {
      setError('신청에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10">
          <X className="w-5 h-5" />
        </button>

        {loading && (
          <div className="p-12 text-center text-slate-400">불러오는 중...</div>
        )}

        {!loading && solution && !submitted && (
          <div>
            {solution.imageUrl && (
              <div className="h-48 overflow-hidden rounded-t-2xl">
                <img src={solution.imageUrl} alt={solution.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded border ${catColor}`}>
                  {solution.category}
                </span>
                {solution.isRecommended && (
                  <span className="text-xs px-2 py-0.5 rounded border bg-orange-500/20 text-orange-300 border-orange-500/30">추천</span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{solution.name}</h2>
              <p className="text-slate-300 mb-4">{solution.description}</p>

              {solution.detailedDescription && (
                <div
                  className="text-slate-400 text-sm mb-4 prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: solution.detailedDescription }}
                />
              )}

              {solution.features.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-white font-semibold mb-2">주요 기능</h3>
                  <ul className="space-y-1">
                    {solution.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {solution.pricing && (
                <div className="bg-slate-800 rounded-xl p-4 mb-4">
                  <h3 className="text-white font-semibold mb-1">요금 안내</h3>
                  <p className="text-slate-300 text-sm">{solution.pricing}</p>
                </div>
              )}

              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  구독 신청 <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {showForm && (
                <form onSubmit={handleSubmit} className="space-y-3 mt-4 border-t border-slate-700 pt-4">
                  <h3 className="text-white font-semibold">구독 신청</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">회사명 *</label>
                      <input
                        required
                        value={form.companyName}
                        onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">담당자 *</label>
                      <input
                        required
                        value={form.managerName}
                        onChange={e => setForm(p => ({ ...p, managerName: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">연락처 *</label>
                      <input
                        required
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">이메일 *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">문의 내용</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
                    />
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl text-sm transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-all"
                    >
                      {submitting ? '신청 중...' : '신청하기'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {submitted && (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">신청 완료!</h3>
            <p className="text-slate-400 mb-6">구독 신청이 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.</p>
            <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl text-sm transition-colors">
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
