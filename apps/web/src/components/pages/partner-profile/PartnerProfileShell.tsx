'use client'

import { useState, useEffect } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import { partnerService } from '@/services/partnerService'
import { partnerMatchingService } from '@/services/partnerMatchingService'
import { gameService } from '@/services/gameService'
import { AlertTriangle, Globe, EyeOff, Loader2, Briefcase, UserPlus, Mail, Trash2 } from 'lucide-react'
import { PartnerProfileContext } from './PartnerProfileContext'
import { PartnerData } from './constants'
import ConfirmModal from '@/components/ConfirmModal'

export default function PartnerProfileShell({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const id = params?.id as string
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [visibilityLoading, setVisibilityLoading] = useState(false)
  const [showVisibilityConfirm, setShowVisibilityConfirm] = useState(false)

  const { data: channelData, isLoading, error: channelError } = useQuery({
    queryKey: ['partnerChannel', id],
    queryFn: () => partnerService.getPartnerChannel(id),
    enabled: !!id,
    retry: false,
  })
  const isPrivateChannel = (channelError as any)?.response?.status === 403

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

  const rawCompanyTypes: string[] = (partner?.userId as any)?.companyInfo?.companyType || []
  const companyCategory: string = (partner?.userId as any)?.companyInfo?.companyCategory || ''
  // backward compat: old accounts have 'developer' in companyType
  const isDeveloperCompany = companyCategory === 'developer' || (!companyCategory && rawCompanyTypes.includes('developer'))

  const { data: userProjectsData } = useQuery({
    queryKey: ['partnerUserProjects', partnerUserId],
    queryFn: () => partnerMatchingService.getProjectsByUser(partnerUserId!),
    enabled: !!partnerUserId,
  })

  const { data: developerGamesData } = useQuery({
    queryKey: ['partnerDeveloperGames', partnerUserId],
    queryFn: () => gameService.getAllGames({ developerId: partnerUserId!, serviceType: 'live', limit: 50 }),
    enabled: !!partnerUserId && isDeveloperCompany,
  })

  const { data: applicationStatsData } = useQuery({
    queryKey: ['partnerApplicationStats', partnerUserId],
    queryFn: () => partnerMatchingService.getApplicationStatsByUser(partnerUserId!),
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

  const { data: receivedMessagesData } = useQuery({
    queryKey: ['partnerReceivedMessages', id],
    queryFn: () => partnerService.getReceivedMessages(),
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
  const developerGames: any[] = developerGamesData?.games || []
  const receivedMessages = receivedMessagesData?.messages || []
  const participatingProjectCount = applicationStatsData?.participatingCount || 0
  const completedParticipatingProjectCount = applicationStatsData?.completedCount || 0

  const manageBase = `/partner/${id}/manage`
  const manageCounts = {
    manageProjects: userProjects.length + myApplications.length + myProjectApplicants.length,
    manageTeam: partner?.teamMembers?.length || 0,
  }
  const manageHrefs: Record<string, string> = {
    manageProjects: `${manageBase}/projects`,
    manageTeam: `${manageBase}/team`,
  }
  // guards against treating pre-existing data as "new" before its query has actually resolved
  const manageCountsReady = {
    manageProjects: userProjectsData !== undefined && myApplicationsData !== undefined && myProjectApplicantsData !== undefined,
    manageTeam: !!channelData,
  }
  const [manageSeen, setManageSeen] = useState<Record<string, number>>({})

  // "받은 메시지" unread tracking mirrors ReceivedMessagesSection's per-conversation (rootId)
  // logic (shares the same localStorage key) rather than a raw message count, so the sidebar
  // badge reflects the exact same "unread conversation" truth as the card-level NEW badge
  const [messageSeenMap, setMessageSeenMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOwnProfile || !id) return
    const load = () => {
      try {
        const raw = localStorage.getItem(`partnerMessageCardSeen:${id}`)
        setMessageSeenMap(raw ? JSON.parse(raw) : {})
      } catch {}
    }
    load()
    window.addEventListener('partnerMessageSeenChange', load)
    return () => window.removeEventListener('partnerMessageSeenChange', load)
  }, [isOwnProfile, id])

  const latestMessageIdByRoot = new Map<string, string>()
  for (const m of receivedMessages) {
    const rootId = (m as any).rootId || m._id
    if (!rootId || latestMessageIdByRoot.has(rootId)) continue
    latestMessageIdByRoot.set(rootId, m._id)
  }
  // no entry yet (never opened) counts as unseen too, so a brand-new conversation's very
  // first message lights up the sidebar badge just like any other unread conversation
  const hasUnreadMessage = Array.from(latestMessageIdByRoot.entries()).some(
    ([rootId, latestId]) => messageSeenMap[rootId] !== latestId
  )

  // establishes a baseline the first time each tab's data becomes available, so pre-existing
  // items are never flagged as "new" — this must NOT re-run just because a count changes,
  // otherwise a badge would never be visible for the tab currently being viewed
  useEffect(() => {
    if (!isOwnProfile || !id) return
    setManageSeen((prev) => {
      const next = { ...prev }
      let changed = false
      for (const [key, val] of Object.entries(manageCounts)) {
        if (prev[key] === undefined && manageCountsReady[key as keyof typeof manageCountsReady]) {
          next[key] = val
          changed = true
        }
      }
      if (changed) {
        try { localStorage.setItem(`partnerManageSeen:${id}`, JSON.stringify(next)) } catch {}
        return next
      }
      return prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile, id, manageCounts.manageProjects, manageCounts.manageTeam,
      manageCountsReady.manageProjects, manageCountsReady.manageTeam])

  // clears the "new" badge only on an actual navigation into the tab (pathname change) —
  // NOT while the user is already sitting on it and the count ticks up in the background
  useEffect(() => {
    if (!isOwnProfile || !id) return
    const activeKey = Object.keys(manageHrefs).find(
      (key) => pathname === manageHrefs[key] || pathname?.startsWith(`${manageHrefs[key]}/`)
    ) as keyof typeof manageCounts | undefined
    if (!activeKey || !manageCountsReady[activeKey]) return
    setManageSeen((prev) => {
      if (prev[activeKey] === manageCounts[activeKey]) return prev
      const next = { ...prev, [activeKey]: manageCounts[activeKey] }
      try { localStorage.setItem(`partnerManageSeen:${id}`, JSON.stringify(next)) } catch {}
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile, id, pathname])

  useEffect(() => {
    if (!isOwnProfile || !id) return
    try {
      const raw = localStorage.getItem(`partnerManageSeen:${id}`)
      if (raw) setManageSeen(JSON.parse(raw))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile, id])

  const handleToggleVisibility = async () => {
    if (!id || !partner) return
    setVisibilityLoading(true)
    try {
      await partnerService.toggleProfileVisibility(id)
      queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] })
      queryClient.invalidateQueries({ queryKey: ['partnerMatchingProfiles'] })
      queryClient.invalidateQueries({ queryKey: ['partnerMatchingStats'] })
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

  if (isPrivateChannel) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-text-secondary">
          <EyeOff className="w-8 h-8 text-text-muted" />
          <span>비공개로 전환된 채널입니다.</span>
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
  const username = partner.displayNameOverride || (partnerUser as any)?.companyInfo?.companyName || partnerUser?.username || '?'
  const profileImage = partner.profileImage || partnerUser?.profileImage
  const companyCategoryLabel = isDeveloperCompany ? '개발사' : '파트너'

  const isProfileIncomplete = isOwnProfile && !partner.introduction

  const base = `/partner/${id}`
  const projectsBase = `${manageBase}/projects`

  const manageChildren: any[] = [
    {
      key: 'manageProjects', label: '프로젝트 활동', href: projectsBase, icon: Briefcase,
      isNew: manageCounts.manageProjects > (manageSeen.manageProjects ?? manageCounts.manageProjects),
    },
    {
      key: 'manageMessages', label: '받은 메시지', href: `${manageBase}/messages`, icon: Mail,
      isNew: hasUnreadMessage,
      children: [
        { key: 'manageMessagesTrash', label: '메시지 휴지통', href: `${manageBase}/messages/trash`, icon: Trash2 },
      ],
    },
    {
      key: 'manageTeam', label: '팀원 관리', href: `${manageBase}/team`, icon: UserPlus,
      isNew: manageCounts.manageTeam > (manageSeen.manageTeam ?? manageCounts.manageTeam),
    },
  ]
  // "채널 관리" itself lights up whenever any child (at any depth) has its own NEW badge,
  // so an unread item doesn't go unnoticed behind a collapsed parent tab
  const hasNewDescendant = (items: any[]): boolean =>
    items.some((item) => item.isNew || (item.children && hasNewDescendant(item.children)))

  const navItems: any[] = [
    { key: 'home', label: '파트너 홈', href: base },
    { key: 'history', label: '회사 연혁', href: `${base}/history`, count: partner.history?.length || 0 },
    { key: 'skills', label: '보유 기술', href: `${base}/skills`, count: partner.skills?.length || 0 },
    ...(isDeveloperCompany ? [{ key: 'devGames', label: '개발 게임', href: `${base}/games`, count: developerGames.length }] : []),
    { key: 'portfolio', label: '포트폴리오', href: `${base}/portfolio`, count: partner.portfolio?.length || 0 },
    { key: 'posts', label: '등록 프로젝트', href: `${base}/posts`, count: userProjects.length },
    ...(isOwnProfile ? [{
      key: 'manage', label: '채널 관리', href: manageBase, isNew: hasNewDescendant(manageChildren),
      children: manageChildren,
    }] : []),
  ]

  const isItemActive = (href: string) => (href === base ? pathname === base : pathname === href || pathname?.startsWith(`${href}/`))

  const renderNavTree = (items: any[], depth = 0): React.ReactNode =>
    items.map((item) => {
      const active = isItemActive(item.href)
      const Icon = item.icon
      return (
        <div key={item.key} className={depth === 0 ? 'border-b border-line/40 last:border-b-0' : ''}>
          <Link href={item.href}
            className={`w-full text-left flex items-center justify-between transition-colors
              ${depth === 0 ? 'px-4 py-3 text-sm' : depth === 1 ? 'pl-8 pr-4 py-2.5 text-sm' : 'pl-12 pr-4 py-2 text-xs'}
              ${active
                ? 'bg-accent/10 text-accent font-semibold border-l-2 border-l-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}>
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="truncate">{item.label}</span>
            </span>
            {item.count !== undefined && (
              <span className="text-text-muted text-xs tabular-nums flex-shrink-0 ml-2">{item.count}</span>
            )}
            {item.isNew && (
              <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2">NEW</span>
            )}
          </Link>
          {item.children && active && (
            <div className="bg-bg-tertiary/20">
              {renderNavTree(item.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })

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

                {/* Company category */}
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                    {companyCategoryLabel}
                  </span>
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
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
            <span>
              프로젝트에 지원하려면{' '}
              <Link href={`${base}?edit=intro`} className="font-semibold underline text-amber-900 dark:text-amber-200 hover:text-amber-950 dark:hover:text-amber-100">소개</Link>
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
            {renderNavTree(navItems)}
          </nav>
          {isOwnProfile && (
            <button
              onClick={() => setShowVisibilityConfirm(true)}
              disabled={visibilityLoading}
              className={`w-full mt-2 flex items-center justify-center gap-1.5 text-base px-3 py-2 rounded-xl transition-colors font-medium ${
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
            participatingProjectCount,
            completedParticipatingProjectCount,
            isDeveloperCompany,
            developerGames,
            receivedMessages,
            applicantStatusMutation,
          }}>
            {children}
          </PartnerProfileContext.Provider>
        </main>
      </div>

      <ConfirmModal
        isOpen={showVisibilityConfirm}
        title="공개 설정 변경"
        message={partner.isProfilePublic ? '프로필을 비공개로 전환하시겠습니까?' : '프로필을 공개로 전환하시겠습니까?'}
        confirmLabel="전환"
        onConfirm={() => {
          setShowVisibilityConfirm(false)
          handleToggleVisibility()
        }}
        onCancel={() => setShowVisibilityConfirm(false)}
      />
    </div>
  )
}
