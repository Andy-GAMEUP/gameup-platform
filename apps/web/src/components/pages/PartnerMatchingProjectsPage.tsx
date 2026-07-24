'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import partnerMatchingService, { PartnerProjectItem } from '@/services/partnerMatchingService'
import { useAuth } from '@/lib/useAuth'
import { Plus, Loader2, Search, Clock, Wallet, Users } from 'lucide-react'

const categoryOptions = [
  { value: 'all', label: '협업 파트' },
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

const statusLabel: Record<string, { text: string; badge: string; border: string }> = {
  recruiting: { text: '모집중',   badge: 'bg-emerald-100 text-emerald-700 font-semibold', border: 'border-l-emerald-400' },
  matched:    { text: '매칭성공', badge: 'bg-blue-100 text-blue-700 font-semibold',       border: 'border-l-blue-500' },
  unmatched:  { text: '매칭보류', badge: 'bg-amber-100 text-amber-700 font-semibold',     border: 'border-l-amber-400' },
}

const SKILL_SUGGESTIONS = ['Unity', 'Unreal', 'React', 'Node.js', 'Python', 'Figma', 'iOS', 'Android', 'QA', '마케팅', '번역', '기획']

export default function PartnerMatchingProjectsPage() {
  const { user, isAuthenticated } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('all')
  const [showCategoryDrop, setShowCategoryDrop] = useState(false)
  const [skillFilter, setSkillFilter] = useState<string[]>([])
  const [showSkillDrop, setShowSkillDrop] = useState(false)
  const [sortOrder, setSortOrder] = useState('latest')
  const [page, setPage] = useState(1)
  const categoryDropRef = useRef<HTMLDivElement>(null)
  const skillDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryDropRef.current && !categoryDropRef.current.contains(e.target as Node))
        setShowCategoryDrop(false)
      if (skillDropRef.current && !skillDropRef.current.contains(e.target as Node))
        setShowSkillDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isCorporate = isAuthenticated && user?.memberType === 'corporate'

  const toggleCategory = (val: string) => {
    setCategoryFilter(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    )
    setPage(1)
  }

  const toggleSkill = (val: string) => {
    setSkillFilter(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    )
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['partnerProjects', page, searchQuery, categoryFilter, skillFilter, ownerTypeFilter],
    queryFn: () =>
      partnerMatchingService.getProjects({
        page, limit: 12,
        search: searchQuery || undefined,
        category: categoryFilter.length === 1 ? categoryFilter[0] : undefined,
        ownerType: ownerTypeFilter !== 'all' ? ownerTypeFilter : undefined,
      }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['partnerProjectStats'],
    queryFn: () => partnerMatchingService.getProjectStats(),
  })

  const projects: PartnerProjectItem[] = data?.projects || []
  const pagination = data?.pagination
  const stats = statsData?.stats

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />

      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">프로젝트</h1>
            <p className="text-text-muted text-sm mt-1">파트너와 함께할 프로젝트를 찾아보세요</p>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <span className="text-sm text-text-muted whitespace-nowrap">
                <span className="font-medium text-text-secondary">{stats.total}개</span> 프로젝트
              </span>
            )}
            {isCorporate && (
              <Link href="/partner/projects/new"
                className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-text-primary rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> 등록
              </Link>
            )}
          </div>
        </div>


        {/* Filter + Search bar */}
        <div className="flex items-center gap-2 mb-6 border-b border-line pb-4">
          <select
            value={ownerTypeFilter}
            onChange={(e) => { setOwnerTypeFilter(e.target.value); setPage(1) }}
            className="bg-bg-secondary border border-line text-text-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent whitespace-nowrap"
          >
            <option value="all">기업 형태</option>
            <option value="developer">개발자</option>
            <option value="partner">파트너</option>
          </select>
          {/* 협업 파트 멀티셀렉 */}
          <div ref={categoryDropRef} className="relative">
            <button
              onClick={() => setShowCategoryDrop(v => !v)}
              className={`flex items-center gap-2 bg-bg-secondary border rounded-lg px-3 py-2 text-base whitespace-nowrap transition-colors ${
                categoryFilter.length > 0
                  ? 'border-accent text-accent'
                  : 'border-line text-text-secondary hover:border-accent/50'
              }`}
            >
              {categoryFilter.length === 0
                ? '협업 파트'
                : categoryFilter.length === 1
                  ? categoryFilter[0]
                  : `협업 파트 ${categoryFilter.length}개`}
              <svg className={`w-3.5 h-3.5 transition-transform ${showCategoryDrop ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCategoryDrop && (
              <div className="absolute top-full left-0 mt-1 bg-bg-card border border-line rounded-xl shadow-xl z-50 py-1 min-w-[140px]">
                {categoryOptions.filter(o => o.value !== 'all').map((opt) => {
                  const checked = categoryFilter.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleCategory(opt.value)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-base hover:bg-bg-tertiary transition-colors text-left"
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        checked ? 'bg-accent border-accent' : 'border-line'
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className={checked ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
                {categoryFilter.length > 0 && (
                  <div className="border-t border-line/50 mt-1 pt-1">
                    <button
                      onClick={() => { setCategoryFilter([]); setPage(1) }}
                      className="w-full px-3 py-1.5 text-base text-text-muted hover:text-danger transition-colors text-left"
                    >
                      초기화
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 필요 스킬 멀티셀렉 */}
          <div ref={skillDropRef} className="relative">
            <button
              onClick={() => setShowSkillDrop(v => !v)}
              className={`flex items-center gap-2 bg-bg-secondary border rounded-lg px-3 py-2 text-base whitespace-nowrap transition-colors ${
                skillFilter.length > 0
                  ? 'border-accent text-accent'
                  : 'border-line text-text-secondary hover:border-accent/50'
              }`}
            >
              {skillFilter.length === 0
                ? '필요 스킬'
                : skillFilter.length === 1
                  ? skillFilter[0]
                  : `필요 스킬 ${skillFilter.length}개`}
              <svg className={`w-3.5 h-3.5 transition-transform ${showSkillDrop ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSkillDrop && (
              <div className="absolute top-full left-0 mt-1 bg-bg-card border border-line rounded-xl shadow-xl z-50 py-1 min-w-[140px]">
                {SKILL_SUGGESTIONS.map((skill) => {
                  const checked = skillFilter.includes(skill)
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-base hover:bg-bg-tertiary transition-colors text-left"
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        checked ? 'bg-accent border-accent' : 'border-line'
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className={checked ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                        {skill}
                      </span>
                    </button>
                  )
                })}
                {skillFilter.length > 0 && (
                  <div className="border-t border-line/50 mt-1 pt-1">
                    <button
                      onClick={() => { setSkillFilter([]); setPage(1) }}
                      className="w-full px-3 py-1.5 text-base text-text-muted hover:text-danger transition-colors text-left"
                    >
                      초기화
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="프로젝트 또는 회사명 검색..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setPage(1) }}
            className="bg-bg-secondary border border-line text-text-secondary rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent whitespace-nowrap"
          >
            <option value="latest">최신 순</option>
            <option value="budget">금액 높은 순</option>
            <option value="deadline">마감 임박 순</option>
          </select>
        </div>

        {/* Project List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> 불러오는 중...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-text-muted text-sm">검색 결과가 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((project) => {
              const status = statusLabel[project.status] || statusLabel.recruiting
              const deadline = project.applicationDeadline
                ? new Date(project.applicationDeadline).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
                : null
              const companyName = project.ownerId?.companyInfo?.companyName || project.ownerId?.username

              return (
                <Link key={project._id} href={`/partner/projects/${project._id}`}
                  className="group bg-bg-secondary border border-line rounded-2xl p-5 hover:border-accent/40 hover:shadow-lg transition-all flex flex-col gap-3">

                  {/* Row 1: 프로젝트명 + 모집중 배지 */}
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-text-primary font-semibold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {project.title}
                    </h2>
                    <span className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-xl ${status.badge}`}>
                      {status.text}
                    </span>
                  </div>

                  {/* Row 2: 로고 + 회사명 */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">
                      {companyName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <p className="text-text-muted text-xs truncate">{companyName}</p>
                  </div>

                  {/* Row 3: 금액 + 마감일 */}
                  <div className="flex items-center gap-3 flex-wrap text-xs text-text-muted pl-8">
                    {(project.budget || project.budgetMin) && (
                      <span className="flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        {project.budget || `${project.budgetMin}~${project.budgetMax}`}
                      </span>
                    )}
                    {deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {deadline} 마감
                      </span>
                    )}
                  </div>

                  {/* Row 4: 지원자 */}
                  <div className="pl-8">
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Users className="w-3 h-3" />
                      {project.applicantCount}명 지원
                    </span>
                  </div>

                  {/* Row 5: 카테고리 + 스킬 + 지원자 + 지원하기 */}
                  <div className="mt-auto pt-3 border-t border-line/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="bg-bg-tertiary border border-line text-text-muted px-2 py-0.5 rounded-full text-xs flex-shrink-0">
                        {project.category}
                      </span>
                      {project.requiredSkills?.slice(0, 3).map((skill, i) => (
                        <span key={i} className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                          {skill}
                        </span>
                      ))}
                      {(project.requiredSkills?.length || 0) > 3 && (
                        <span className="text-text-muted text-xs">+{project.requiredSkills.length - 3}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-accent border-2 border-accent/40 px-4 py-2.5 rounded-xl group-hover:bg-accent group-hover:text-text-primary group-hover:border-accent transition-all whitespace-nowrap">
                        지원하기
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-1.5 mt-8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-base font-medium transition-colors ${
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
  )
}
