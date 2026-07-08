'use client'

import { useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import { partnerService } from '@/services/partnerService'
import { partnerMatchingService } from '@/services/partnerMatchingService'
import { AlertTriangle, Globe, EyeOff, Loader2 } from 'lucide-react'
import { PartnerProfileContext } from './PartnerProfileContext'
import { COMPANY_TYPE_LABELS, PartnerData } from './constants'

export default function PartnerProfileShell({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const id = params?.id as string
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [visibilityLoading, setVisibilityLoading] = useState(false)

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
    enabled: !!isOwnProfile,
  })

  const { data: myProjectApplicantsData } = useQuery({
    queryKey: ['partnerMyProjectApplicants'],
    queryFn: () => partnerMatchingService.getMyProjectApplicants(),
    enabled: !!isOwnProfile,
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
  const posts = (postsData?.posts as any[]) || []

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

  const isProfileIncomplete = isOwnProfile && (!partner.introduction || !partner.activityPlan || !partner.selectedTopics?.length)

  const base = `/partner/${id}`
  const navItems = [
    { key: 'home', label: '파트너 홈', href: base },
    { key: 'intro', label: '소개', href: `${base}/intro` },
    { key: 'plan', label: '활동 계획', href: `${base}/plan` },
    { key: 'topics', label: '활동 분야', href: `${base}/topics` },
    { key: 'posts', label: '채널 게시글', href: `${base}/posts`, count: partner.postCount || 0 },
    { key: 'projectActivity', label: '프로젝트 활동', href: `${base}/projects`, count: userProjects.length + (isOwnProfile ? myApplications.length : 0) },
    ...(isOwnProfile ? [{ key: 'team', label: '팀원 관리', href: `${base}/team`, count: partner.teamMembers?.length || 0 }] : []),
  ]

  const isItemActive = (href: string) => (href === base ? pathname === base : pathname === href || pathname?.startsWith(`${href}/`))

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
              {!partner.introduction && <Link href={`${base}/intro`} className="font-semibold underline">소개</Link>}
              {!partner.introduction && !partner.activityPlan && ', '}
              {!partner.activityPlan && <Link href={`${base}/plan`} className="font-semibold underline">활동 계획</Link>}
              {(!partner.introduction || !partner.activityPlan) && !partner.selectedTopics?.length && ', '}
              {!partner.selectedTopics?.length && <Link href={`${base}/topics`} className="font-semibold underline">활동 분야</Link>}
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
              <Link key={item.key} href={item.href}
                className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between border-b border-line/40 last:border-b-0 transition-colors
                  ${isItemActive(item.href)
                    ? 'bg-accent/10 text-accent font-semibold border-l-2 border-l-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}>
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="text-text-muted text-xs tabular-nums">{item.count}</span>
                )}
              </Link>
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
          <PartnerProfileContext.Provider value={{
            id,
            partner,
            isOwnProfile: !!isOwnProfile,
            isTeamMember,
            canEdit: !!canEdit,
            posts,
            userProjects,
            myApplications,
            myProjectApplicants,
            applicantStatusMutation,
          }}>
            {children}
          </PartnerProfileContext.Provider>
        </main>
      </div>
    </div>
  )
}
