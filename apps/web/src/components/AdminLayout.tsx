'use client'
import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import {
  LayoutDashboard, Gamepad2, Users, Megaphone,
  MessageSquare, ChevronLeft, ChevronRight,
  Home, LogOut, Shield, UserPlus, Handshake, Tags,
  Smartphone, Globe, Hash, Calendar, FileCheck, ImageIcon, Bell, Package,
  BarChart3, PieChart, UserCircle, Building2, Award, Activity, FileText,
} from 'lucide-react'

interface AdminLayoutProps { children: ReactNode }

const navItems = [
  { path: '/admin',            label: '대시보드',    icon: LayoutDashboard, exact: true },
  { path: '/admin/games',      label: '게임 관리',   icon: Gamepad2 },
  { path: '/admin/community',  label: '커뮤니티',    icon: MessageSquare },
  { path: '/admin/users',      label: '회원 관리',   icon: Users },
  { path: '/admin/announcements', label: '공지사항', icon: Megaphone },
  { path: '/admin/partner-requests', label: '파트너 신청', icon: UserPlus },
  { path: '/admin/partner-management', label: '파트너 관리', icon: Handshake },
  { path: '/admin/partner-topics', label: '주제 관리', icon: Tags },
  { path: '/admin/publishing/hms', label: 'HMS 퍼블리싱', icon: Globe },
  { path: '/admin/publishing/hk', label: 'HK 퍼블리싱', icon: Smartphone },
  { path: '/admin/minihome', label: '미니홈 관리', icon: Home },
  { path: '/admin/minihome-keywords', label: '미니홈 키워드', icon: Hash },
  { path: '/admin/support-seasons', label: '시즌 관리', icon: Calendar },
  { path: '/admin/support-applications', label: '게임 신청', icon: FileCheck },
  { path: '/admin/support-banners', label: '지원 배너/탭', icon: ImageIcon },
  { path: '/admin/notifications', label: '알림 관리', icon: Bell },
  { path: '/admin/solutions', label: '솔루션 관리', icon: Package },
  { path: '/admin/analytics', label: '방문 통계', icon: BarChart3 },
  { path: '/admin/analytics/menu', label: '메뉴별 통계', icon: PieChart },
  { path: '/admin/users-enhanced/individual', label: '개인회원', icon: UserCircle },
  { path: '/admin/users-enhanced/corporate', label: '기업회원', icon: Building2 },
  { path: '/admin/levels', label: '레벨 관리', icon: Award },
  { path: '/admin/activity-scores', label: '활동점수', icon: Activity },
  { path: '/admin/terms', label: '약관 관리', icon: FileText },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuth()
  const [open, setOpen] = useState(true)

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className={`${open ? 'w-56' : 'w-14'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-slate-800">
          {open && (
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              <span className="text-white font-bold text-sm tracking-wide">관리자 콘솔</span>
            </div>
          )}
          <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-white transition-colors ml-auto">
            {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon, exact }) => {
            const active = isActive(path, exact)
            return (
              <Link key={path} href={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={!open ? label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {open && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-slate-800 space-y-0.5">
          <Link href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-colors"
            title={!open ? '메인으로' : undefined}
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            {open && <span>메인으로</span>}
          </Link>
          <button onClick={() => { logout(); router.push('/') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 text-sm transition-colors"
            title={!open ? '로그아웃' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {open && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-white font-semibold text-base">GAMEUP BETAZONE 관리자</h1>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">{user?.username}</span>
            <span className="bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-xs font-bold tracking-wider">ADMIN</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
