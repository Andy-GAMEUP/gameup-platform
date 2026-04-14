'use client'
import { ReactNode, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import {
  LayoutDashboard, Gamepad2, Users, Megaphone,
  MessageSquare, ChevronLeft, ChevronRight, ChevronDown,
  Home, LogOut, Shield, UserPlus, Handshake, Tags,
  Smartphone, Globe, Calendar, FileCheck, ImageIcon, Bell, Package,
  BarChart3, PieChart, UserCircle, Building2, Award, Activity, FileText, Gift,
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
  { path: '/admin/games',      label: '게임 관리',   icon: Gamepad2 },
  { path: '/admin/game-deletion-logs', label: '게임 삭제 로그', icon: Gamepad2 },
  { path: '/admin/community',  label: '커뮤니티',    icon: MessageSquare },
  {
    path: '/admin/members',
    label: '계정관리',
    icon: Users,
    children: [
      { path: '/admin/members/new_account', label: '신규회원승인', icon: UserPlus },
      { path: '/admin/members/players', label: '게임유저관리', icon: UserCircle },
      { path: '/admin/members/corporate', label: '기업회원관리', icon: Building2 },
      { path: '/admin/members/terms', label: '약관관리', icon: FileText },
      { path: '/admin/levels', label: '레벨 관리', icon: Award },
      { path: '/admin/activity-scores', label: '활동점수', icon: Activity },
      { path: '/admin/game-point-policies', label: '게임포인트정책', icon: Gift },
      { path: '/admin/developer-balances', label: '개발사잔액', icon: Activity },
      { path: '/admin/point-packages', label: '포인트상품', icon: Award },
    ],
  },
  {
    path: '/admin/notice',
    label: '공지알림',
    icon: Megaphone,
    children: [
      { path: '/admin/announcements', label: '공지관리', icon: Megaphone },
      { path: '/admin/notifications', label: '알림관리', icon: Bell },
      { path: '/admin/support-banners', label: '배너관리', icon: ImageIcon },
    ],
  },
  { path: '/admin/partner-topics', label: '프로젝트관리', icon: Tags },
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
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuth()
  const [open, setOpen] = useState(true)

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    navItems.forEach(item => {
      if (item.children) {
        const childMatch = item.children.some(c => pathname.startsWith(c.path))
        if (childMatch) init[item.path] = true
      }
    })
    return init
  })

  const toggleMenu = (path: string) => {
    setOpenMenus(prev => ({ ...prev, [path]: !prev[path] }))
  }

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path)

  const renderNavItem = (item: NavItem) => {
    const { path, label, icon: Icon, exact, children: subs } = item

    if (subs) {
      const parentActive = subs.some(c => pathname.startsWith(c.path))
      const isOpen = openMenus[path] ?? false

      return (
        <div key={path}>
          <button
            onClick={() => toggleMenu(path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              parentActive
                ? 'bg-accent-light text-accent-text border border-accent-muted'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
            }`}
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      subActive
                        ? 'bg-accent-light text-accent-text'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50'
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
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-accent-light text-accent-text border border-accent-muted'
            : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
        }`}
        title={!open ? label : undefined}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {open && <span>{label}</span>}
      </Link>
    )
  }

  return (
    <div className="accent-red min-h-screen bg-bg-primary flex">
      {/* Sidebar */}
      <aside className={`${open ? 'w-56' : 'w-14'} bg-bg-secondary border-r border-line flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-line">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo_gameup_icon.png" alt="" width={67} height={80} className="h-7 w-auto object-contain flex-shrink-0" />
            {open && (
              <span className="text-base font-bold tracking-tight text-black">GameUp</span>
            )}
          </Link>
          <button onClick={() => setOpen(!open)} className="text-text-muted hover:text-text-primary transition-colors ml-auto">
            {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(renderNavItem)}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-line space-y-0.5">
          <Link href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary text-sm transition-colors"
            title={!open ? '메인으로' : undefined}
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            {open && <span>메인으로</span>}
          </Link>
          <button onClick={() => { logout(); router.push('/') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 text-sm transition-colors"
            title={!open ? '로그아웃' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {open && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-bg-secondary border-b border-line flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-text-primary font-semibold text-base">GAMEUP 관리시스템</h1>
          <div className="flex items-center gap-3">
            <span className="text-text-secondary text-sm">{user?.username}</span>
            <span className="bg-accent-light text-accent-text border border-accent-muted px-2 py-0.5 rounded text-xs font-bold tracking-wider">ADMIN</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
