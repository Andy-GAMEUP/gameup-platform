'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import { authService } from '@/services/authService'
import { Loader2, Lock, Edit2, Shield, Check, X, Eye, EyeOff } from 'lucide-react'

type Tab = 'profile' | 'security'

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
      type === 'success' ? 'bg-accent text-text-primary' : 'bg-red-600 text-text-primary'
    }`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {msg}
    </div>
  )
}

const ADMIN_LEVEL_LABELS: Record<string, { label: string; cls: string }> = {
  super:   { label: '최고 관리자', cls: 'text-red-200' },
  normal:  { label: '일반 관리자', cls: 'text-amber-200' },
  monitor: { label: '모니터',     cls: 'text-blue-200' },
}

export default function AdminMyPage() {
  const { user, isAuthenticated, isLoading, updateUser } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('profile')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  // ── 프로필 편집 ──
  const [username, setUsername] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameEditing, setUsernameEditing] = useState(false)

  useEffect(() => {
    if (user) setUsername(user.username)
  }, [user?.username])

  const handleSaveUsername = async () => {
    if (!username.trim()) { showToast('사용자명을 입력해주세요', 'error'); return }
    setUsernameSaving(true)
    try {
      const data = await authService.updateProfile({ username })
      updateUser({ username: data.user.username })
      setUsernameEditing(false)
      showToast('프로필이 저장되었습니다')
    } catch (err: any) {
      showToast(err?.response?.data?.message || '저장 실패', 'error')
    } finally {
      setUsernameSaving(false)
    }
  }

  // ── 비밀번호 변경 ──
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { showToast('모든 항목을 입력해주세요', 'error'); return }
    if (pwForm.newPassword.length < 8) { showToast('새 비밀번호는 8자 이상이어야 합니다', 'error'); return }
    if (pwForm.newPassword !== pwForm.confirmPassword) { showToast('새 비밀번호가 일치하지 않습니다', 'error'); return }
    setPwSaving(true)
    try {
      await authService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showToast('비밀번호가 변경되었습니다')
    } catch (err: any) {
      showToast(err?.response?.data?.message || '변경 실패', 'error')
    } finally {
      setPwSaving(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
    </div>
  )
  if (!isAuthenticated) return null

  const adminLevel = user?.adminLevel as string | null
  const levelInfo = adminLevel ? ADMIN_LEVEL_LABELS[adminLevel] : null

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile',  label: '프로필 편집', icon: <Edit2 className="w-4 h-4" /> },
    { key: 'security', label: '보안 설정',   icon: <Lock className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* 프로필 헤더 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-red-950 via-slate-900 to-orange-950 border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="absolute -top-20 -right-16 w-64 h-64 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 w-56 h-56 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-red-900/50 ring-2 ring-white/20 flex-shrink-0 overflow-hidden">
              {user?.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                (user?.username || '?')[0].toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">{user?.username}</h1>
                {levelInfo && (
                  <span className={`bg-white/10 backdrop-blur-sm border border-white/20 text-xs px-2.5 py-1 rounded-full font-medium ${levelInfo.cls}`}>{levelInfo.label}</span>
                )}
              </div>
              <p className="text-red-200/70 text-sm mt-1">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm text-red-200 border border-white/20 text-xs px-2.5 py-1 rounded-full font-medium">
                  <Shield className="w-3 h-3" />관리자 계정
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-medium whitespace-nowrap transition-colors ${
                tab === key ? 'bg-accent text-text-inverse' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* 프로필 편집 탭 */}
        {tab === 'profile' && (
          <div className="bg-bg-secondary border border-line rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">사용자명</h2>
              {!usernameEditing && (
                <button onClick={() => setUsernameEditing(true)}
                  className="flex items-center gap-1.5 text-base text-accent hover:text-accent-hover transition-colors">
                  <Edit2 className="w-4 h-4" />편집
                </button>
              )}
            </div>
            {usernameEditing ? (
              <>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveUsername} disabled={usernameSaving}
                    className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-inverse font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2">
                    {usernameSaving && <Loader2 className="w-4 h-4 animate-spin" />}저장
                  </button>
                  <button onClick={() => { setUsernameEditing(false); setUsername(user?.username || '') }}
                    className="px-6 py-2.5 rounded-lg border border-line text-text-secondary hover:text-text-primary transition-colors">
                    취소
                  </button>
                </div>
              </>
            ) : (
              <p className="text-text-primary">{user?.username}</p>
            )}
          </div>
        )}

        {/* 보안 설정 탭 */}
        {tab === 'security' && (
          <div className="bg-bg-secondary border border-line rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="w-5 h-5" />비밀번호 변경
            </h2>
            {(['current', 'newPw', 'confirm'] as const).map((field) => {
              const labels = { current: '현재 비밀번호', newPw: '새 비밀번호', confirm: '새 비밀번호 확인' }
              const keys = { current: 'currentPassword', newPw: 'newPassword', confirm: 'confirmPassword' } as const
              return (
                <div key={field}>
                  <label className="block text-sm font-medium text-text-secondary mb-1">{labels[field]}</label>
                  <div className="relative">
                    <input
                      type={showPw[field] ? 'text' : 'password'}
                      value={pwForm[keys[field]]}
                      onChange={(e) => setPwForm(p => ({ ...p, [keys[field]]: e.target.value }))}
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 pr-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                      {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )
            })}
            <button onClick={handleChangePassword} disabled={pwSaving}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-inverse font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2">
              {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />}비밀번호 변경
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
