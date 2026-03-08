'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import partnerService, { TopicGroup } from '@/services/partnerService'
import Editor from '@/components/Editor'
import { useAuth } from '@/lib/useAuth'
import { Plus, Trash2, Tag, Loader2, ArrowLeft } from 'lucide-react'

export default function PartnerPostWritePage() {
  const params = useParams<{ id?: string }>()
  const editId = params?.id
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const isEdit = !!editId

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [topicGroup, setTopicGroup] = useState('')
  const [topic, setTopic] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [topicGroups, setTopicGroups] = useState<TopicGroup[]>([])
  const [partnerChecked, setPartnerChecked] = useState(false)
  const [isApprovedPartner, setIsApprovedPartner] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return }
    partnerService.getMyStatus()
      .then((data: { partner?: { status: string } }) => {
        setPartnerChecked(true)
        setIsApprovedPartner(data?.partner?.status === 'approved')
      })
      .catch(() => { setPartnerChecked(true); setIsApprovedPartner(false) })

    partnerService.getTopics()
      .then((data: { groups: TopicGroup[] }) => setTopicGroups(data.groups ?? []))
      .catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    if (isEdit && editId) {
      partnerService.getPartnerPost(editId)
        .then(({ post }) => {
          setTitle(post.title)
          setContent(post.content)
          setTopicGroup(post.topicGroup)
          setTopic(post.topic)
          setTags(post.tags || [])
        })
        .catch(() => router.push('/partner'))
    }
  }, [editId, isEdit])

  const selectedGroup = topicGroups.find(g => g.name === topicGroup)
  const availableTopics = selectedGroup?.topics.filter(t => t.isActive) ?? []

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (!content || content === '<p></p>') { setError('내용을 입력해주세요'); return }
    setError('')
    setSubmitting(true)
    try {
      const payload = { title: title.trim(), content, topicGroup, topic, tags }
      if (isEdit && editId) {
        const { post } = await partnerService.updatePartnerPost(editId, payload)
        const pid = typeof post.partnerId === 'string' ? post.partnerId : post.partnerId._id
        router.push(`/partner/${pid}/${post._id}`)
      } else {
        const { post } = await partnerService.createPartnerPost(payload)
        const pid = typeof post.partnerId === 'string' ? post.partnerId : post.partnerId._id
        router.push(`/partner/${pid}/${post._id}`)
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message || '저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  if (!partnerChecked) return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
    </div>
  )

  if (!isApprovedPartner) return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-white font-semibold text-lg mb-2">파트너 전용 기능</p>
        <p className="text-slate-400 text-sm mb-6">승인된 파트너만 글을 작성할 수 있습니다.</p>
        <button onClick={() => router.push('/partner')} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm transition-colors">
          파트너 목록으로
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 뒤로
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h1 className="text-white text-xl font-bold">{isEdit ? '게시글 수정' : '파트너 채널 글쓰기'}</h1>

          {error && <p className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 rounded-xl">{error}</p>}

          {topicGroups.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">주제 그룹</label>
                <select value={topicGroup} onChange={e => { setTopicGroup(e.target.value); setTopic('') }}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500">
                  <option value="">선택 안 함</option>
                  {topicGroups.map(g => (
                    <option key={g._id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
              {topicGroup && availableTopics.length > 0 && (
                <div>
                  <label className="text-slate-400 text-sm mb-2 block">주제</label>
                  <select value={topic} onChange={e => setTopic(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500">
                    <option value="">선택 안 함</option>
                    {availableTopics.map(t => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-slate-400 text-sm mb-2 block">제목 <span className="text-red-400">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              placeholder="제목을 입력하세요"
              className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <p className="text-slate-600 text-xs mt-1 text-right">{title.length}/200</p>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-2 block">내용 <span className="text-red-400">*</span></label>
            <Editor content={content} onChange={setContent} placeholder="내용을 입력하세요..." />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-2 flex items-center gap-1.5">
              <Tag className="w-4 h-4" /> 태그 ({tags.length}/10)
            </label>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="#태그 입력 후 Enter"
                className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
              />
              <button onClick={addTag} disabled={!tagInput.trim() || tags.length >= 10}
                className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg disabled:opacity-50 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span key={t} className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full flex items-center gap-1.5">
                    #{t}
                    <button onClick={() => setTags(tags.filter(x => x !== t))} className="text-slate-500 hover:text-white transition-colors">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button onClick={() => router.back()} className="px-5 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors">
              취소
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? '수정 완료' : '게시하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
