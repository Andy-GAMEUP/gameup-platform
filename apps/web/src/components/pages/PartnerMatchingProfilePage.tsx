'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import { partnerService } from '@/services/partnerService'
import { partnerMatchingService } from '@/services/partnerMatchingService'
import { CheckCircle2, AlertTriangle, UserPlus, X, Globe, EyeOff, Loader2, Briefcase, FileText } from 'lucide-react'

const PROJECT_STATUS_LABELS: Record<string, string> = {
  recruiting: '모집중', ongoing: '진행중', completed: '완료', cancelled: '취소됨', draft: '임시저장',
}
const PROJECT_STATUS_COLORS: Record<string, string> = {
  recruiting: 'bg-green-500/10 text-green-400 border-green-500/20',
  ongoing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-gray-500/10 text-text-muted border-line',
  cancelled: 'bg-red-500/10 text-danger border-danger/20',
  draft: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}
const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: '검토중', approved: '승인됨', rejected: '거절됨', 'on-hold': '보류중',
}
const APPLICATION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-danger border-danger/20',
  'on-hold': 'bg-gray-500/10 text-text-muted border-line',
}

const COMPANY_TYPE_LABELS: Record<string, string> = {
  developer: '개발사', publisher: '퍼블리셔', game_solution: '게임솔루션',
  game_service: '게임서비스', operations: '운영', qa: 'QA', marketing: '마케팅',
  development: '개발', original_art: '원화', other: '기타',
}

interface PartnerUser {
  _id: string
  username: string
  role: string
  profileImage?: string
  memberType?: string
  companyInfo?: { companyName?: string; companyType?: string[]; employeeCount?: number; description?: string }
  contactPerson?: { name?: string; email?: string; phone?: string }
  createdAt?: string
}

interface TeamMember {
  userId: { _id: string; username: string; role: string; profileImage?: string }
  addedAt: string
}

interface PartnerData {
  _id: string
  userId: PartnerUser
  status: string
  slogan: string
  introduction: string
  activityPlan: string
  externalUrl: string
  selectedTopics: string[]
  profileImage: string
  postCount: number
  isProfilePublic: boolean
  approvedAt?: string
  createdAt: string
  teamMembers?: TeamMember[]
}

export default function PartnerMatchingProfilePage() {
  const params = useParams()
  const id = params?.id as string
  const { user, isAuthenticated } = useAuth()
  const [activeSection, setActiveSection] = useState('home')
  const [activeProjectTab, setActiveProjectTab] = useState<'myProjects' | 'applications' | 'applicants'>('myProjects')
  const [teamSearch, setTeamSearch] = useState('')
  const [teamError, setTeamError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ _id: string; username: string; email: string } | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQ, setDebouncedQ] = useState('')
  const queryClient = useQueryClient()
  const [visibilityLoading, setVisibilityLoading] = useState(false)

  const handleToggleVisibility = async () => {
    if (!id || !partner) return
    const isPublic = partner.isProfilePublic
    const confirmed = confirm(isPublic ? '프로필을 비공개로 전환하시겠습니까?' : '프로필을 공개로 전환하시겠습니까?')
    if (!confirmed) return
    setVisibilityLoading(true)
    try {
      await partnerService.toggleProfileVisibility(id)
      queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] })
    } catch {
      alert('공개 설정 변경에 실패했습니다')
    } finally {
      setVisibilityLoading(false)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: channelData, isLoading } = useQuery({
    queryKey: ['partnerChannel', id],
    queryFn: () => partnerService.getPartnerChannel(id),
    enabled: !!id,
  })

  const { data: postsData } = useQuery({
    queryKey: ['partnerChannelPosts', id],
    queryFn: () => partnerService.getPartnerPosts(id, { limit: 20 }),
    enabled: !!id,
  })

  const partner = channelData?.partner as PartnerData | undefined
  const isOwnProfile = isAuthenticated && user?.id === partner?.userId?._id
  const partnerUserId = (partner?.userId as any)?._id as string | undefined
  const teamMemberIds = partner?.teamMembers?.map(m => m.userId?._id) || []
  const isTeamMember = isAuthenticated && !!user?.id && teamMemberIds.includes(user.id)
  const canEdit = isOwnProfile || isTeamMember

  const { data: userProjectsData } = useQuery({
    queryKey: ['partnerUserProjects', partnerUserId],
    queryFn: () => partnerMatchingService.getProjectsByUser(partnerUserId!),
    enabled: !!partnerUserId,
  })

  const { data: myApplicationsData } = useQuery({
    queryKey: ['partnerMyApplications'],
    queryFn: () => partnerMatchingService.getMyApplications(),
    enabled: isOwnProfile,
  })

  const { data: myProjectApplicantsData } = useQuery({
    queryKey: ['partnerMyProjectApplicants'],
    queryFn: () => partnerMatchingService.getMyProjectApplicants(),
    enabled: isOwnProfile,
  })

  const applicantStatusMutation = useMutation({
    mutationFn: ({ projectId, appId, status }: { projectId: string; appId: string; status: string }) =>
      partnerMatchingService.updateApplicationStatus(projectId, appId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerMyProjectApplicants'] })
    },
  })

  const userProjects: any[] = userProjectsData?.projects || []
  const myApplications: any[] = myApplicationsData?.applications || []
  const myProjectApplicants: any[] = myProjectApplicantsData?.applicants || []

  const { data: searchData } = useQuery({
    queryKey: ['teamUserSearch', debouncedQ],
    queryFn: () => partnerService.searchUsers(debouncedQ),
    enabled: debouncedQ.length >= 1 && !selectedUser,
  })
  const suggestions = searchData?.users || []

  const addMutation = useMutation({
    mutationFn: (username: string) => partnerService.addTeamMember(id, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] })
      setTeamSearch('')
      setSelectedUser(null)
      setTeamError('')
      setShowSuggestions(false)
    },
    onError: (err: any) => setTeamError(err?.response?.data?.message || '팀원 추가 실패'),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => partnerService.removeTeamMember(id, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] }),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh] text-text-secondary">
          파트너 채널을 찾을 수 없습니다.
        </div>
      </div>
    )
  }

  const partnerUser = partner.userId
  const username = partnerUser?.username || '?'
  const profileImage = partner.profileImage || partnerUser?.profileImage
  const companyCategory: string = (partnerUser as any)?.companyInfo?.companyCategory || ''
  const rawCompanyTypes: string[] = (partnerUser as any)?.companyInfo?.companyType || []
  // backward compat: old accounts have 'developer' in companyType
  const isDeveloperCompany = companyCategory === 'developer' || (!companyCategory && rawCompanyTypes.includes('developer'))
  const companyCategoryLabel = isDeveloperCompany ? '개발사' : '파트너'
  const companyTypes: string[] = rawCompanyTypes.filter(t => t !== 'developer')
  const joinDate = partnerUser?.createdAt
    ? new Date(partnerUser.createdAt).toLocaleDateString('ko-KR')
    : '-'
  const isNew = partner.approvedAt
    ? Date.now() - new Date(partner.approvedAt).getTime() < 1000 * 60 * 60 * 24 * 30
    : false

  const isProfileIncomplete = isOwnProfile && (!partner.introduction || !partner.activityPlan || !partner.selectedTopics?.length)

  const navItems = [
    { key: 'home', label: '파트너 홈' },
    { key: 'intro', label: '소개' },
    { key: 'plan', label: '활동 계획' },
    { key: 'topics', label: '활동 분야' },
    { key: 'posts', label: '채널 게시글', count: partner.postCount || 0 },
    { key: 'projectActivity', label: '프로젝트 활동', count: userProjects.length + (isOwnProfile ? myApplications.length : 0) },
    ...(isOwnProfile ? [{ key: 'team', label: '팀원 관리', count: partner.teamMembers?.length || 0 }] : []),
  ]

  const posts = (postsData?.posts as any[]) || []

  return (
    <div className="min-h-screen bg-bg-secondary">
      <Navbar />

      {/* ── Header ── */}
      <div className="relative bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-accent/10 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute right-40 bottom-0 w-52 h-52 rounded-full bg-teal-500/5 translate-y-1/2 pointer-events-none" />

        <div className="relative container mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full border-2 border-white/20 overflow-hidden flex-shrink-0 bg-accent/40 flex items-center justify-center text-3xl font-bold text-white">
                {profileImage
                  ? <img src={profileImage} alt="" className="w-full h-full object-cover" />
                  : username[0]?.toUpperCase()}
              </div>

              <div>
                {/* Name + badges */}
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-white">{username}</h1>
                </div>

                {/* Company category + types */}
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                    {companyCategoryLabel}
                  </span>
                  {companyTypes.map(t => (
                    <span key={t} className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                      {COMPANY_TYPE_LABELS[t] || t}
                    </span>
                  ))}
                </div>

                {/* Slogan */}
                {partner.slogan && (
                  <p className="text-slate-300 text-sm mt-2 italic">"{partner.slogan}"</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Incomplete profile alert ── */}
      {isProfileIncomplete && (
        <div className="container mx-auto px-6 pt-4">
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              프로젝트에 지원하려면{' '}
              {!partner.introduction && <button onClick={() => setActiveSection('intro')} className="font-semibold underline">소개</button>}
              {!partner.introduction && !partner.activityPlan && ', '}
              {!partner.activityPlan && <button onClick={() => setActiveSection('plan')} className="font-semibold underline">활동 계획</button>}
              {(!partner.introduction || !partner.activityPlan) && !partner.selectedTopics?.length && ', '}
              {!partner.selectedTopics?.length && <button onClick={() => setActiveSection('topics')} className="font-semibold underline">활동 분야</button>}
              를 등록해주세요.
            </span>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="container mx-auto px-6 py-6 flex gap-6 items-start">

        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 sticky top-20">
          <nav className="bg-bg-card border border-line rounded-xl overflow-hidden">
            {navItems.map((item) => (
              <button key={item.key} onClick={() => setActiveSection(item.key)}
                className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between border-b border-line/40 last:border-b-0 transition-colors
                  ${activeSection === item.key
                    ? 'bg-accent/10 text-accent font-semibold border-l-2 border-l-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}>
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="text-text-muted text-xs tabular-nums">{item.count}</span>
                )}
              </button>
            ))}
          </nav>
          {isOwnProfile && (
            <button
              onClick={handleToggleVisibility}
              disabled={visibilityLoading}
              className={`w-full mt-2 flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors font-medium ${
                partner.isProfilePublic
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {visibilityLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : partner.isProfilePublic ? (
                <><Globe className="w-4 h-4" /> 공개중</>
              ) : (
                <><EyeOff className="w-4 h-4" /> 비공개</>
              )}
            </button>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* HOME */}
          {activeSection === 'home' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* Topics stat */}
                <div className="bg-bg-card border border-line rounded-xl p-5">
                  <p className="text-text-secondary text-sm mb-2">활동 분야</p>
                  <p className="text-3xl font-bold text-text-primary">{partner.selectedTopics?.length || 0}개</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {partner.selectedTopics?.length
                      ? partner.selectedTopics.slice(0, 4).map(t => (
                          <span key={t} className="text-xs bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full">{t}</span>
                        ))
                      : <span className="text-xs text-text-muted">등록된 활동 분야 없음</span>}
                    {(partner.selectedTopics?.length || 0) > 4 && (
                      <span className="text-xs text-text-muted">+{partner.selectedTopics!.length - 4}</span>
                    )}
                  </div>
                </div>

                {/* Posts stat */}
                <div className="bg-bg-card border border-line rounded-xl p-5">
                  <p className="text-text-secondary text-sm mb-2">채널 게시글</p>
                  <p className="text-3xl font-bold text-text-primary">{partner.postCount || 0}건</p>
                  <div className="mt-3 space-y-1">
                    {posts.length
                      ? posts.slice(0, 2).map((p: any) => (
                          <p key={p._id} className="text-xs text-text-muted truncate">· {p.title}</p>
                        ))
                      : <span className="text-xs text-text-muted">작성된 게시글 없음</span>}
                  </div>
                </div>
              </div>

              {/* Business types */}
              <div className="bg-bg-card border border-line rounded-xl p-5">
                <h2 className="text-text-primary font-semibold mb-3">사업 형태</h2>
                <div className="flex flex-wrap gap-2">
                  {companyTypes.length > 0
                    ? companyTypes.map(t => (
                        <span key={t} className="text-sm bg-bg-tertiary text-text-secondary border border-line px-3 py-1 rounded-full">
                          {COMPANY_TYPE_LABELS[t] || t}
                        </span>
                      ))
                    : <span className="text-sm text-text-muted">등록된 사업 형태 없음</span>
                  }
                </div>
              </div>

              {/* Intro summary */}
              <div className="bg-bg-card border border-line rounded-xl p-5">
                <h2 className="text-text-primary font-semibold mb-3">소개</h2>
                {partner.introduction
                  ? <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line line-clamp-4">{partner.introduction}</p>
                  : <p className="text-text-muted text-sm">등록된 소개가 없습니다.</p>}
              </div>

              {/* Activity plan summary */}
              {partner.activityPlan && (
                <div className="bg-bg-card border border-line rounded-xl p-5">
                  <h2 className="text-text-primary font-semibold mb-3">활동 계획</h2>
                  <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line line-clamp-3">{partner.activityPlan}</p>
                </div>
              )}

              {/* External link */}
              {partner.externalUrl && (
                <div className="bg-bg-card border border-line rounded-xl p-5">
                  <h2 className="text-text-primary font-semibold mb-3">외부 링크</h2>
                  <a href={partner.externalUrl} target="_blank" rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm break-all">{partner.externalUrl}</a>
                </div>
              )}
            </>
          )}

          {/* INTRO */}
          {activeSection === 'intro' && (
            <div className="bg-bg-card border border-line rounded-xl p-6">
              <h2 className="text-text-primary font-semibold text-lg mb-4">소개</h2>
              {partner.introduction
                ? <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{partner.introduction}</p>
                : <p className="text-text-muted text-sm">등록된 소개가 없습니다.</p>}
            </div>
          )}

          {/* PLAN */}
          {activeSection === 'plan' && (
            <div className="bg-bg-card border border-line rounded-xl p-6">
              <h2 className="text-text-primary font-semibold text-lg mb-4">활동 계획</h2>
              {partner.activityPlan
                ? <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{partner.activityPlan}</p>
                : <p className="text-text-muted text-sm">등록된 활동 계획이 없습니다.</p>}
            </div>
          )}

          {/* TOPICS */}
          {activeSection === 'topics' && (
            <div className="bg-bg-card border border-line rounded-xl p-6">
              <h2 className="text-text-primary font-semibold text-lg mb-4">활동 분야</h2>
              {partner.selectedTopics?.length
                ? (
                  <div className="flex flex-wrap gap-2">
                    {partner.selectedTopics.map(t => (
                      <span key={t} className="bg-accent/10 text-accent border border-accent/20 px-3 py-1.5 rounded-lg text-sm font-medium">{t}</span>
                    ))}
                  </div>
                )
                : <p className="text-text-muted text-sm">등록된 활동 분야가 없습니다.</p>}
            </div>
          )}

          {/* POSTS */}
          {activeSection === 'posts' && (
            <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="text-text-primary font-semibold text-lg">채널 게시글</h2>
              </div>
              {posts.length
                ? posts.map((post: any) => (
                    <Link key={post._id} href={`/partner/${id}/${post._id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-bg-tertiary transition-colors border-b border-line/40 last:border-b-0">
                      <div className="min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">{post.title}</p>
                        <p className="text-text-muted text-xs mt-0.5">
                          {post.topic && <span>{post.topic} · </span>}
                          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <span className="text-text-muted text-xs ml-4 flex-shrink-0">조회 {post.views || 0}</span>
                    </Link>
                  ))
                : <div className="px-5 py-14 text-center text-text-muted text-sm">작성된 게시글이 없습니다.</div>}
            </div>
          )}

          {/* PROJECT ACTIVITY */}
          {activeSection === 'projectActivity' && (
            <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
              {/* 상단 탭 */}
              <div className="flex border-b border-line">
                <button
                  onClick={() => setActiveProjectTab('myProjects')}
                  className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    activeProjectTab === 'myProjects'
                      ? 'border-accent text-accent'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  등록 프로젝트
                  <span className="text-xs tabular-nums opacity-70">({userProjects.length})</span>
                </button>
                {isOwnProfile && (
                  <button
                    onClick={() => setActiveProjectTab('applicants')}
                    className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                      activeProjectTab === 'applicants'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    지원자 관리
                    <span className="text-xs tabular-nums opacity-70">({myProjectApplicants.length})</span>
                  </button>
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => setActiveProjectTab('applications')}
                    className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                      activeProjectTab === 'applications'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    내가한 지원
                    <span className="text-xs tabular-nums opacity-70">({myApplications.length})</span>
                  </button>
                )}
              </div>

              {/* 등록 프로젝트 */}
              {activeProjectTab === 'myProjects' && (
                userProjects.length === 0 ? (
                  <div className="px-5 py-14 text-center text-text-muted text-sm">등록된 프로젝트가 없습니다.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-line bg-bg-tertiary/50">
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24 border-r border-line/20">상태</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24 border-r border-line/20">카테고리</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted border-r border-line/20">프로젝트명</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28 border-r border-line/20">마감일</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-20 border-r border-line/20">지원자</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28">등록일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userProjects.map((project: any) => (
                          <tr key={project._id} className="border-b border-line/40 last:border-b-0 hover:bg-bg-tertiary transition-colors">
                            <td className="px-5 py-3 border-r border-line/20">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${PROJECT_STATUS_COLORS[project.status] || PROJECT_STATUS_COLORS.draft}`}>
                                {PROJECT_STATUS_LABELS[project.status] || project.status}
                              </span>
                            </td>
                            <td className="px-3 py-3 border-r border-line/20">
                              <span className="text-xs text-text-muted bg-bg-tertiary border border-line px-2 py-0.5 rounded-full whitespace-nowrap">
                                {project.category}
                              </span>
                            </td>
                            <td className="px-3 py-3 max-w-0 border-r border-line/20">
                              <Link href={`/partner/projects/${project._id}`} className="text-text-primary font-medium hover:text-accent transition-colors truncate block">
                                {project.title}
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/20">
                              {project.applicationDeadline
                                ? new Date(project.applicationDeadline).toLocaleDateString('ko-KR')
                                : '-'}
                            </td>
                            <td className="px-3 py-3 text-center text-text-secondary text-xs border-r border-line/20">
                              {project.applicantCount || 0}명
                            </td>
                            <td className="px-5 py-3 text-text-muted text-xs whitespace-nowrap">
                              {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* 지원 현황 - 본인만 */}
              {activeProjectTab === 'applications' && isOwnProfile && (
                myApplications.length === 0 ? (
                  <div className="px-5 py-14 text-center text-text-muted text-sm">지원한 프로젝트가 없습니다.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-line bg-bg-tertiary/50">
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24 border-r border-line/20">상태</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24 border-r border-line/20">카테고리</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted border-r border-line/20">프로젝트명</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28 border-r border-line/20">예산</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28">지원일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myApplications.map((app: any) => {
                          const project = typeof app.projectId === 'object' ? app.projectId : null
                          return (
                            <tr key={app._id} className="border-b border-line/40 last:border-b-0 hover:bg-bg-tertiary transition-colors">
                              <td className="px-5 py-3 border-r border-line/20">
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${APPLICATION_STATUS_COLORS[app.status] || APPLICATION_STATUS_COLORS.pending}`}>
                                  {APPLICATION_STATUS_LABELS[app.status] || app.status}
                                </span>
                              </td>
                              <td className="px-3 py-3 border-r border-line/20">
                                {project?.category
                                  ? <span className="text-xs text-text-muted bg-bg-tertiary border border-line px-2 py-0.5 rounded-full whitespace-nowrap">{project.category}</span>
                                  : <span className="text-text-muted text-xs">-</span>}
                              </td>
                              <td className="px-3 py-3 max-w-0 border-r border-line/20">
                                <p className="text-text-primary font-medium truncate">
                                  {project?.title || '프로젝트 정보 없음'}
                                </p>
                              </td>
                              <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/20">
                                {project?.budget || '-'}
                              </td>
                              <td className="px-5 py-3 text-text-muted text-xs whitespace-nowrap">
                                {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* 지원자 관리 - 본인만 */}
              {activeProjectTab === 'applicants' && isOwnProfile && (
                myProjectApplicants.length === 0 ? (
                  <div className="px-5 py-14 text-center text-text-muted text-sm">등록된 프로젝트에 지원한 사람이 없습니다.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-line bg-bg-tertiary/50">
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24 border-r border-line/20">상태</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted border-r border-line/20">프로젝트명</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted border-r border-line/20">지원자</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28 border-r border-line/20">제안 금액</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28 border-r border-line/20">지원일</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-52">작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myProjectApplicants.map((app: any) => {
                          const project = typeof app.projectId === 'object' ? app.projectId : null
                          return (
                            <tr key={app._id} className="border-b border-line/40 last:border-b-0 hover:bg-bg-tertiary transition-colors">
                              <td className="px-5 py-3 border-r border-line/20">
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${APPLICATION_STATUS_COLORS[app.status] || APPLICATION_STATUS_COLORS.pending}`}>
                                  {APPLICATION_STATUS_LABELS[app.status] || app.status}
                                </span>
                              </td>
                              <td className="px-3 py-3 max-w-0 border-r border-line/20">
                                {project
                                  ? (
                                    <Link href={`/partner/projects/${project._id}`} className="text-text-primary font-medium hover:text-accent transition-colors truncate block">
                                      {project.title}
                                    </Link>
                                  )
                                  : <span className="text-text-muted text-xs">-</span>}
                              </td>
                              <td className="px-3 py-3 max-w-0 border-r border-line/20">
                                <p className="text-text-primary font-medium truncate">{app.applicantName}</p>
                                <p className="text-text-muted text-xs truncate">
                                  {app.applicantId?.companyInfo?.companyName || app.applicantId?.memberType}
                                </p>
                              </td>
                              <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/20">
                                {app.proposedBudget || '-'}
                              </td>
                              <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/20">
                                {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-5 py-3">
                                {project && (
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => applicantStatusMutation.mutate({ projectId: project._id, appId: app._id, status: 'approved' })}
                                      className="bg-green-600 hover:bg-green-700 text-text-primary px-2.5 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      승인
                                    </button>
                                    <button
                                      onClick={() => applicantStatusMutation.mutate({ projectId: project._id, appId: app._id, status: 'on-hold' })}
                                      className="border border-line hover:border-line text-text-secondary px-2.5 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      보류
                                    </button>
                                    <button
                                      onClick={() => applicantStatusMutation.mutate({ projectId: project._id, appId: app._id, status: 'rejected' })}
                                      className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-2.5 py-1 rounded text-xs font-medium transition-colors"
                                    >
                                      거절
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}

          {/* TEAM - 소유자만 접근 */}
          {activeSection === 'team' && isOwnProfile && (
            <div className="space-y-4">
              <div className="bg-bg-card border border-line rounded-xl p-5">
                <h2 className="text-text-primary font-semibold text-lg mb-1">팀원 추가</h2>
                <p className="text-text-muted text-xs mb-4">게임회원의 사용자명 또는 이메일을 입력해 채널 수정 권한을 부여합니다</p>
                <div className="flex gap-2">
                  <div ref={searchRef} className="relative flex-1">
                    <input
                      value={teamSearch}
                      onChange={e => {
                        const v = e.target.value
                        setTeamSearch(v)
                        setSelectedUser(null)
                        setTeamError('')
                        setShowSuggestions(true)
                        if (debounceRef.current) clearTimeout(debounceRef.current)
                        debounceRef.current = setTimeout(() => setDebouncedQ(v.trim()), 250)
                      }}
                      onFocus={() => teamSearch && setShowSuggestions(true)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && teamSearch.trim()) {
                          addMutation.mutate(selectedUser?.username || teamSearch.trim())
                        }
                      }}
                      placeholder="사용자명 또는 이메일 입력"
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-line rounded-xl shadow-xl z-50 overflow-hidden">
                        {suggestions.map(u => (
                          <button
                            key={u._id}
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault()
                              setTeamSearch(u.username)
                              setSelectedUser(u)
                              setShowSuggestions(false)
                              setTeamError('')
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-full bg-accent/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {u.username[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-text-primary text-sm font-medium">{u.username}</p>
                              <p className="text-text-muted text-xs truncate">{u.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => teamSearch.trim() && addMutation.mutate(selectedUser?.username || teamSearch.trim())}
                    disabled={addMutation.isPending || !teamSearch.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 self-start"
                  >
                    <UserPlus className="w-4 h-4" />
                    추가
                  </button>
                </div>
                {teamError && <p className="text-danger text-xs mt-2">{teamError}</p>}
              </div>

              <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-line">
                  <h2 className="text-text-primary font-semibold">팀원 목록 ({partner.teamMembers?.length || 0})</h2>
                </div>
                {!partner.teamMembers?.length ? (
                  <div className="px-5 py-12 text-center text-text-muted text-sm">등록된 팀원이 없습니다.</div>
                ) : partner.teamMembers.map((m) => (
                  <div key={m.userId._id} className="flex items-center justify-between px-5 py-3 border-b border-line/40 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/40 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {m.userId.profileImage
                          ? <img src={m.userId.profileImage} alt="" className="w-full h-full object-cover rounded-full" />
                          : m.userId.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-text-primary text-sm font-medium">{m.userId.username}</p>
                        <p className="text-text-muted text-xs">{new Date(m.addedAt).toLocaleDateString('ko-KR')} 추가됨</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMutation.mutate(m.userId._id)}
                      disabled={removeMutation.isPending}
                      className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 border border-danger/30 hover:border-danger/60 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                      제거
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
