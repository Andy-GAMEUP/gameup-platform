'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Button from './Button'
import { useAuth } from '@/lib/useAuth'
import NotificationPanel from './NotificationPanel'
import notificationService from '@/services/notificationService'
import {
  LayoutDashboard, Gamepad2, Users, MessageSquare, BarChart3, Settings,
  Bell, ChevronLeft, ChevronRight, ChevronDown, LogOut, Plus, Handshake,
  LineChart, Repeat2, DollarSign, UserPlus, Crown, TrendingUp, CreditCard,
} from 'lucide-react'

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen,   setSidebarOpen]   = useState(true)
  const [profileOpen,   setProfileOpen]   = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const pathname     = usePathname()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { logout, isAuthenticated, user } = useAuth()

  const currentTab = searchParams.get('tab') || 'analysis'

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
    if (pathname.startsWith('/analytics')) setAnalyticsOpen(true)
  }, [pathname])

  useEffect(() => {
    if (!isAuthenticated || !user) return
    const companyCategory: string = (user as any).companyInfo?.companyCategory || ''
    const companyType: string[] = user.companyInfo?.companyType ?? []
    const isDeveloper = companyCategory === 'developer' || (!companyCategory && companyType.includes('developer'))
    if (!isDeveloper) router.replace('/')
  }, [isAuthenticated, user, router])

  useEffect(() => {
    if (!isAuthenticated) return
    const load = () =>
      notificationService.getUnreadCount()
        .then((data) => setUnreadCount(data.count ?? 0))
        .catch(() => {})
    const token = typeof window !== 'undefined' && localStorage.getItem('token')
    if (!token) {
      const timer = setTimeout(load, 1500)
      return () => clearTimeout(timer)
    }
    load()
  }, [isAuthenticated, notifOpen])

  type NavChild = { tab: string; label: string; icon: React.ReactNode }
  type NavItem  = { path: string; label: string; icon: React.ReactNode; children?: NavChild[] }

  const navItems: NavItem[] = [
    { path: '/dashboard',       label: '대시보드',   icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/games-management', label: '게임 관리', icon: <Gamepad2        className="w-5 h-5" /> },
    { path: '/testers',         label: '테스터 관리', icon: <Users           className="w-5 h-5" /> },
    { path: '/feedback',        label: '피드백',     icon: <MessageSquare   className="w-5 h-5" /> },
    {
      path: '/analytics', label: '분석', icon: <BarChart3 className="w-5 h-5" />,
      children: [
        { tab: 'analysis',  label: '개요',     icon: <LineChart  className="w-4 h-4" /> },
        { tab: 'retention', label: '리텐션',   icon: <Repeat2    className="w-4 h-4" /> },
        { tab: 'revenue',   label: '수익',     icon: <DollarSign className="w-4 h-4" /> },
        { tab: 'allusers',  label: '전체 유저', icon: <Users       className="w-4 h-4" /> },
        { tab: 'newusers',  label: '신규 유저', icon: <UserPlus    className="w-4 h-4" /> },
        { tab: 'vip',       label: 'VIP 유저',  icon: <Crown       className="w-4 h-4" /> },
        { tab: 'ltvcalc',   label: 'LTV 계산',  icon: <TrendingUp  className="w-4 h-4" /> },
      ],
    },
    { path: '/payments', label: '결제 / 환불', icon: <CreditCard className="w-5 h-5" /> },
    { path: '/proposals',       label: '제안 관리',   icon: <Handshake className="w-5 h-5" /> },
    { path: '/settings',        label: '회사 정보',   icon: <Settings  className="w-5 h-5" /> },
  ]

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="accent-green min-h-screen bg-bg-primary text-text-primary flex">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 fixed lg:sticky top-0 h-screen bg-bg-secondary border-r border-line transition-all duration-300 z-40 overflow-hidden ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-3 h-16 border-b border-line flex items-center justify-between gap-2">
            {sidebarOpen ? (
              <Link href="/" className="flex items-center gap-2 min-w-0">
                <div className="relative flex-shrink-0 h-[41px]">
                  <Image src="/logo_gameup_v2_2.png" alt="" width={212} height={80} className="h-full w-auto object-contain" />
                </div>
              </Link>
            ) : (
              <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-2 min-w-0">
                <div className="relative flex-shrink-0 h-8">
                  <Image src="/logo_gameup_icon.png" alt="" width={67} height={80} className="h-full w-auto object-contain" />
                </div>
              </button>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex-shrink-0 text-text-muted hover:text-text-primary"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.path)

                if (item.children) {
                  return (
                    <div key={item.path}>
                      <button
                        onClick={() => {
                          if (!sidebarOpen) {
                            router.push(`${item.path}?tab=analysis`)
                            return
                          }
                          setAnalyticsOpen(v => !v)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          active
                            ? 'bg-accent text-text-inverse'
                            : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'
                        }`}
                      >
                        {item.icon}
                        {sidebarOpen && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${analyticsOpen ? 'rotate-180' : ''}`} />
                          </>
                        )}
                      </button>

                      {analyticsOpen && sidebarOpen && (
                        <div className="mt-1 ml-4 pl-3 border-l border-line space-y-0.5">
                          {item.children.map(child => {
                            const childActive = active && currentTab === child.tab
                            return (
                              <Link
                                key={child.tab}
                                href={`${item.path}?tab=${child.tab}`}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                                  childActive
                                    ? 'bg-accent/15 text-accent font-medium'
                                    : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'
                                }`}
                              >
                                {child.icon}
                                {child.label}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      active
                        ? 'bg-accent text-text-inverse'
                        : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'
                    }`}
                  >
                    {item.icon}
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-text-inverse">
                  {(user?.companyInfo?.companyName || user?.username || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate">{user?.companyInfo?.companyName || user?.username || ''}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email || ''}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-lg">
          <div className="flex items-center justify-between px-6 h-16 border-b border-line">
            <div className="flex items-center gap-4" />

            <div className="flex items-center gap-4">
              <Link href="/upload">
                <Button className="bg-accent hover:bg-accent-hover text-text-inverse">
                  <Plus className="w-4 h-4 mr-2" />
                  게임 등록
                </Button>
              </Link>

              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 text-text-muted hover:text-text-primary"
                aria-label="알림"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-text-primary text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 text-text-muted hover:text-text-primary"
                >
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-text-inverse">개</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-bg-card border border-line rounded-lg shadow-xl">
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
                        onClick={handleLogout}
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
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-bg-overlay z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
