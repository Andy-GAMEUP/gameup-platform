'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Menu, X, LogOut, LayoutDashboard, User, Bell, MessageSquare, Building2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import Button from './Button'
import { useAuth } from '@/lib/useAuth'
import NotificationPanel from './NotificationPanel'
import notificationService from '@/services/notificationService'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, user, logout } = useAuth()

  const isCorporateApproved = user?.memberType === 'corporate' && user?.companyInfo?.approvalStatus === 'approved'
  const isCorporateDeveloper = isCorporateApproved && user?.companyInfo?.companyType?.includes('developer')
  const isCorporatePartner = isCorporateApproved && !isCorporateDeveloper
  const showDeveloperCenter = user?.role === 'developer' || isCorporateDeveloper
  const showPartnerCenter = isCorporatePartner

  useEffect(() => {
    if (!isAuthenticated) return
    const token = typeof window !== 'undefined' && localStorage.getItem('token')
    if (!token) {
      // Token not yet stored after hard refresh — retry after session recovery
      const timer = setTimeout(() => {
        const retryToken = localStorage.getItem('token')
        if (retryToken) {
          notificationService.getUnreadCount()
            .then((data) => setUnreadCount(data.count ?? 0))
            .catch(() => {})
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
    notificationService.getUnreadCount()
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => {})
  }, [isAuthenticated])

  const isAdmin = user?.role === 'admin'

  const navLinks = (() => {
    const links = [
      { path: '/', label: '베타존' },
      { path: '/live_games', label: '라이브게임' },
    ]
    if (!isAuthenticated) {
      // 비로그인: 베타존, 라이브게임, 플랫폼 소개, 커뮤니티
      links.push({ path: '/gameup_platform', label: '플랫폼 소개' })
      links.push({ path: '/community', label: '커뮤니티' })
    } else if (isCorporateApproved || isAdmin) {
      // 기업회원(승인) 또는 관리자: 베타존, 라이브게임, 커뮤니티, 파트너라운지
      links.push({ path: '/community', label: '커뮤니티' })
      links.push({ path: '/partner', label: '파트너라운지' })
    } else {
      // 개인회원(플레이어): 베타존, 라이브게임, 커뮤니티
      links.push({ path: '/community', label: '커뮤니티' })
    }
    return links
  })()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const handleLogout = () => {
    logout()
    setProfileMenuOpen(false)
    setMobileMenuOpen(false)
    router.push('/')
  }

  return (
    <>
    <nav className="sticky top-0 z-50 bg-bg-primary/95 backdrop-blur-lg border-b border-line">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5">
            <Image src="/logo_gameup_icon.png" alt="" width={67} height={80} className="h-9 w-auto object-contain" />
            <span className="text-xl font-bold tracking-tight text-black">Game<span className="text-black">Up</span></span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`transition-colors text-sm font-medium ${isActive(link.path) ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right Area */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {showDeveloperCenter && (
                  <Link href="/dashboard">
                    <Button variant="ghost" className="text-text-secondary hover:text-text-primary gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      개발자 센터
                    </Button>
                  </Link>
                )}
                <Link href="/messages" className="relative text-text-muted hover:text-text-primary transition-colors p-1.5">
                  <MessageSquare className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative text-text-muted hover:text-text-primary transition-colors p-1.5"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-text-primary text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-line-light transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-text-inverse text-sm font-bold">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-text-primary">{user.username}</span>
                  </button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-12 w-44 bg-bg-card border border-line rounded-xl shadow-xl py-1 z-50">
                      <div className="px-4 py-2 border-b border-line">
                        <p className="text-xs text-text-muted">로그인 중</p>
                        <p className="text-sm font-medium text-text-primary truncate">{user.email}</p>
                      </div>
                      {showDeveloperCenter && (
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          개발자 센터
                        </Link>
                      )}
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:text-danger/80 hover:bg-bg-tertiary transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          관리자 콘솔
                        </Link>
                      )}
                      {(user.role === 'player' || isCorporatePartner) && (
                        <Link
                          href="/my"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                        >
                          <User className="w-4 h-4" />
                          마이페이지
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <User className="w-4 h-4" />
                        프로필
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:text-danger/80 hover:bg-bg-tertiary transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-text-secondary hover:text-text-primary">
                    개발자 센터
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" className="text-text-secondary hover:text-text-primary">
                    로그인
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-accent hover:bg-accent-hover">
                    가입하기
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-line pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`block px-3 py-2 rounded-lg transition-colors ${isActive(link.path) ? 'text-accent bg-accent-light' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-line space-y-1">
              {isAuthenticated && user ? (
                <>
                  <div className="px-3 py-2 text-sm text-text-muted">{user.email}</div>
                  {showDeveloperCenter && (
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary">
                      <LayoutDashboard className="w-4 h-4" /> 개발자 센터
                    </Link>
                  )}
                  {(user?.role === 'player' || isCorporatePartner) && (
                    <Link href="/my" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary">
                      <User className="w-4 h-4" /> 마이페이지
                    </Link>
                  )}
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-danger hover:bg-bg-tertiary text-left">
                    <LogOut className="w-4 h-4" /> 로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary">
                    개발자 센터
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary">
                    로그인
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-text-primary text-center font-medium mt-2">
                    가입하기
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
    <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
