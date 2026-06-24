'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Building2, Loader2, Check, XCircle, X, Search, Shield, Eye, Settings } from 'lucide-react'


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

const ROLE_LABELS: Record<string, { label: string }> = {
  admin: { label: '관리자' },
  developer: { label: '개발자' },
  player: { label: '플레이어' },
}

const MEMBER_TYPE_LABELS: Record<string, { label: string }> = {
  individual: { label: '게임회원' },
  corporate: { label: '기업회원' },
}

const ADMIN_LEVEL_LABELS: Record<string, { label: string; icon: typeof Shield; desc: string }> = {
  super: { label: 'Super', icon: Shield, desc: '모든 권한 (수정/삭제/승인)' },
  normal: { label: 'Normal', icon: Settings, desc: '승인/삭제 제외 모든 기능' },
  monitor: { label: 'Monitor', icon: Eye, desc: '열람 + 공지/알림 작성만 가능' },
}


// ─── Manage Modal ────────────────────────────────────────────────────
function ManageModal({
  user, onClose, onApprove, onReject, loading,
}: {
  user: PendingUser
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-bold text-lg">회원 관리</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-4 space-y-1">
          <p className="text-text-primary font-medium text-sm">{user.username}</p>
          <p className="text-text-secondary text-xs">{user.email}</p>
          {user.companyInfo?.companyName && <p className="text-text-secondary text-xs">{user.companyInfo.companyName}</p>}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <button onClick={onApprove} disabled={loading}
            className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Check className="w-4 h-4" /> 가입 승인
          </button>
          <button onClick={onReject} disabled={loading}
            className="w-full px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4" /> 승인 거절
          </button>
          <button onClick={onClose} className="w-full px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">취소</button>
        </div>
      </div>
    </div>
  )
}

// ─── Review Modal (for rejected accounts) ───────────────────────────
function ReviewModal({
  user, onClose, onRestore, onDelete, loading,
}: {
  user: PendingUser
  onClose: () => void
  onRestore: () => void
  onDelete: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-bold text-lg">계정 검토</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-4 space-y-1">
          <p className="text-text-primary font-medium text-sm">{user.username}</p>
          <p className="text-text-secondary text-xs">{user.email}</p>
          {user.companyInfo?.companyName && <p className="text-text-secondary text-xs">{user.companyInfo.companyName}</p>}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <button onClick={onRestore} disabled={loading}
            className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Check className="w-4 h-4" /> 계정 살리기
          </button>
          <button onClick={onDelete} disabled={loading}
            className="w-full px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4" /> 완전 삭제
          </button>
          <button onClick={onClose} className="w-full px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">취소</button>
        </div>
      </div>
    </div>
  )
}

// ─── Member Manage Modal (for approved accounts) ────────────────────
function MemberManageModal({
  user, onClose, onSuspend, onDelete, loading,
}: {
  user: PendingUser
  onClose: () => void
  onSuspend: () => void
  onDelete: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-bold text-lg">회원 관리</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-4 space-y-1">
          <p className="text-text-primary font-medium text-sm">{user.username}</p>
          <p className="text-text-secondary text-xs">{user.email}</p>
          {user.companyInfo?.companyName && <p className="text-text-secondary text-xs">{user.companyInfo.companyName}</p>}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <button onClick={onSuspend} disabled={loading}
            className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            중지
          </button>
          <button onClick={onDelete} disabled={loading}
            className="w-full px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4" /> 삭제
          </button>
          <button onClick={onClose} className="w-full px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">취소</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AdminMembersPage() {
  const [pageTab] = useState('approval')
  const [users, setUsers] = useState<PendingUser[]>([])
  const [allUsers, setAllUsers] = useState<PendingUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [companyNameFilter, setCompanyNameFilter] = useState('')
  const [companyTypeFilter, setCompanyTypeFilter] = useState('전체')
  const [statusFilter, setStatusFilter] = useState('전체')
  const [page, setPage] = useState(1)
  const [counts, setCounts] = useState<{ total: number; developer: number; partner: number; admin: number; corporate: number; individual: number }>({ total: 0, developer: 0, partner: 0, admin: 0, corporate: 0, individual: 0 })
  const [manageUser, setManageUser] = useState<PendingUser | null>(null)
  const [reviewUser, setReviewUser] = useState<PendingUser | null>(null)
  const [suspendedUser, setSuspendedUser] = useState<PendingUser | null>(null)
  const [memberManageUser, setMemberManageUser] = useState<PendingUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
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
      const params: Record<string, unknown> = { page, limit, memberType: 'corporate' }
      if (statusFilter === '대기') params.approvalStatus = 'pending'
      else if (statusFilter === '회원') { params.approvalStatus = 'approved'; params.isActive = true }
      else if (statusFilter === '승인 거절') params.approvalStatus = 'rejected'
      else if (statusFilter === '중지됨') params.isActive = false
      const data = await adminService.getUsers(params as Parameters<typeof adminService.getUsers>[0])
      let filtered: PendingUser[] = (data.users as PendingUser[]).filter(u => u.role !== 'admin')
      setAllUsers(filtered)
      if (search) {
        const keyword = search.toLowerCase()
        filtered = filtered.filter(u =>
          u.username?.toLowerCase().includes(keyword) ||
          u.email?.toLowerCase().includes(keyword) ||
          (u.companyInfo?.companyType ?? []).some(t =>
            (COMPANY_TYPE_LABELS[t] || t).toLowerCase().includes(keyword)
          )
        )
      }
      if (companyNameFilter) {
        filtered = filtered.filter(u => u.companyInfo?.companyName?.includes(companyNameFilter))
      }
      if (companyTypeFilter !== '전체') {
        const isDev = companyTypeFilter === '개발사'
        filtered = filtered.filter(u => {
          const hasDev = u.companyInfo?.companyType?.includes('developer')
          return isDev ? hasDev : !hasDev
        })
      }
      setUsers(filtered)
      setTotal(data.total)
    } catch {
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, companyNameFilter, companyTypeFilter, statusFilter])

  useEffect(() => { loadCounts() }, [loadCounts])
  useEffect(() => { loadUsers() }, [loadUsers])

  const handleApprove = async () => {
    if (!manageUser) return
    setSubmitting(true)
    try {
      await adminService.approveUser(manageUser._id, { approvalStatus: 'approved' })
      setManageUser(null)
      loadUsers()
      loadCounts()
    } catch {
      alert('처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!manageUser) return
    setSubmitting(true)
    try {
      await adminService.approveUser(manageUser._id, { approvalStatus: 'rejected' })
      setManageUser(null)
      loadUsers()
      loadCounts()
    } catch {
      alert('처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestore = async () => {
    if (!reviewUser) return
    setSubmitting(true)
    try {
      await adminService.approveUser(reviewUser._id, { approvalStatus: 'pending' })
      setReviewUser(null)
      loadUsers()
      loadCounts()
    } catch {
      alert('처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!reviewUser) return
    if (!confirm(`"${reviewUser.username}" 계정을 완전 삭제합니다. 이 작업은 되돌릴 수 없습니다.`)) return
    setSubmitting(true)
    try {
      await adminService.deleteUser(reviewUser._id)
      setReviewUser(null)
      loadUsers()
      loadCounts()
    } catch {
      alert('삭제 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnsuspend = async () => {
    if (!suspendedUser) return
    setSubmitting(true)
    try {
      await adminService.banUser(suspendedUser._id, { isActive: true })
      setSuspendedUser(null)
      loadUsers()
    } catch {
      alert('처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSuspended = async () => {
    if (!suspendedUser) return
    if (!confirm(`"${suspendedUser.username}" 계정을 완전 삭제합니다. 이 작업은 되돌릴 수 없습니다.`)) return
    setSubmitting(true)
    try {
      await adminService.deleteUser(suspendedUser._id)
      setSuspendedUser(null)
      loadUsers()
      loadCounts()
    } catch {
      alert('삭제 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSuspendMember = async () => {
    if (!memberManageUser) return
    if (!confirm(`"${memberManageUser.username}" 계정을 중지합니다. 로그인이 불가능해집니다.`)) return
    setSubmitting(true)
    try {
      await adminService.banUser(memberManageUser._id, { isActive: false })
      setMemberManageUser(null)
      loadUsers()
    } catch {
      alert('처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteMember = async () => {
    if (!memberManageUser) return
    if (!confirm(`"${memberManageUser.username}" 계정을 완전 삭제합니다. 이 작업은 되돌릴 수 없습니다.`)) return
    setSubmitting(true)
    try {
      await adminService.deleteUser(memberManageUser._id)
      setMemberManageUser(null)
      loadUsers()
      loadCounts()
    } catch {
      alert('삭제 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-accent-text" />
            <h2 className="text-text-primary text-xl font-bold">기업회원</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-bg-tertiary text-text-secondary border border-line px-3 py-1 rounded-lg text-sm font-medium">
              승인 대기 {counts.total}명
            </span>
          </div>
        </div>

        {pageTab === 'approval' && <>
        {/* Search */}
        <div className="flex items-center gap-2">
          <select value={companyNameFilter} onChange={e => { setCompanyNameFilter(e.target.value); setPage(1) }}
            className="bg-bg-tertiary border border-line text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent">
            <option value="">회사명 전체</option>
            {[...new Set(allUsers.map(u => u.companyInfo?.companyName).filter(Boolean))].map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select value={companyTypeFilter} onChange={e => { setCompanyTypeFilter(e.target.value); setPage(1) }}
            className="bg-bg-tertiary border border-line text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent">
            <option value="전체">기업 유형 전체</option>
            <option value="개발사">개발사</option>
            <option value="파트너">파트너</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="bg-bg-tertiary border border-line text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent">
            <option value="전체">상태 전체</option>
            <option value="대기">대기</option>
            <option value="회원">회원</option>
            <option value="중지됨">중지됨</option>
            <option value="승인 거절">승인 거절</option>
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="사용자명 · 이메일 · 사업 형태 검색..."
              className="w-full bg-bg-tertiary border border-line text-text-primary rounded-lg pl-9 pr-3 py-1.5 text-sm placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-bg-secondary rounded-xl border border-line overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-text-secondary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line text-text-secondary">
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">No.</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">사용자명</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">이메일</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">회사명</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">기업 유형</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">사업 형태</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">대표 연락처</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">가입일</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">유저 정보</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">상태</th>
                    <th className="text-left px-4 py-3 font-medium">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {users.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-12 text-text-muted">데이터가 없습니다</td></tr>
                  ) : users.map((user, idx) => {
                    const isDeveloper = user.companyInfo?.companyType?.includes('developer')
                    const partnerTypes = (user.companyInfo?.companyType || []).filter(t => t !== 'developer')
                    return (
                      <tr key={user._id} className="hover:bg-bg-tertiary/30 transition-colors">
                        <td className="px-4 py-3 text-text-secondary border-r border-line/20">{(page - 1) * limit + idx + 1}</td>
                        <td className="px-4 py-3 text-text-primary font-medium border-r border-line/20">
                          <Link href={`/admin/users-enhanced/${user._id}`} className="hover:text-accent-text transition-colors">{user.username}</Link>
                        </td>
                        <td className="px-4 py-3 text-text-secondary border-r border-line/20">{user.email}</td>
                        <td className="px-4 py-3 text-text-secondary border-r border-line/20">
                          {user.companyInfo?.companyName || '-'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary border-r border-line/20">
                          {isDeveloper ? '개발사' : '파트너'}
                        </td>
                        <td className="px-4 py-3 border-r border-line/20">
                          {isDeveloper ? (
                            <span className="text-text-muted">-</span>
                          ) : partnerTypes.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1">
                              {partnerTypes.map(t => (
                                <span key={t} className="text-xs bg-bg-tertiary text-text-secondary px-1.5 py-0.5 rounded text-center">{COMPANY_TYPE_LABELS[t] || t}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-secondary border-r border-line/20">
                          {user.contactPerson?.phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary border-r border-line/20">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                        <td className="px-4 py-3 border-r border-line/20">
                          <Link href={`/admin/users-enhanced/${user._id}`}
                            className="px-3 py-1 rounded-md text-xs font-medium bg-bg-tertiary hover:bg-line-light border border-line text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap flex items-center gap-1 w-fit">
                            보기
                          </Link>
                        </td>
                        <td className="px-4 py-3 border-r border-line/20">
                          {!user.isActive
                            ? <span className="text-orange-400 font-medium">중지됨</span>
                            : user.approvalStatus === 'approved' ? <span className="text-text-primary font-medium">회원</span>
                            : user.approvalStatus === 'pending' ? <span className="text-amber-400 font-medium">대기</span>
                            : user.approvalStatus === 'rejected' ? <span className="text-rose-400 font-medium">승인 거절</span>
                            : null}
                        </td>
                        <td className="px-4 py-3">
                          {user.approvalStatus === 'approved' && !user.isActive && (
                            <button onClick={() => setSuspendedUser(user)}
                              className="px-3 py-1 rounded-md text-xs font-medium bg-transparent hover:bg-orange-500/10 border border-orange-500 text-orange-400 transition-colors whitespace-nowrap">
                              계정 검토
                            </button>
                          )}
                          {user.approvalStatus === 'approved' && user.isActive && (
                            <button onClick={() => setMemberManageUser(user)}
                              className="px-3 py-1 rounded-md text-xs font-medium bg-slate-600 hover:bg-slate-500 border border-slate-500 text-white transition-colors whitespace-nowrap">
                              회원관리
                            </button>
                          )}
                          {user.approvalStatus === 'pending' && (
                            <button onClick={() => setManageUser(user)}
                              className="px-3 py-1 rounded-md text-xs font-medium bg-amber-400 hover:bg-amber-500 border border-amber-500 text-black transition-colors whitespace-nowrap">
                              승인 검토
                            </button>
                          )}
                          {user.approvalStatus === 'rejected' && (
                            <button onClick={() => setReviewUser(user)}
                              className="px-3 py-1 rounded-md text-xs font-medium bg-rose-500 hover:bg-rose-600 text-white border border-rose-600 transition-colors whitespace-nowrap">
                              계정 검토
                            </button>
                          )}
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
                  className={`px-3 py-1.5 text-sm rounded-lg ${page === p ? 'bg-slate-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'}`}>{p}</button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">다음</button>
          </div>
        )}
        </>}
      </div>

      {manageUser && (
        <ManageModal user={manageUser} onClose={() => setManageUser(null)} onApprove={handleApprove} onReject={handleReject} loading={submitting} />
      )}
      {reviewUser && (
        <ReviewModal user={reviewUser} onClose={() => setReviewUser(null)} onRestore={handleRestore} onDelete={handlePermanentDelete} loading={submitting} />
      )}
      {suspendedUser && (
        <ReviewModal user={suspendedUser} onClose={() => setSuspendedUser(null)} onRestore={handleUnsuspend} onDelete={handleDeleteSuspended} loading={submitting} />
      )}
      {memberManageUser && (
        <MemberManageModal user={memberManageUser} onClose={() => setMemberManageUser(null)} onSuspend={handleSuspendMember} onDelete={handleDeleteMember} loading={submitting} />
      )}

    </AdminLayout>
  )
}
