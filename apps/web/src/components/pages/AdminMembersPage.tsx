'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Building2, Loader2, X, Search, UserCheck } from 'lucide-react'


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
    companyCategory?: 'developer' | 'partner'
    companyType?: string[]
    approvalStatus?: string
  }
  contactPerson?: { name?: string; phone?: string; email?: string }
  isActive: boolean
  createdAt: string
  partnerId?: string
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
      else if (statusFilter === '회원') params.approvalStatus = 'approved'
      const data = await adminService.getUsers(params as Parameters<typeof adminService.getUsers>[0])
      let filtered: PendingUser[] = (data.users as PendingUser[]).filter(u => u.role !== 'admin')
      setAllUsers(filtered)
      if (search) {
        const keyword = search.toLowerCase()
        filtered = filtered.filter(u =>
          u.username?.toLowerCase().includes(keyword) ||
          u.email?.toLowerCase().includes(keyword)
        )
      }
      if (companyNameFilter) {
        filtered = filtered.filter(u => u.companyInfo?.companyName?.includes(companyNameFilter))
      }
      if (companyTypeFilter !== '전체') {
        const isDev = companyTypeFilter === '개발사'
        filtered = filtered.filter(u => {
          const cat = u.companyInfo?.companyCategory
          const hasDev = cat === 'developer' || (!cat && u.companyInfo?.companyType?.includes('developer'))
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

  const handleInlineApprove = async (userId: string) => {
    setSubmitting(true)
    try {
      await adminService.approveUser(userId, { approvalStatus: 'approved' })
      loadUsers()
      loadCounts()
    } catch {
      alert('처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInlineDelete = async (userId: string) => {
    if (!confirm('계정을 완전히 삭제합니다. 되돌릴 수 없습니다. 계속하시겠습니까?')) return
    setSubmitting(true)
    try {
      await adminService.deleteUser(userId)
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
        <div>
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
          <p className="text-text-muted text-sm mt-1">가입 신청한 기업회원을 검토하고 승인을 관리합니다</p>
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
            <option value="대기">가입 대기</option>
            <option value="회원">회원</option>
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="사용자명 · 이메일 검색..."
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
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">대표 연락처</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">가입일</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">기업 정보</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">상태</th>
                    <th className="text-left px-4 py-3 font-medium">가입 승인</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {users.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-12 text-text-muted">데이터가 없습니다</td></tr>
                  ) : users.map((user, idx) => {
                    const _cat = user.companyInfo?.companyCategory
                    const isDeveloper = _cat === 'developer' || (!_cat && user.companyInfo?.companyType?.includes('developer'))
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
                        <td className="px-4 py-3 text-text-secondary border-r border-line/20">
                          {user.contactPerson?.phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-text-secondary border-r border-line/20">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                        <td className="px-4 py-3 border-r border-line/20">
                          <Link href={user.partnerId ? `/partner/${user.partnerId}` : `/admin/users-enhanced/${user._id}`}
                            className="px-3 py-1 rounded-md text-xs font-medium bg-bg-tertiary hover:bg-line-light border border-line text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap flex items-center gap-1 w-fit">
                            보기
                          </Link>
                        </td>
                        <td className="px-4 py-3 border-r border-line/20">
                          {!user.isActive
                            ? <span className="text-rose-400 font-medium">중지됨</span>
                            : user.approvalStatus === 'approved' ? <span className="text-text-primary font-medium">회원</span>
                            : <span className="text-amber-400 font-medium">가입 대기</span>}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const isApproved = user.approvalStatus === 'approved'
                            return (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => !isApproved && handleInlineApprove(user._id)}
                                  disabled={submitting || isApproved}
                                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${isApproved ? 'bg-emerald-600/30 text-emerald-400/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50'}`}>
                                  승인
                                </button>
                                <button
                                  onClick={() => !isApproved && !submitting && handleInlineDelete(user._id)}
                                  disabled={submitting || isApproved}
                                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${isApproved ? 'bg-rose-600/30 text-rose-400/50 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50'}`}>
                                  삭제
                                </button>
                              </div>
                            )
                          })()}
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

    </AdminLayout>
  )
}
