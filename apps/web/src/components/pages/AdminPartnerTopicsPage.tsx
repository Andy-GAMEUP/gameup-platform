'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import partnerService from '@/services/partnerService'
import {
  Loader2, Search, X,
  FolderKanban, Users, TrendingUp, CalendarClock,
  ChevronLeft, ChevronRight, Eye, ArrowUpDown,
} from 'lucide-react'

// ────────── 타입 ──────────

interface ProjectItem {
  _id: string
  title: string
  description: string
  category: string
  status: string
  budget?: string
  budgetMin?: string
  budgetMax?: string
  duration: string
  location: string
  applicationDeadline?: string
  applicantCount: number
  requiredSkills: string[]
  ownerId?: { _id: string; username: string; email: string; companyInfo?: { companyName?: string } }
  createdAt: string
}

interface ProjectStats {
  total: number
  recruiting: number
  ongoing: number
  completed: number
  cancelled: number
  newThisWeek: number
  totalApplicants: number
  deadlineSoon: number
  popularProjects: ProjectItem[]
}

interface Applicant {
  _id: string
  applicantName: string
  email: string
  phone?: string
  experience?: string
  proposedBudget?: string
  portfolioUrl?: string
  proposal?: string
  status: string
  createdAt: string
  applicantId?: { _id: string; username: string; companyInfo?: { companyName?: string } }
}

const CATEGORIES = [
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
  { value: '기타', label: '기타' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'draft', label: '초안' },
  { value: 'recruiting', label: '모집중' },
  { value: 'ongoing', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
]

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
  { value: 'deadline', label: '마감임박순' },
  { value: 'popular', label: '지원자순' },
]

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: '초안' },
    recruiting: { bg: 'bg-green-100', text: 'text-green-700', label: '모집중' },
    ongoing: { bg: 'bg-blue-100', text: 'text-blue-700', label: '진행중' },
    completed: { bg: 'bg-purple-100', text: 'text-purple-700', label: '완료' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: '취소' },
  }
  const s = map[status] || map.draft
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
}

// ────────── 메인 페이지 ──────────

export default function AdminPartnerTopicsPage() {
  // ── 프로젝트 관리 state ──
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null)
  const [projectLoading, setProjectLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // ── 지원자 모달 state ──
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [applicantLoading, setApplicantLoading] = useState(false)

  // ── 토스트 ──
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  // ── 프로젝트 로드 ──
  const loadProjects = useCallback(async () => {
    setProjectLoading(true)
    try {
      const data = await partnerService.admin.getProjects({
        page: currentPage, limit: 15, search: searchQuery || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort: sortBy,
      })
      setProjects(data.projects || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.total || 0)
    } catch { showToast('프로젝트 불러오기 실패', false) }
    finally { setProjectLoading(false) }
  }, [currentPage, searchQuery, categoryFilter, statusFilter, sortBy])

  const loadProjectStats = useCallback(async () => {
    try {
      const data = await partnerService.admin.getProjectStats()
      setProjectStats(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadProjects(); loadProjectStats() }, [loadProjects, loadProjectStats])

  // ── 프로젝트 핸들러 ──
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await partnerService.admin.updateProjectStatus(id, newStatus)
      setProjects(prev => prev.map(p => p._id === id ? { ...p, status: newStatus } : p))
      showToast('상태가 변경되었습니다')
      loadProjectStats()
    } catch { showToast('상태 변경 실패', false) }
  }

  const handleViewApplicants = async (project: ProjectItem) => {
    setSelectedProject(project); setApplicantLoading(true)
    try {
      const data = await partnerService.admin.getProjectApplicants(project._id)
      setApplicants(data.applicants || [])
    } catch { showToast('지원자 조회 실패', false) }
    finally { setApplicantLoading(false) }
  }

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); loadProjects() }

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('ko-KR') : '-'
  const isDeadlineSoon = (d?: string) => {
    if (!d) return false
    const diff = new Date(d).getTime() - Date.now()
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
  }
  const isExpired = (d?: string) => d ? new Date(d).getTime() < Date.now() : false

  const formatBudget = (p: ProjectItem) => {
    if (p.budget) return p.budget
    if (p.budgetMin && p.budgetMax) return `${p.budgetMin} ~ ${p.budgetMax}`
    return '-'
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-text-primary font-bold text-xl">프로젝트 관리</h1>

        {/* 통계 카드 */}
        {projectStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-secondary border border-line rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><FolderKanban className="w-5 h-5 text-blue-600" /></div>
                <div><p className="text-text-muted text-xs">전체 프로젝트</p><p className="text-text-primary text-xl font-bold">{projectStats.total}</p></div>
              </div>
            </div>
            <div className="bg-bg-secondary border border-line rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                <div><p className="text-text-muted text-xs">모집중</p><p className="text-text-primary text-xl font-bold">{projectStats.recruiting}</p></div>
              </div>
            </div>
            <div className="bg-bg-secondary border border-line rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><CalendarClock className="w-5 h-5 text-amber-600" /></div>
                <div><p className="text-text-muted text-xs">마감임박 (7일내)</p><p className="text-text-primary text-xl font-bold">{projectStats.deadlineSoon}</p></div>
              </div>
            </div>
            <div className="bg-bg-secondary border border-line rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Users className="w-5 h-5 text-purple-600" /></div>
                <div><p className="text-text-muted text-xs">총 지원자</p><p className="text-text-primary text-xl font-bold">{projectStats.totalApplicants}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* 인기 프로젝트 TOP 5 */}
        {projectStats?.popularProjects && projectStats.popularProjects.length > 0 && (
          <div className="bg-bg-secondary border border-line rounded-xl p-5">
            <h3 className="text-text-primary font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent" /> 인기 프로젝트 TOP 5</h3>
            <div className="space-y-2">
              {projectStats.popularProjects.map((p, i) => (
                <div key={p._id} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-muted'}`}>{i + 1}</span>
                  <span className="flex-1 text-text-primary text-sm truncate">{p.title}</span>
                  <span className="text-xs text-text-muted">{p.category}</span>
                  {statusBadge(p.status)}
                  <span className="text-sm font-medium text-accent">{p.applicantCount}명 지원</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 검색 & 필터 */}
        <div className="bg-bg-secondary border border-line rounded-xl p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="프로젝트명 또는 설명 검색..."
                className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-line rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <button type="submit" className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">검색</button>
          </form>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-text-muted text-xs whitespace-nowrap">카테고리</label>
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
                className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-text-muted text-xs whitespace-nowrap">상태</label>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none">
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
              <select value={sortBy} onChange={e => { setSortBy(e.target.value); setCurrentPage(1) }}
                className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none">
                {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <span className="ml-auto text-text-muted text-xs self-center">총 {totalCount}개 프로젝트</span>
          </div>
        </div>

        {/* 프로젝트 리스트 */}
        {projectLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-text-secondary" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-text-secondary"><p className="text-sm">프로젝트가 없습니다</p></div>
        ) : (
          <div className="space-y-3">
            {projects.map(project => (
              <div key={project._id} className="bg-bg-secondary border border-line rounded-xl p-5 hover:border-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {statusBadge(project.status)}
                      <span className="px-2 py-0.5 rounded-full text-xs bg-bg-tertiary text-text-secondary">{project.category}</span>
                      {isDeadlineSoon(project.applicationDeadline) && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-medium">마감임박</span>
                      )}
                      {isExpired(project.applicationDeadline) && project.status === 'recruiting' && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600">마감됨</span>
                      )}
                    </div>
                    <h3 className="text-text-primary font-semibold text-base truncate">{project.title}</h3>
                    <p className="text-text-muted text-sm mt-1 line-clamp-1">{project.description || '설명 없음'}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-text-secondary">
                      <span>등록사: {project.ownerId?.companyInfo?.companyName || project.ownerId?.username || '-'}</span>
                      <span>예산: {formatBudget(project)}</span>
                      <span>기간: {project.duration || '-'}</span>
                      <span>마감일: <span className={isDeadlineSoon(project.applicationDeadline) ? 'text-red-500 font-medium' : ''}>{formatDate(project.applicationDeadline)}</span></span>
                      <span>등록일: {formatDate(project.createdAt)}</span>
                    </div>
                    {project.requiredSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {project.requiredSkills.slice(0, 5).map(skill => (
                          <span key={skill} className="px-2 py-0.5 bg-bg-tertiary text-text-muted rounded text-xs">{skill}</span>
                        ))}
                        {project.requiredSkills.length > 5 && <span className="text-text-muted text-xs">+{project.requiredSkills.length - 5}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button onClick={() => handleViewApplicants(project)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-xs font-medium transition-colors">
                      <Users className="w-3.5 h-3.5" /> 지원자 {project.applicantCount}명
                    </button>
                    <select value={project.status} onChange={e => handleStatusChange(project._id, e.target.value)}
                      className="bg-bg-tertiary border border-line rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none">
                      <option value="draft">초안</option>
                      <option value="recruiting">모집중</option>
                      <option value="ongoing">진행중</option>
                      <option value="completed">완료</option>
                      <option value="cancelled">취소</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="p-2 rounded-lg bg-bg-secondary border border-line text-text-muted hover:text-text-primary disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
              const page = start + i
              if (page > totalPages) return null
              return (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === currentPage ? 'bg-accent text-white' : 'bg-bg-secondary border border-line text-text-muted hover:text-text-primary'}`}>
                  {page}
                </button>
              )
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-bg-secondary border border-line text-text-muted hover:text-text-primary disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ─── 지원자 모달 ─── */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedProject(null)}>
          <div className="bg-bg-primary border border-line rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div>
                <h2 className="text-text-primary font-bold text-lg">지원자 현황</h2>
                <p className="text-text-muted text-sm mt-0.5">{selectedProject.title}</p>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-2 text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
              {applicantLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-text-secondary" /></div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-12 text-text-secondary"><Users className="w-10 h-10 mx-auto mb-3 text-text-muted" /><p className="text-sm">아직 지원자가 없습니다</p></div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary text-sm">총 {applicants.length}명 지원</p>
                  {applicants.map(app => (
                    <div key={app._id} className="bg-bg-secondary border border-line rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-text-primary font-medium text-sm">{app.applicantName}</span>
                            {app.applicantId?.companyInfo?.companyName && (
                              <span className="text-text-muted text-xs">({app.applicantId.companyInfo.companyName})</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              app.status === 'approved' ? 'bg-green-100 text-green-700' :
                              app.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              app.status === 'on-hold' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {app.status === 'pending' ? '검토중' : app.status === 'approved' ? '승인' : app.status === 'on-hold' ? '보류' : '거절'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-text-muted mt-1">
                            <span>{app.email}</span>
                            {app.phone && <span>{app.phone}</span>}
                            {app.experience && <span>경력: {app.experience}</span>}
                            {app.proposedBudget && <span>제안예산: {app.proposedBudget}</span>}
                            <span>지원일: {formatDate(app.createdAt)}</span>
                          </div>
                          {app.proposal && <p className="text-text-secondary text-sm mt-2 line-clamp-2">{app.proposal}</p>}
                          {app.portfolioUrl && (
                            <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-accent text-xs mt-1 inline-flex items-center gap-1 hover:underline">
                              <Eye className="w-3 h-3" /> 포트폴리오
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-white shadow-lg z-50 ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}
