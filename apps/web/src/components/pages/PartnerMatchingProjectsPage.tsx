'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import partnerMatchingService, { PartnerProjectItem } from '@/services/partnerMatchingService'
import { useAuth } from '@/lib/useAuth'
import { X, Plus, Loader2 } from 'lucide-react'

const categoryOptions = [
  { value: 'all', label: '전체' },
  { value: '웹 개발', label: '웹 개발' },
  { value: '앱 개발', label: '앱 개발' },
  { value: '디자인', label: '디자인' },
  { value: '마케팅', label: '마케팅' },
  { value: 'QA/테스트', label: 'QA/테스트' },
  { value: '번역/현지화', label: '번역/현지화' },
  { value: '웹퍼블리싱', label: '웹퍼블리싱' },
  { value: '서버/인프라', label: '서버/인프라' },
  { value: '컨설팅', label: '컨설팅' },
]

const statusLabel: Record<string, { text: string; color: string }> = {
  recruiting: { text: '모집중', color: 'bg-green-500/20 text-green-400' },
  ongoing: { text: '진행중', color: 'bg-accent-light text-accent' },
  completed: { text: '완료', color: 'bg-bg-muted/20 text-text-secondary' },
}

const SKILL_SUGGESTIONS = ['Unity', 'Unreal', 'React', 'Node.js', 'Python', 'Figma', 'iOS', 'Android', 'QA', '마케팅', '번역', '기획']

export default function PartnerMatchingProjectsPage() {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)

  // 등록 모달
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', category: '웹 개발',
    budget: '', duration: '', location: '원격',
    applicationDeadline: '', requiredSkills: [] as string[],
  })

  const isCorporate = isAuthenticated && user?.memberType === 'corporate'

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
      await partnerMatchingService.createProject(form)
      queryClient.invalidateQueries({ queryKey: ['partnerProjects'] })
      queryClient.invalidateQueries({ queryKey: ['partnerProjectStats'] })
      setShowModal(false)
      setForm({ title: '', description: '', category: '웹 개발', budget: '', duration: '', location: '원격', applicationDeadline: '', requiredSkills: [] })
    } catch {
      alert('등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['partnerProjects', page, searchQuery, categoryFilter, activeTab],
    queryFn: () =>
      partnerMatchingService.getProjects({
        page,
        limit: 12,
        search: searchQuery || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        tab: activeTab !== 'all' ? activeTab : undefined,
      }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['partnerProjectStats'],
    queryFn: () => partnerMatchingService.getProjectStats(),
  })

  const projects: PartnerProjectItem[] = data?.projects || []
  const pagination = data?.pagination
  const stats = statsData?.stats

  const tabs = [
    { key: 'all', label: '전체' },
    { key: 'recruiting', label: '모집중' },
    { key: 'ongoing', label: '진행중' },
  ]

  return (
    <>
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      {/* Header */}
      <div className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">파트너라운지</h1>
              <p className="text-text-secondary">다양한 프로젝트를 탐색하고 지원하세요</p>
            </div>
            {isCorporate && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-text-primary rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> 프로젝트 등록
              </button>
            )}
          </div>
          <div className="flex gap-6 -mb-px">
            <Link
              href="/partner/projects"
              className="pb-3 px-1 text-sm font-medium border-b-2 border-accent text-accent transition-colors"
            >
              프로젝트
            </Link>
            <Link
              href="/partner/directory"
              className="pb-3 px-1 text-sm font-medium border-b-2 border-transparent text-text-secondary hover:text-text-primary transition-colors"
            >
              파트너 디렉토리
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="프로젝트 또는 회사명으로 검색..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { value: stats.total, label: '전체 프로젝트', color: 'text-accent' },
              { value: stats.recruiting, label: '모집중', color: 'text-green-400' },
              { value: stats.totalApplicants, label: '총 지원자', color: 'text-purple-400' },
              { value: stats.newThisWeek, label: '신규 (주간)', color: 'text-orange-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 text-center">
                <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-sm text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-line pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Project Cards */}
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-text-muted">검색 결과가 없습니다.</div>
        ) : (
          <div className="grid gap-6">
            {projects.map((project) => {
              const status = statusLabel[project.status] || statusLabel.recruiting
              return (
                <div key={project._id} className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 hover:border-accent-muted transition-colors">
                  {/* Header */}
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${status.color}`}>{status.text}</span>
                      <span className="bg-bg-tertiary/50 text-text-secondary px-2.5 py-0.5 rounded text-xs">{project.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>지원자 {project.applicantCount}명</span>
                    </div>
                  </div>

                  <h2 className="text-2xl font-semibold text-text-primary mb-2">{project.title}</h2>
                  <p className="text-text-secondary flex items-center gap-2 text-base mb-4">
                    🏢 {project.ownerId?.companyInfo?.companyName || project.ownerId?.username}
                  </p>
                  <p className="text-text-secondary mb-6">{project.description}</p>

                  {/* Meta */}
                  <div className="grid sm:grid-cols-4 gap-4 mb-6 pb-6 border-b border-line-light">
                    {[
                      { icon: '💰', label: '예산', value: project.budget || `${project.budgetMin} ~ ${project.budgetMax}` },
                      { icon: '📅', label: '기간', value: project.duration },
                      { icon: '📍', label: '위치', value: project.location },
                      { icon: '⏰', label: '마감일', value: project.applicationDeadline ? new Date(project.applicationDeadline).toLocaleDateString('ko-KR') : '-' },
                    ].map((meta, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <div>
                          <div className="text-xs text-text-muted">{meta.label}</div>
                          <div className="font-medium text-text-primary text-sm">{meta.value || '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Skills */}
                  {project.requiredSkills?.length > 0 && (
                    <div className="mb-6">
                      <div className="text-sm font-medium text-text-secondary mb-3">필요 스킬</div>
                      <div className="flex flex-wrap gap-2">
                        {project.requiredSkills.map((skill, i) => (
                          <span key={i} className="bg-accent-light text-accent px-2.5 py-1 rounded text-xs font-medium">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/partner/projects/${project._id}`} className="flex-1 min-w-[200px] bg-accent hover:bg-accent-hover text-text-primary py-2.5 rounded-lg text-sm font-medium text-center transition-colors">
                      지원하기
                    </Link>
                    <Link href={`/partner/projects/${project._id}`} className="flex-1 min-w-[200px] border border-line hover:border-line text-text-secondary py-2.5 rounded-lg text-sm font-medium text-center transition-colors">
                      상세보기
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  p === page ? 'bg-accent text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    {showModal && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-xl my-8 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-text-primary font-bold text-lg">프로젝트 등록</h3>
            <button onClick={() => setShowModal(false)} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-text-secondary text-xs mb-1">제목 *</label>
              <input value={form.title} onChange={e => handleField('title', e.target.value)}
                placeholder="프로젝트 제목을 입력하세요"
                className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-text-secondary text-xs mb-1">설명 *</label>
              <textarea value={form.description} onChange={e => handleField('description', e.target.value)}
                placeholder="프로젝트 내용을 설명해주세요" rows={4}
                className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary text-xs mb-1">카테고리 *</label>
                <select value={form.category} onChange={e => handleField('category', e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent">
                  {categoryOptions.filter(o => o.value !== 'all').map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">예산</label>
                <input value={form.budget} onChange={e => handleField('budget', e.target.value)}
                  placeholder="예: 500만원 ~ 1000만원"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">기간</label>
                <input value={form.duration} onChange={e => handleField('duration', e.target.value)}
                  placeholder="예: 3개월"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">위치</label>
                <input value={form.location} onChange={e => handleField('location', e.target.value)}
                  placeholder="예: 원격, 서울"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div>
              <label className="block text-text-secondary text-xs mb-1">마감일</label>
              <input type="date" value={form.applicationDeadline} onChange={e => handleField('applicationDeadline', e.target.value)}
                className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-text-secondary text-xs mb-1">필요 스킬</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.requiredSkills.map(s => (
                  <span key={s} className="flex items-center gap-1 bg-accent-light text-accent px-2 py-0.5 rounded text-xs">
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-accent-text"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } }}
                  placeholder="스킬 입력 후 Enter"
                  className="flex-1 bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SKILL_SUGGESTIONS.filter(s => !form.requiredSkills.includes(s)).map(s => (
                  <button key={s} onClick={() => addSkill(s)}
                    className="px-2 py-0.5 bg-bg-tertiary border border-line text-text-secondary hover:border-accent hover:text-accent rounded text-xs transition-colors">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)}
              className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">
              취소
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover text-text-primary rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              등록
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
