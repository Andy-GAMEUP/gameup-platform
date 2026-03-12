'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import Button from './Button'
import { useAuth } from '@/lib/useAuth'
import {
  LayoutDashboard,
  Gamepad2,
  FlaskConical,
  Joystick,
  Users,
  Home as HomeIcon,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  Megaphone,
} from 'lucide-react'

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const navItems = [
    { path: '/partner-console', label: '대시보드', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { path: '/partner-console/beta-games', label: '베타테스트 게임', icon: <FlaskConical className="w-5 h-5" /> },
    { path: '/partner-console/live-games', label: '라이브 서비스 게임', icon: <Joystick className="w-5 h-5" /> },
    { path: '/partner-console/community', label: '커뮤니티', icon: <Users className="w-5 h-5" /> },
    { path: '/partner-console/minihome', label: '미니홈 관리', icon: <HomeIcon className="w-5 h-5" /> },
    { path: '/partner-console/notices', label: '공지/알림', icon: <Megaphone className="w-5 h-5" /> },
    { path: '/partner-console/settings', label: '설정', icon: <Settings className="w-5 h-5" /> },
  ]

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path
    return pathname.startsWith(path)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const companyName = user?.companyInfo?.companyName || '파트너'

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <Link href="/partner-console" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Gamepad2 className="w-6 h-6" />
              </div>
              {sidebarOpen && (
                <div>
                  <div className="font-bold text-sm">
                    <span className="text-blue-400">GAME</span>
                    <span className="text-white">UP</span>
                  </div>
                  <div className="text-xs text-slate-400">파트너 센터</div>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path, item.exact)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold">{companyName[0]}</span>
              </div>
              {sidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate">{companyName}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-slate-400 hover:text-white"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className="text-xl font-bold">
                {navItems.find((item) => isActive(item.path, item.exact))?.label || '파트너 센터'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-white">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 text-slate-400 hover:text-white"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold">{companyName[0]}</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl">
                    <div className="p-2">
                      <Link
                        href="/partner-console/settings"
                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded"
                        onClick={() => setProfileOpen(false)}
                      >
                        설정
                      </Link>
                      <Link
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded"
                        onClick={() => setProfileOpen(false)}
                      >
                        <HomeIcon className="w-4 h-4" />
                        사용자 사이트
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 rounded flex items-center gap-2"
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
