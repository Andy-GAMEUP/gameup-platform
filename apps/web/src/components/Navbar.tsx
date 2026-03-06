'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Gamepad2, Menu, X, LogOut, LayoutDashboard, User } from 'lucide-react'
import { useState } from 'react'
import Button from './Button'
import { useAuth } from '@/contexts/AuthContext'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, user, logout } = useAuth()

  const navLinks = [
    { path: '/', label: '홈' },
    { path: '/games', label: '베타존' },
    { path: '/how-it-works', label: '플랫폼 소개' },
    { path: '/community', label: '커뮤니티' },
  ]

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
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">
              <span className="text-green-400">GAME</span>
              <span className="text-white">UP</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`transition-colors text-sm font-medium ${isActive(link.path) ? 'text-green-400' : 'text-slate-300 hover:text-white'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right Area */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {user.role === 'developer' && (
                  <Link href="/dashboard">
                    <Button variant="ghost" className="text-slate-300 hover:text-white gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      개발자 센터
                    </Button>
                  </Link>
                )}
                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-white">{user.username}</span>
                  </button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-12 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-50">
                      <div className="px-4 py-2 border-b border-slate-700">
                        <p className="text-xs text-slate-400">로그인 중</p>
                        <p className="text-sm font-medium text-white truncate">{user.email}</p>
                      </div>
                      {user.role === 'developer' && (
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          개발자 센터
                        </Link>
                      )}
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          관리자 콘솔
                        </Link>
                      )}
                      {user.role === 'player' && (
                        <Link
                          href="/my"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          마이페이지
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        프로필
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors"
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
                  <Button variant="ghost" className="text-slate-300 hover:text-white">
                    개발자 센터
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-300 hover:text-white">
                    로그인
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-green-600 hover:bg-green-700">
                    가입하기
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-slate-800 pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`block px-3 py-2 rounded-lg transition-colors ${isActive(link.path) ? 'text-green-400 bg-green-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-800 space-y-1">
              {isAuthenticated && user ? (
                <>
                  <div className="px-3 py-2 text-sm text-slate-400">{user.email}</div>
                  {user.role === 'developer' && (
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800">
                      <LayoutDashboard className="w-4 h-4" /> 개발자 센터
                    </Link>
                  )}
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-slate-800 text-left">
                    <LogOut className="w-4 h-4" /> 로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800">
                    개발자 센터
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800">
                    로그인
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-center font-medium mt-2">
                    가입하기
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
