'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import { authService } from '@/services/authService'
import { formatDate } from '@/lib/formatDate'
import { Loader2, Lock, Edit2, Shield, Check, X, Eye, EyeOff, Camera } from 'lucide-react'

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

type Tab = 'account' | 'security'

const ADMIN_LEVEL_LABELS: Record<string, { label: string; cls: string }> = {
  super:   { label: '최고 관리자', cls: 'text-red-200' },
  normal:  { label: '일반 관리자', cls: 'text-amber-200' },
  monitor: { label: '모니터',     cls: 'text-blue-200' },
}

export default function AdminMyPage() {
  const { user, isAuthenticated, isLoading, updateUser } = useAuth()
  const router = useRouter()
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [tab, setTab] = useState<Tab>('account')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  // ── 계정 정보 편집 ──
  const [accountEditing, setAccountEditing] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    if (user) setUsername(user.username)
  }, [user?.username])

  const handleSaveAccount = async () => {
    if (!username.trim()) { showToast('사용자명을 입력해주세요', 'error'); return }
    setAccountSaving(true)
    try {
      const data = await authService.updateProfile({ username })
      updateUser({ username: data.user.username })
      setAccountEditing(false)
      showToast('계정 정보가 저장되었습니다')
    } catch (err: any) {
      showToast(err?.response?.data?.message || '저장 실패', 'error')
    } finally {
      setAccountSaving(false)
    }
  }

  // ── 프로필 이미지 변경 ──
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 업로드 가능합니다', 'error'); e.target.value = ''; return }
    if (file.size > 2 * 1024 * 1024) { showToast('2MB 이하의 이미지만 업로드 가능합니다', 'error'); e.target.value = ''; return }
    setAvatarUploading(true)
    try {
      await authService.uploadAvatar(file)
      await updateUser({})
      showToast('프로필 이미지가 변경되었습니다')
    } catch (err: any) {
      showToast(err?.response?.data?.message || '업로드 실패', 'error')
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
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
    { key: 'account', label: '계정 정보', icon: <Shield className="w-4 h-4" /> },
    { key: 'security', label: '보안 설정', icon: <Lock className="w-4 h-4" /> },
  ]

  const viewCls = 'bg-bg-tertiary/50 border border-line rounded-lg px-3 py-2.5'

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
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-red-900/50 ring-2 ring-white/20 overflow-hidden">
                {user?.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  (user?.username || '?')[0].toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                title="프로필 이미지 변경"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent hover:bg-accent-hover text-text-inverse flex items-center justify-center border-2 border-bg-secondary transition-colors disabled:opacity-50"
              >
                {avatarUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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

        {/* 탭 메뉴 */}
        <div className="flex gap-1 border-b border-line overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-base font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ─── 계정 정보 탭 ─── */}
        {tab === 'account' && (
          <div className="bg-bg-secondary border border-line rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold">계정 정보</h2>
              </div>
              {!accountEditing ? (
                <button onClick={() => setAccountEditing(true)}
                  className="flex items-center gap-1.5 text-base text-accent hover:text-accent-hover transition-colors">
                  <Edit2 className="w-4 h-4" /> 편집
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setAccountEditing(false); setUsername(user?.username || '') }}
                    className="text-base text-text-secondary hover:text-text-primary px-3 py-1.5 rounded border border-line transition-colors">
                    취소
                  </button>
                  <button onClick={handleSaveAccount} disabled={accountSaving}
                    className="flex items-center gap-1.5 text-base bg-accent hover:bg-accent-hover text-text-inverse px-3 py-1.5 rounded transition-colors disabled:opacity-50">
                    {accountSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    저장
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {/* 사용자명 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">사용자명</label>
                {accountEditing ? (
                  <input value={username} onChange={e => setUsername(e.target.value)} maxLength={20}
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors" />
                ) : (
                  <p className={viewCls}>{user?.username}</p>
                )}
              </div>

              {/* 이메일 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">이메일</label>
                <p className={viewCls}>{user?.email}</p>
              </div>

              {/* 관리자 등급 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">관리자 등급</label>
                <p className={viewCls}>{levelInfo?.label || '-'}</p>
              </div>

              {/* 가입일 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">가입일</label>
                <p className="text-text-secondary text-sm">{user ? formatDate((user as any).createdAt || Date.now()) : '-'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── 보안 설정 탭 ─── */}
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
