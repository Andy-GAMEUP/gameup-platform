'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import Editor from '@/components/Editor'
import partnerMatchingService from '@/services/partnerMatchingService'
import { X, Loader2, ArrowLeft } from 'lucide-react'

const categoryOptions = [
  '웹 개발', '앱 개발', '디자인', '마케팅', 'QA/테스트',
  '번역/현지화', '웹퍼블리싱', '서버/인프라', '컨설팅', '기타',
]

const SKILL_SUGGESTIONS = ['Unity', 'Unreal', 'React', 'Node.js', 'Python', 'Figma', 'iOS', 'Android', 'QA', '마케팅', '번역', '기획']

export default function PartnerProjectWritePage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params?.id as string | undefined
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', category: '웹 개발',
    budget: '', duration: '', applicationDeadline: '',
    requiredSkills: [] as string[],
  })

  useEffect(() => {
    if (!isEdit || !id) return
    partnerMatchingService.getProjectById(id).then(({ project }) => {
      setForm({
        title: project.title || '',
        description: project.description || '',
        category: project.category || '웹 개발',
        budget: project.budget || '',
        duration: project.duration || '',
        applicationDeadline: project.applicationDeadline ? project.applicationDeadline.slice(0, 10) : '',
        requiredSkills: project.requiredSkills || [],
      })
    }).catch(() => router.push('/partner/projects')).finally(() => setLoading(false))
  }, [id, isEdit])

  const handleField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const addSkill = (skill: string) => {
    const s = skill.trim()
    if (s && !form.requiredSkills.includes(s))
      setForm(f => ({ ...f, requiredSkills: [...f.requiredSkills, s] }))
    setSkillInput('')
  }

  const removeSkill = (skill: string) =>
    setForm(f => ({ ...f, requiredSkills: f.requiredSkills.filter(s => s !== skill) }))

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.category) return alert('제목, 설명, 카테고리는 필수입니다.')
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await partnerMatchingService.updateProject(id, form)
        queryClient.invalidateQueries({ queryKey: ['partnerProject', id] })
        router.push(`/partner/projects/${id}`)
      } else {
        const { project } = await partnerMatchingService.createProject(form)
        queryClient.invalidateQueries({ queryKey: ['partnerProjects'] })
        router.push(`/partner/projects/${project._id}`)
      }
      queryClient.invalidateQueries({ queryKey: ['partnerProjectStats'] })
    } catch {
      alert(isEdit ? '수정에 실패했습니다.' : '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">불러오는 중...</div></div>
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {isEdit ? '프로젝트로 돌아가기' : '프로젝트 목록으로 돌아가기'}
        </button>

        <h1 className="text-text-primary text-xl font-bold mb-5">{isEdit ? '프로젝트 수정' : '프로젝트 등록'}</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-xs mb-1">제목 *</label>
            <input value={form.title} onChange={e => handleField('title', e.target.value)}
              placeholder="프로젝트 제목을 입력하세요"
              className="w-full bg-bg-card border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-1">설명 *</label>
            <Editor content={form.description} onChange={html => handleField('description', html)}
              placeholder="프로젝트 내용을 설명해주세요" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary text-xs mb-1">카테고리 *</label>
              <select value={form.category} onChange={e => handleField('category', e.target.value)}
                className="w-full bg-bg-card border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent">
                {categoryOptions.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-text-secondary text-xs mb-1">예산</label>
              <input value={form.budget} onChange={e => handleField('budget', e.target.value)}
                placeholder="예: 500만원 ~ 1000만원"
                className="w-full bg-bg-card border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-text-secondary text-xs mb-1">기간</label>
              <input value={form.duration} onChange={e => handleField('duration', e.target.value)}
                placeholder="예: 3개월"
                className="w-full bg-bg-card border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-text-secondary text-xs mb-1">마감일</label>
              <input type="date" value={form.applicationDeadline} onChange={e => handleField('applicationDeadline', e.target.value)}
                className="w-full bg-bg-card border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-1">필요 스킬</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.requiredSkills.map(s => (
                <span key={s} className="flex items-center gap-1 bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full text-xs">
                  {s}
                  <button onClick={() => removeSkill(s)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } }}
              placeholder="스킬 입력 후 Enter"
              className="w-full bg-bg-card border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SKILL_SUGGESTIONS.filter(s => !form.requiredSkills.includes(s)).map(s => (
                <button key={s} onClick={() => addSkill(s)}
                  className="px-2 py-0.5 bg-bg-card border border-line text-text-secondary hover:border-accent hover:text-accent rounded-full text-xs transition-colors">
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6">
          <button onClick={() => router.back()}
            className="flex-1 px-4 py-3 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">
            취소
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover text-text-primary rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? '저장' : '등록'}
          </button>
        </div>
      </div>
    </div>
  )
}
