'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { UserPlus, Loader2, Check, XCircle, X, Search, Plus, Shield, Eye, Settings } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────
interface PendingUser {
  _id: string
  username: string
  email: string
  role: string
  adminLevel?: string
  memberType?: string
  approvalStatus?: string
  companyInfo?: {
    companyName?: string
    companyType?: string[]
    approvalStatus?: string
  }
  contactPerson?: { name?: string; phone?: string; email?: string }
  isActive: boolean
  createdAt: string
}

const COMPANY_TYPE_LABELS: Record<string, string> = {
  developer: '개발사', publisher: '퍼블리셔', game_solution: '게임솔루션',
  game_service: '게임서비스', operations: '운영', qa: 'QA', marketing: '마케팅', other: '기타',
}

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  admin: { label: '관리자', cls: 'bg-accent-light text-accent-text border-accent-muted' },
  developer: { label: '개발자', cls: 'bg-purple-600/20 text-purple-300 border-purple-500/30' },
  player: { label: '플레이어', cls: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
}

const MEMBER_TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  individual: { label: '게임회원', cls: 'bg-bg-muted/30 text-text-secondary border-line/30' },
  corporate: { label: '기업회원', cls: 'bg-amber-600/20 text-amber-300 border-amber-500/30' },
}

const ADMIN_LEVEL_LABELS: Record<string, { label: string; cls: string; icon: typeof Shield; desc: string }> = {
  super: { label: 'Super', cls: 'bg-accent-light text-accent-text border-accent-muted', icon: Shield, desc: '모든 권한 (수정/삭제/승인)' },
  normal: { label: 'Normal', cls: 'bg-blue-600/20 text-blue-300 border-blue-500/30', icon: Settings, desc: '승인/삭제 제외 모든 기능' },
  monitor: { label: 'Monitor', cls: 'bg-bg-muted/30 text-text-secondary border-line/30', icon: Eye, desc: '열람 + 공지/알림 작성만 가능' },
}

type TabKey = 'all' | 'admin' | 'corporate' | 'individual'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '전체 대기' },
  { key: 'admin', label: '관리자' },
  { key: 'corporate', label: '기업회원' },
  { key: 'individual', label: '게임회원' },
]

// ─── Approval Modal ─────────────────────────────────────────────────
function ApprovalModal({
  user, action, onClose, onConfirm, loading,
}: {
  user: PendingUser
  action: 'approved' | 'rejected'
  onClose: () => void
  onConfirm: (reason?: string) => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  const isApprove = action === 'approved'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-bold text-lg">{isApprove ? '회원 승인' : '회원 거절'}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-medium">{user.username}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_LABELS[user.role]?.cls}`}>{ROLE_LABELS[user.role]?.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${MEMBER_TYPE_LABELS[user.memberType || 'individual']?.cls}`}>{MEMBER_TYPE_LABELS[user.memberType || 'individual']?.label}</span>
          </div>
          <p className="text-text-secondary text-sm">{user.email}</p>
          {user.companyInfo?.companyName && <p className="text-text-secondary text-sm">회사: {user.companyInfo.companyName}</p>}
          {user.companyInfo?.companyType && user.companyInfo.companyType.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {user.companyInfo.companyType.map(t => (
                <span key={t} className="text-[10px] bg-bg-tertiary text-text-secondary px-1.5 py-0.5 rounded">{COMPANY_TYPE_LABELS[t] || t}</span>
              ))}
            </div>
          )}
        </div>
        <p className="text-text-secondary text-sm">{isApprove ? '이 회원의 가입을 승인하시겠습니까?' : '이 회원의 가입을 거절하시겠습니까?'}</p>
        {!isApprove && (
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="거절 사유를 입력해주세요" rows={3}
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none resize-none" />
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">취소</button>
          <button onClick={() => onConfirm(isApprove ? undefined : reason)} disabled={loading}
            className={`flex-1 px-4 py-2.5 text-text-primary rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors ${isApprove ? 'bg-accent hover:bg-accent-hover' : 'bg-red-600 hover:bg-red-700'}`}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isApprove ? <><Check className="w-4 h-4" /> 승인</> : <><XCircle className="w-4 h-4" /> 거절</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Admin Modal ─────────────────────────────────────────────
function CreateAdminModal({
  onClose, onCreated, loading, onSubmit,
}: {
  onClose: () => void
  onCreated: () => void
  loading: boolean
  onSubmit: (data: { email: string; username: string; password: string; adminLevel: 'super' | 'normal' | 'monitor' }) => void
}) {
  const [form, setForm] = useState({ email: '', username: '', password: '', adminLevel: '' as string })
  const [error, setError] = useState('')

  const handleSubmit = () => {
    setError('')
    if (!form.email || !form.username || !form.password) {
      setError('모든 필드를 입력해주세요')
      return
    }
    if (form.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다')
      return
    }
    if (!form.adminLevel) {
      setError('관리자 등급을 선택해주세요')
      return
    }
    onSubmit(form as { email: string; username: string; password: string; adminLevel: 'super' | 'normal' | 'monitor' })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-text" />
            <h3 className="text-text-primary font-bold text-lg">관리자 계정 생성</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">이메일 *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="admin@example.com"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">사용자명 *</label>
            <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              placeholder="admin_username"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-text-secondary text-xs mb-1.5">비밀번호 * (6자 이상)</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
          </div>

          <div>
            <label className="block text-text-secondary text-xs mb-2">관리자 등급 *</label>
            <div className="space-y-2">
              {(['super', 'normal', 'monitor'] as const).map(level => {
                const info = ADMIN_LEVEL_LABELS[level]
                const Icon = info.icon
                const selected = form.adminLevel === level
                return (
                  <label key={level}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selected ? 'border-accent-muted bg-red-600/10' : 'border-line hover:border-line'
                    }`}>
                    <input type="radio" name="adminLevel" value={level}
                      checked={selected} onChange={() => setForm(p => ({ ...p, adminLevel: level }))}
                      className="accent-red-500" />
                    <Icon className={`w-4 h-4 ${selected ? 'text-accent-text' : 'text-text-muted'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${selected ? 'text-text-inverse' : 'text-text-secondary'}`}>{info.label} 관리자</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${info.cls}`}>{info.label}</span>
                      </div>
                      <p className="text-text-muted text-xs mt-0.5">{info.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {error && <p className="text-accent-text text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">취소</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Plus className="w-4 h-4" /> 생성
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AdminMembersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [users, setUsers] = useState<PendingUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [counts, setCounts] = useState<{ total: number; admin: number; corporate: number; individual: number }>({ total: 0, admin: 0, corporate: 0, individual: 0 })
  const [modalUser, setModalUser] = useState<PendingUser | null>(null)
  const [modalAction, setModalAction] = useState<'approved' | 'rejected'>('approved')
  const [submitting, setSubmitting] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const limit = 15

  const loadCounts = useCallback(async () => {
    try {
      const data = await adminService.getPendingMemberCounts()
      setCounts(data)
    } catch { /* noop */ }
  }, [])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit, approvalStatus: 'pending' }
      if (search) params.search = search
      if (activeTab === 'admin') params.role = 'admin'
      if (activeTab === 'corporate') params.memberType = 'corporate'
      if (activeTab === 'individual') params.memberType = 'individual'
      const data = await adminService.getUsers(params as Parameters<typeof adminService.getUsers>[0])
      setUsers(data.users)
      setTotal(data.total)
    } catch {
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, search, activeTab])

  useEffect(() => { loadCounts() }, [loadCounts])
  useEffect(() => { loadUsers() }, [loadUsers])

  const handleApproval = async (reason?: string) => {
    if (!modalUser) return
    setSubmitting(true)
    try {
      await adminService.approveUser(modalUser._id, {
        approvalStatus: modalAction,
        rejectedReason: modalAction === 'rejected' ? reason : undefined,
      })
      setModalUser(null)
      loadUsers()
      loadCounts()
    } catch {
      alert('처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateAdmin = async (data: { email: string; username: string; password: string; adminLevel: 'super' | 'normal' | 'monitor' }) => {
    setCreateLoading(true)
    try {
      await adminService.createAdminUser(data)
      setShowCreateAdmin(false)
      alert('관리자 계정이 생성되었습니다')
      loadUsers()
      loadCounts()
    } catch (err: any) {
      alert(err?.response?.data?.message || '관리자 계정 생성 실패')
    } finally {
      setCreateLoading(false)
    }
  }

  const openModal = (user: PendingUser, action: 'approved' | 'rejected') => {
    setModalUser(user)
    setModalAction(action)
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-accent-text" />
            <h2 className="text-text-primary text-xl font-bold">신규회원승인</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-600/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-lg text-sm font-medium">
              승인 대기 {counts.total}명
            </span>
            <button
              onClick={() => setShowCreateAdmin(true)}
              className="bg-red-600 hover:bg-red-700 text-text-primary px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> 관리자 추가
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1">
            {TABS.map(tab => {
              const count = tab.key === 'all' ? counts.total : counts[tab.key]
              return (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1) }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.key ? 'bg-accent-light text-accent-text border border-accent-muted' : 'text-text-secondary hover:text-text-primary'
                  }`}>
                  {tab.label}
                  {count > 0 && (
                    <span className="bg-amber-600/30 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{count}</span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="이름 또는 이메일 검색..."
              className="w-full bg-bg-tertiary border border-line text-text-primary rounded-lg pl-9 pr-3 py-1.5 text-sm placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-bg-secondary rounded-xl border border-line overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-text-secondary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-text-secondary">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">사용자명</th>
                    <th className="text-left px-4 py-3 font-medium">이메일</th>
                    <th className="text-left px-4 py-3 font-medium">역할</th>
                    <th className="text-left px-4 py-3 font-medium">회원유형</th>
                    <th className="text-left px-4 py-3 font-medium">회사/유형</th>
                    <th className="text-left px-4 py-3 font-medium">가입일</th>
                    <th className="text-left px-4 py-3 font-medium">승인/거절</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {users.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-text-muted">승인 대기중인 회원이 없습니다</td></tr>
                  ) : users.map((user, idx) => {
                    const rl = ROLE_LABELS[user.role] || { label: user.role, cls: 'bg-bg-tertiary text-text-secondary' }
                    const mt = MEMBER_TYPE_LABELS[user.memberType || 'individual']
                    const al = user.adminLevel ? ADMIN_LEVEL_LABELS[user.adminLevel] : null
                    return (
                      <tr key={user._id} className="hover:bg-bg-tertiary/30 transition-colors">
                        <td className="px-4 py-3 text-text-secondary">{(page - 1) * limit + idx + 1}</td>
                        <td className="px-4 py-3 text-text-primary font-medium">
                          <Link href={`/admin/users-enhanced/${user._id}`} className="hover:text-accent-text transition-colors">{user.username}</Link>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded border ${rl.cls}`}>{rl.label}</span>
                            {al && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${al.cls}`}>{al.label}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded border ${mt?.cls}`}>{mt?.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {user.memberType === 'corporate' ? (
                            <div className="space-y-1">
                              <span className="text-text-secondary text-xs">{user.companyInfo?.companyName || '-'}</span>
                              {user.companyInfo?.companyType && user.companyInfo.companyType.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {user.companyInfo.companyType.map(t => (
                                    <span key={t} className="text-[10px] bg-bg-tertiary text-text-secondary px-1.5 py-0.5 rounded">{COMPANY_TYPE_LABELS[t] || t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-muted text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openModal(user, 'approved')}
                              className="text-xs bg-accent-light text-accent border border-green-500/30 px-2.5 py-1 rounded hover:bg-accent/40 transition-colors flex items-center gap-1">
                              <Check className="w-3 h-3" /> 승인
                            </button>
                            <button onClick={() => openModal(user, 'rejected')}
                              className="text-xs bg-accent-light text-accent-text border border-accent-muted px-2.5 py-1 rounded hover:bg-red-600/40 transition-colors flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> 거절
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">이전</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${page === p ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'}`}>{p}</button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">다음</button>
          </div>
        )}
      </div>

      {/* Approval/Rejection Modal */}
      {modalUser && (
        <ApprovalModal user={modalUser} action={modalAction} onClose={() => setModalUser(null)} onConfirm={handleApproval} loading={submitting} />
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <CreateAdminModal
          onClose={() => setShowCreateAdmin(false)}
          onCreated={() => { loadUsers(); loadCounts() }}
          onSubmit={handleCreateAdmin}
          loading={createLoading}
        />
      )}
    </AdminLayout>
  )
}
