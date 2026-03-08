'use client'
import { useState, useEffect } from 'react'
import partnerService, { TopicGroup } from '@/services/partnerService'
import { X, Loader2, CheckCircle } from 'lucide-react'

interface Props {
  onClose: () => void
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export default function PartnerApplyModal({ onClose }: Props) {
  const [topicGroups, setTopicGroups] = useState<TopicGroup[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [introduction, setIntroduction] = useState('')
  const [activityPlan, setActivityPlan] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    partnerService.getTopics()
      .then((data: { groups: TopicGroup[] }) => setTopicGroups(data.groups ?? []))
      .catch(() => {})
  }, [])

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    )
  }

  const handleSubmit = async () => {
    if (!introduction.trim()) { setErrorMsg('자기소개를 입력해주세요'); return }
    if (!activityPlan.trim()) { setErrorMsg('활동 계획을 입력해주세요'); return }
    setErrorMsg('')
    setSubmitState('loading')
    try {
      await partnerService.apply({ introduction, activityPlan, externalUrl, selectedTopics })
      setSubmitState('success')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setErrorMsg(err?.response?.data?.message || '신청 실패. 다시 시도해주세요.')
      setSubmitState('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg">파트너 신청</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitState === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
            <p className="text-white font-semibold text-lg mb-2">신청이 완료되었습니다!</p>
            <p className="text-slate-400 text-sm mb-6">검토 후 이메일로 결과를 알려드립니다. 심사는 보통 3~5 영업일 소요됩니다.</p>
            <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              확인
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {errorMsg && (
              <p className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 rounded-xl">{errorMsg}</p>
            )}

            {topicGroups.length > 0 && (
              <div>
                <label className="text-slate-300 text-sm font-medium mb-3 block">관심 주제 (선택)</label>
                <div className="space-y-3">
                  {topicGroups.map(group => (
                    <div key={group._id}>
                      <p className="text-slate-500 text-xs mb-2">{group.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.topics.filter(t => t.isActive).map(t => (
                          <label key={t.name} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={selectedTopics.includes(t.name)} onChange={() => toggleTopic(t.name)}
                              className="w-3.5 h-3.5 rounded accent-cyan-500" />
                            <span className={`text-xs px-2 py-0.5 rounded border transition-colors cursor-pointer ${selectedTopics.includes(t.name) ? 'bg-cyan-600/20 border-cyan-500/40 text-cyan-300' : 'border-slate-700 text-slate-400'}`}>
                              {t.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                자기소개 <span className="text-red-400">*</span>
                <span className="text-slate-500 font-normal ml-1">({introduction.length}/500)</span>
              </label>
              <textarea value={introduction} onChange={e => setIntroduction(e.target.value)} maxLength={500} rows={4}
                placeholder="본인 소개와 게임 관련 전문성을 작성해주세요"
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2.5 rounded-xl resize-none focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                활동 계획 <span className="text-red-400">*</span>
                <span className="text-slate-500 font-normal ml-1">({activityPlan.length}/500)</span>
              </label>
              <textarea value={activityPlan} onChange={e => setActivityPlan(e.target.value)} maxLength={500} rows={4}
                placeholder="파트너로서 어떤 콘텐츠를 제공할 계획인지 작성해주세요"
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2.5 rounded-xl resize-none focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">외부 링크 (선택)</label>
              <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
                placeholder="유튜브, 블로그, SNS 등 링크"
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>
        )}

        {submitState !== 'success' && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors">
              취소
            </button>
            <button onClick={handleSubmit} disabled={submitState === 'loading'}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors">
              {submitState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
              신청하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
