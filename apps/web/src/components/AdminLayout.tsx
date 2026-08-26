'use client'
import { ReactNode, useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import {
  LayoutDashboard, Gamepad2, Users, Megaphone,
  ChevronLeft, ChevronRight, ChevronDown,
  Shield, UserPlus, Handshake, Tags,
  Smartphone, Globe, Calendar, FileCheck, ImageIcon, Bell, Package,
  BarChart3, PieChart, UserCircle, Building2, Award, Activity, FileText, Gift, Flag,
  MessageCircle, ShieldBan, Trash2, CreditCard, Calculator, LogOut, Sparkles,
} from 'lucide-react'

interface AdminLayoutProps { children: ReactNode }

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { path: '/admin',            label: '대시보드',    icon: LayoutDashboard, exact: true },
  {
    path: '/admin/games',
    label: '게임 관리',
    icon: Gamepad2,
    children: [
      { path: '/admin/games', label: '게임 관리', icon: Gamepad2, exact: true },
      { path: '/admin/game-deletion-logs', label: '삭제 게임 관리', icon: Trash2 },
    ],
  },
  { path: '/admin/payments', label: '결제 / 환불', icon: CreditCard },
  { path: '/admin/settlements', label: '정산', icon: Calculator },
  { path: '/admin/notifications', label: '알림', icon: Bell },
  { path: '/admin/community?tab=banner', label: '배너 관리', icon: ImageIcon },
  {
    path: '/admin/community-board',
    label: '커뮤니티 관리',
    icon: MessageCircle,
    children: [
      { path: '/admin/community?tab=announcements',  label: '공지사항',          icon: Megaphone, exact: true },
      { path: '/admin/community?tab=new-game-intro', label: '신작게임소개',      icon: Sparkles,  exact: true },
      { path: '/admin/community/reported',           label: '신고 게시물 관리',   icon: Flag,      exact: true },
      { path: '/admin/community/reported/deleted',   label: '삭제 게시물 관리', icon: Trash2 },
    ],
  },
  {
    path: '/admin/members',
    label: '운영 관리',
    icon: Shield,
    children: [
      { path: '/admin/members/terms', label: '약관관리', icon: FileText },
      { path: '/admin/levels', label: '레벨 관리', icon: Award },
      { path: '/admin/activity-scores', label: '활동점수', icon: Activity },
      { path: '/admin/game-point-policies', label: '게임포인트정책', icon: Gift },
      { path: '/admin/developer-balances', label: '개발사잔액', icon: Activity },
      { path: '/admin/point-packages', label: '포인트상품', icon: Award },
    ],
  },
  {
    path: '/admin/partner-topics',
    label: '파트너라운지 관리',
    icon: Tags,
    children: [
      { path: '/admin/partner-topics', label: '프로젝트 관리', icon: Tags, exact: true },
      { path: '/admin/partner-topics/deleted', label: '삭제된 프로젝트', icon: Trash2 },
    ],
  },
  {
    path: '/admin/solution_service',
    label: '솔루션&서비스',
    icon: Package,
    children: [
      { path: '/admin/publishing/hms', label: 'HMS 퍼블리싱', icon: Globe },
      { path: '/admin/publishing/hk', label: 'HK 퍼블리싱', icon: Smartphone },
      { path: '/admin/support-seasons', label: '시즌 관리', icon: Calendar },
      { path: '/admin/support-applications', label: '게임 신청', icon: FileCheck },
      { path: '/admin/solutions', label: '솔루션 관리', icon: Package },
    ],
  },
  {
    path: '/admin/analytics',
    label: '방문 통계',
    icon: BarChart3,
    children: [
      { path: '/admin/analytics', label: '방문 통계', icon: BarChart3, exact: true },
      { path: '/admin/analytics/menu', label: '메뉴별 통계', icon: PieChart },
    ],
  },
  {
    path: '/admin/users',
    label: '계정 관리',
    icon: Users,
    children: [
      { path: '/admin/members/new_account', label: '기업회원', icon: Building2 },
      { path: '/admin/members/players', label: '게임회원', icon: UserCircle },
      { path: '/admin/members/admins', label: '관리자', icon: Shield },
      { path: '/admin/members/deleted', label: '탈퇴 회원', icon: Trash2 },
    ],
  },
]

function matchPath(path: string, pname: string, sparams: URLSearchParams) {
  const [pathPart, queryPart] = path.split('?')
  if (queryPart) {
    const [key, value] = queryPart.split('=')
    return pname === pathPart && sparams.get(key) === value
  }
  return pname.startsWith(pathPart)
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user, isLoading } = useAuth()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  if (!isLoading && (!user || user.role !== 'admin')) return null

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    navItems.forEach(item => {
      if (item.children) {
        const childMatch = item.children.some(c => matchPath(c.path, pathname, new URLSearchParams()))
        if (childMatch) init[item.path] = true
      }
    })
    return init
  })

  const toggleMenu = (path: string) => {
    setOpenMenus(prev => ({ ...prev, [path]: !prev[path] }))
  }

  const isActive = (path: string, exact = false) => {
    const [pathPart, queryPart] = path.split('?')
    if (queryPart) {
      const [key, value] = queryPart.split('=')
      return pathname === pathPart && searchParams.get(key) === value
    }
    return exact ? pathname === pathPart : pathname.startsWith(pathPart)
  }

  const renderNavItem = (item: NavItem) => {
    const { path, label, icon: Icon, exact, children: subs } = item

    if (subs) {
      const parentActive = subs.some(c => matchPath(c.path, pathname, searchParams))
      const isOpen = openMenus[path] ?? parentActive

      return (
        <div key={path}>
          <button
            onClick={() => toggleMenu(path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 border-l-[3px] text-base transition-colors ${
              parentActive
                ? 'bg-accent-light border-accent text-accent-text font-semibold rounded-r-xl'
                : 'border-transparent text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-xl'
            }`}
            style={{ fontSize: '0.875rem' }}
            title={!open ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {open && (
              <>
                <span className="flex-1 text-left">{label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              </>
            )}
          </button>
          {open && isOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-line pl-2">
              {subs.map(sub => {
                const subActive = isActive(sub.path, sub.exact)
                const SubIcon = sub.icon
                return (
                  <Link key={sub.path} href={sub.path}
                    className={`flex items-center gap-3 px-3 py-2 border-l-[3px] text-sm transition-colors ${
                      subActive
                        ? 'bg-accent-light border-accent text-accent-text font-semibold rounded-r-xl'
                        : 'border-transparent text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50 rounded-xl'
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{sub.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    const active = isActive(path, exact)
    return (
      <Link key={path} href={path}
        className={`flex items-center gap-3 px-3 py-2.5 border-l-[3px] text-sm transition-colors ${
          active
            ? 'bg-accent-light border-accent text-accent-text font-semibold rounded-r-xl'
            : 'border-transparent text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-xl'
        }`}
        title={!open ? label : undefined}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {open && <span>{label}</span>}
      </Link>
    )
  }

  return (
    <div className="accent-red h-screen bg-bg-primary flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`${open ? 'w-56' : 'w-14'} bg-bg-secondary border-r border-line flex flex-col transition-all duration-200 flex-shrink-0 h-full`}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-line">
          {open ? (
            <Link href="/" className="flex items-center gap-2">
              <div className="relative flex-shrink-0 h-[35px]">
                <Image src="/logo_gameup_v2_2.png" alt="" width={212} height={80} className="h-full w-auto object-contain" />
              </div>
            </Link>
          ) : (
            <button onClick={() => setOpen(true)} className="flex items-center gap-2">
              <div className="relative flex-shrink-0 h-7">
                <Image src="/logo_gameup_icon.png" alt="" width={67} height={80} className="h-full w-auto object-contain" />
              </div>
            </button>
          )}
          <button onClick={() => setOpen(!open)} className="text-text-muted hover:text-text-primary transition-colors ml-auto">
            {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(renderNavItem)}
        </nav>

      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="h-14 bg-bg-secondary border-b border-line flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-text-primary font-semibold text-base">GAMEUP 관리시스템</h1>
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary"
            >
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center overflow-hidden">
                {user?.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-text-inverse">
                    {(user?.username || 'A').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-bg-card border border-line rounded-lg shadow-xl z-50">
                <div className="p-2">
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/') }}
                    className="w-full text-left px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded flex items-center gap-2"
                    style={{ fontSize: '0.875rem' }}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    플레이 화면
                  </button>
                  <button
                    onClick={() => { logout(); router.push('/') }}
                    className="w-full text-left px-4 py-2 text-danger hover:bg-bg-tertiary rounded flex items-center gap-2"
                    style={{ fontSize: '0.875rem' }}
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
