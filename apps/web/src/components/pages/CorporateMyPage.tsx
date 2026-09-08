'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import { useUnreadInquiryCount } from '@/lib/useUnreadInquiryCount'
import { authService } from '@/services/authService'
import MyInquiryTab from '@/components/MyInquiryTab'
import { COMPANY_TYPE_OPTIONS } from '@/components/pages/partner-profile/constants'
import { formatPhoneNumber } from '@/lib/formatPhoneNumber'
import { Loader2, Lock, Edit2, Check, X, Eye, EyeOff, Trash2, Camera, Building2, MessageCircleQuestion } from 'lucide-react'

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

type Tab = 'account' | 'inquiry' | 'security'

const BUSINESS_TYPE_OPTIONS: { value: 'individual' | 'corporation'; label: string }[] = [
  { value: 'individual', label: '개인사업자' },
  { value: 'corporation', label: '법인사업자' },
]

export default function CorporateMyPage() {
  const { user, isAuthenticated, isLoading, logout, updateUser } = useAuth()
  const unreadInquiryCount = useUnreadInquiryCount()
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

  const companyInfo = (user as any)?.companyInfo
  const contactPerson = (user as any)?.contactPerson
  const companyTypes: string[] = companyInfo?.companyType || []
  const companyCategory: string = companyInfo?.companyCategory || ''
  const isDeveloperCompany = companyCategory === 'developer' || (!companyCategory && companyTypes.includes('developer'))
  const roleLabel = isDeveloperCompany ? '개발사' : '파트너사'

  // ── 계정 정보 편집 ──
  const [accountEditing, setAccountEditing] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountForm, setAccountForm] = useState({
    username: '',
    companyName: '',
    companyType: [] as string[],
    homepageUrl: '',
    contactPhone: '',
  })

  const resetAccountForm = () => {
    setAccountForm({
      username: user?.username || '',
      companyName: companyInfo?.companyName || '',
      companyType: (companyInfo?.companyType || []).filter((t: string) => t !== 'developer'),
      homepageUrl: companyInfo?.homepageUrl || '',
      contactPhone: contactPerson?.phone || '',
    })
  }

  useEffect(() => {
    if (user) resetAccountForm()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username, JSON.stringify(companyInfo), JSON.stringify(contactPerson)])

  const toggleCompanyType = (v: string) => {
    setAccountForm(p => ({
      ...p,
      companyType: p.companyType.includes(v) ? p.companyType.filter(x => x !== v) : [...p.companyType, v],
    }))
  }

  const handleSaveAccount = async () => {
    if (!accountForm.username.trim()) { showToast('아이디를 입력해주세요', 'error'); return }
    setAccountSaving(true)
    try {
      const savedCompanyType = companyTypes.includes('developer')
        ? [...accountForm.companyType, 'developer']
        : accountForm.companyType

      await Promise.all([
        authService.updateProfile({ username: accountForm.username }),
        authService.updateCompanyInfo({
          companyName: accountForm.companyName,
          homepageUrl: accountForm.homepageUrl,
          contactPhone: accountForm.contactPhone,
        }),
        authService.updateCompanyType(savedCompanyType),
      ])
      await updateUser({})
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

  // ── 계정 삭제 ──
  const [deleteModal, setDeleteModal] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteAccount = async () => {
    if (!deletePw) { showToast('비밀번호를 입력해주세요', 'error'); return }
    setDeleteLoading(true)
    try {
      await authService.deleteAccount({ password: deletePw })
      logout()
      router.replace('/')
    } catch (err: any) {
      showToast(err?.response?.data?.message || '삭제 실패', 'error')
      setDeleteLoading(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
    </div>
  )
  if (!isAuthenticated) return null

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'account', label: '계정 정보', icon: <Building2 className="w-4 h-4" /> },
    { key: 'inquiry', label: '문의하기', icon: <MessageCircleQuestion className="w-4 h-4" /> },
    { key: 'security', label: '보안 설정', icon: <Lock className="w-4 h-4" /> },
  ]

  const inputCls = 'w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const viewCls = 'bg-bg-tertiary/50 border border-line rounded-lg px-3 py-2.5'

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* 프로필 헤더 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="absolute -top-20 -right-16 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-indigo-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-violet-900/50 ring-2 ring-white/20 overflow-hidden">
                {user?.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  (companyInfo?.companyName || user?.username || '?')[0].toUpperCase()
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
              <h1 className="text-xl font-bold text-white">
                {companyInfo?.companyName || user?.username}
              </h1>
              <p className="text-violet-200/70 text-sm">{user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="bg-white/10 backdrop-blur-sm text-violet-200 border border-white/20 text-xs px-2.5 py-1 rounded-full font-medium">{roleLabel}</span>
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
              {t.key === 'inquiry' && unreadInquiryCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              )}
            </button>
          ))}
        </div>

        {/* ─── 계정 정보 탭 ─── */}
        {tab === 'account' && (
          <div className="bg-bg-secondary border border-line rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold">계정 정보</h2>
              </div>
              {!accountEditing ? (
                <button onClick={() => setAccountEditing(true)}
                  className="flex items-center gap-1.5 text-base text-accent hover:text-accent-hover transition-colors">
                  <Edit2 className="w-4 h-4" /> 편집
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setAccountEditing(false); resetAccountForm() }}
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
              {/* 회사명 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">회사명</label>
                {accountEditing ? (
                  <input value={accountForm.companyName} onChange={e => setAccountForm(p => ({ ...p, companyName: e.target.value }))} className={inputCls} />
                ) : (
                  <p className={viewCls}>{companyInfo?.companyName || '-'}</p>
                )}
              </div>

              {/* 담당자 (로그인 아이디) */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">담당자</label>
                {accountEditing ? (
                  <input value={accountForm.username} onChange={e => setAccountForm(p => ({ ...p, username: e.target.value }))} maxLength={20} className={inputCls} />
                ) : (
                  <p className={viewCls}>{user?.username}</p>
                )}
              </div>

              {/* 이메일 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">이메일</label>
                <input value={user?.email || ''} disabled readOnly className={inputCls} />
              </div>

              {/* 회사 웹사이트 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">회사 웹사이트</label>
                {accountEditing ? (
                  <input value={accountForm.homepageUrl} onChange={e => setAccountForm(p => ({ ...p, homepageUrl: e.target.value }))} placeholder="https://" className={inputCls} />
                ) : (
                  <p className={viewCls}>{companyInfo?.homepageUrl || '-'}</p>
                )}
              </div>

              {/* 대표 연락처 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">대표 연락처</label>
                {accountEditing ? (
                  <input value={accountForm.contactPhone} onChange={e => setAccountForm(p => ({ ...p, contactPhone: formatPhoneNumber(e.target.value) }))} placeholder="010-1234-5678" className={inputCls} />
                ) : (
                  <p className={viewCls}>{contactPerson?.phone || '-'}</p>
                )}
              </div>

              {/* 사업자등록번호 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">사업자등록번호</label>
                <input value={companyInfo?.businessNumber || ''} disabled readOnly className={inputCls} />
              </div>

              {/* 사업자형태 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">사업자형태</label>
                <input value={BUSINESS_TYPE_OPTIONS.find(o => o.value === companyInfo?.businessType)?.label || ''} disabled readOnly className={inputCls} />
              </div>

              {/* 기업유형 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">기업유형</label>
                <input value={roleLabel} disabled readOnly className={inputCls} />
              </div>

              {/* 기업형태 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">기업형태</label>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_TYPE_OPTIONS.map(opt => {
                    const selected = accountEditing ? accountForm.companyType.includes(opt.value) : companyTypes.includes(opt.value)
                    return (
                      <button key={opt.value}
                        onClick={() => accountEditing && toggleCompanyType(opt.value)}
                        disabled={!accountEditing}
                        className={`px-3 py-1.5 rounded-full text-base font-medium transition-colors ${
                          selected
                            ? 'bg-accent text-text-inverse'
                            : accountEditing
                            ? 'bg-bg-tertiary text-text-secondary hover:bg-line-light hover:text-text-primary border border-line'
                            : 'bg-bg-tertiary/50 text-text-muted border border-line cursor-default'
                        }`}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                {!accountEditing && companyTypes.filter(t => t !== 'developer').length === 0 && (
                  <p className="text-xs text-text-muted mt-1">등록된 기업 형태 없음</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── 문의하기 탭 ─── */}
        {tab === 'inquiry' && <MyInquiryTab />}

        {/* ─── 보안 설정 탭 ─── */}
        {tab === 'security' && (
          <div className="space-y-6">
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

            <div className="bg-bg-secondary border border-line rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-danger mb-2 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />계정 삭제
              </h2>
              <p className="text-text-secondary text-sm mb-4">계정을 삭제하면 즐겨찾기, 리뷰, 활동 내역이 영구적으로 삭제되며, 작성한 게시글과 댓글은 &apos;탈퇴한 회원&apos;으로 표시됩니다. 이 작업은 되돌릴 수 없습니다.</p>
              <button onClick={() => setDeleteModal(true)}
                className="px-6 py-2.5 rounded-lg border border-danger text-danger hover:bg-danger/10 transition-colors text-base font-medium">
                계정 삭제
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 계정 삭제 모달 */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-secondary border border-line rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-danger mb-2">계정 삭제 확인</h3>
            <p className="text-text-secondary text-sm mb-4">비밀번호를 입력하여 계정 삭제를 확인하세요.</p>
            <input
              type="password"
              value={deletePw}
              onChange={(e) => setDeletePw(e.target.value)}
              placeholder="비밀번호"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={handleDeleteAccount} disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}삭제
              </button>
              <button onClick={() => { setDeleteModal(false); setDeletePw('') }}
                className="flex-1 border border-line text-text-secondary hover:text-text-primary py-2.5 rounded-lg transition-colors">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
