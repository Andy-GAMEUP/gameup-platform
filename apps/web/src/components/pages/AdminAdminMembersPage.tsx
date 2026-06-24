'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, Search, Shield, X, Plus } from 'lucide-react'

interface AdminMember {
  _id: string
  username: string
  email: string
  role: string
  adminLevel?: string
  adminGrantedAt?: string
  isActive: boolean
  lastLoginAt: string
  createdAt: string
  memberType?: string
  isPartner?: boolean
  companyInfo?: { companyName?: string }
}

const getOriginalRole = (m: AdminMember) =>
  m.memberType === 'corporate' || m.companyInfo?.companyName ? 'developer' : 'player'

const getOriginalRoleLabel = (m: AdminMember) => {
  if (m.isPartner) return '파트너'
  if (m.memberType === 'corporate' || m.companyInfo?.companyName) return '개발사'
  return '게임회원'
}

interface BulkModalState {
  open: boolean
  type: 'notify' | null
}

const LEVEL_LABELS: Record<string, { label: string; cls: string }> = {
  super:   { label: 'Super',   cls: 'bg-accent-light text-accent-text border-accent-muted' },
  normal:  { label: 'Normal',  cls: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
  monitor: { label: 'Monitor', cls: 'bg-bg-muted/30 text-text-secondary border-line/30' },
}

interface UserSearchResult {
  _id: string
  username: string
  email: string
  role: string
  isActive: boolean
  isPartner?: boolean
  memberType?: string
  approvalStatus?: string
  lastLoginAt?: string
  createdAt: string
  companyInfo?: { companyName?: string }
}

const TYPE_LABEL: Record<string, string> = {
  player: '게임회원',
  developer: '개발사',
  partner: '파트너',
}

function GrantAdminModal({
  onClose, onConfirm, loading,
}: {
  onClose: () => void
  onConfirm: (user: UserSearchResult) => void
  loading: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<UserSearchResult | null>(null)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = async (q?: string) => {
    const term = (q ?? query).trim()
    setSearching(true)
    setSearched(true)
    setSelected(null)
    try {
      const res = await adminService.getUsers({ search: term || undefined, limit: 20 })
      const filtered = (res?.users ?? []).filter((u: UserSearchResult) => u.role !== 'admin')
      setResults(filtered)
      if (filtered.length === 1) setSelected(filtered[0])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setResults([]); setSelected(null); setSearched(false); return }
    debounceRef.current = setTimeout(() => handleSearch(value), 400)
  }

  const getUserTypeLabel = (u: UserSearchResult) => {
    if (u.isPartner) return TYPE_LABEL.partner
    return TYPE_LABEL[u.role] ?? u.role
  }

  const initials = (name: string) => name.slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-lg p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-bold text-lg">관리자 추가</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="이메일로 검색"
              className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={searching}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0 font-medium"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}
          </button>
        </div>

        {searched && (
          results.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-4">검색 결과가 없습니다</p>
          ) : results.length > 1 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto -mx-1 px-1">
              {results.map(u => (
                <button
                  key={u._id}
                  onClick={() => setSelected(u)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    selected?._id === u._id
                      ? 'bg-red-600/10 border-red-500/40'
                      : 'bg-bg-tertiary hover:bg-bg-hover border-transparent hover:border-line'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    selected?._id === u._id ? 'bg-red-600/20 text-red-400' : 'bg-bg-hover text-text-secondary'
                  }`}>
                    {initials(u.username)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{u.username}</p>
                    <p className="text-text-secondary text-xs truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-text-secondary">{getUserTypeLabel(u)}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  </div>
                </button>
              ))}
            </div>
          ) : null
        )}

        <div className="bg-bg-tertiary rounded-xl border border-line overflow-hidden min-h-[120px]">
          {!selected ? (
            <div className="flex items-center justify-center h-full min-h-[120px]">
              <p className="text-text-secondary text-sm">추가할 관리자 계정을 이메일로 검색하세요</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-bg-hover/50">
                <div className="w-9 h-9 rounded-full bg-red-600/20 flex items-center justify-center text-sm font-bold text-red-400 shrink-0">
                  {initials(selected.username)}
                </div>
                <div className="min-w-0">
                  <p className="text-text-primary font-semibold text-sm">{selected.username}</p>
                  <p className="text-text-secondary text-xs truncate">{selected.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 py-3 text-xs">
                <div>
                  <p className="text-text-secondary mb-0.5">계정 유형</p>
                  <p className="text-text-primary font-medium">{getUserTypeLabel(selected)}</p>
                </div>
                {selected.companyInfo?.companyName && (
                  <div>
                    <p className="text-text-secondary mb-0.5">회사명</p>
                    <p className="text-text-primary font-medium">{selected.companyInfo.companyName}</p>
                  </div>
                )}
                <div>
                  <p className="text-text-secondary mb-0.5">유저 상태</p>
                  {selected.isActive === false ? (
                    <p className="font-medium text-red-400">정지</p>
                  ) : selected.approvalStatus === 'rejected' ? (
                    <p className="font-medium text-red-400">반려</p>
                  ) : selected.approvalStatus === 'pending' ? (
                    <p className="font-medium text-amber-400">대기</p>
                  ) : (
                    <p className="font-medium text-emerald-400">정상</p>
                  )}
                </div>
                {selected.lastLoginAt && (
                  <div>
                    <p className="text-text-secondary mb-0.5">마지막 접속</p>
                    <p className="text-text-primary font-medium">{new Date(selected.lastLoginAt).toLocaleDateString('ko-KR')}</p>
                  </div>
                )}
                <div>
                  <p className="text-text-secondary mb-0.5">가입일</p>
                  <p className="text-text-primary font-medium">{new Date(selected.createdAt).toLocaleDateString('ko-KR')}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">
            취소
          </button>
          {(() => {
            const blocked = selected && (selected.isActive === false || selected.approvalStatus === 'rejected' || selected.approvalStatus === 'pending')
            return (
              <button
                onClick={() => selected && onConfirm(selected)}
                disabled={loading || !selected || !!blocked}
                title={blocked ? '정지 또는 반려된 계정은 관리자로 추가할 수 없습니다' : undefined}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                관리자로 추가
              </button>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default function AdminAdminMembersPage() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminMember[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<BulkModalState>({ open: false, type: null })
  const [modalTitle, setModalTitle] = useState('')
  const [modalMessage, setModalMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [revokeModal, setRevokeModal] = useState<{ open: boolean; member: AdminMember | null }>({ open: false, member: null })
  const [revokeLoading, setRevokeLoading] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    adminService.getUsers({ page, limit: 20, role: 'admin' } as Parameters<typeof adminService.getUsers>[0])
      .then(res => {
        setData((res?.users ?? []) as AdminMember[])
        setTotal(res?.total ?? 0)
      })
      .catch(() => { setData([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === data.length) setSelected(new Set())
    else setSelected(new Set(data.map(m => m._id)))
  }

  const openModal = (type: 'notify') => {
    if (selected.size === 0) return
    setModal({ open: true, type })
    setModalTitle(''); setModalMessage('')
  }

  const submitModal = async () => {
    if (!modal.type || selected.size === 0) return
    setSubmitting(true)
    try {
      const ids = Array.from(selected)
      await adminService.bulkNotify({ userIds: ids, title: modalTitle, message: modalMessage })
      setModal({ open: false, type: null })
      setSelected(new Set())
      fetchData()
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGrantAdmin = async (user: UserSearchResult) => {
    setCreateLoading(true)
    try {
      await adminService.updateUserRole(user._id, 'admin')
      setShowCreateAdmin(false)
      alert(`${user.username} 계정에 관리자 권한이 부여되었습니다`)
      fetchData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      alert(e?.response?.data?.message || '관리자 권한 부여 실패')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeModal.member) return
    setRevokeLoading(true)
    try {
      await adminService.updateUserRole(revokeModal.member._id, getOriginalRole(revokeModal.member))
      setRevokeModal({ open: false, member: null })
      fetchData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      alert(e?.response?.data?.message || '권한 해제 실패')
    } finally {
      setRevokeLoading(false)
    }
  }

  const totalPages = Math.ceil(total / 20) || 1
  const getStatusLabel = (m: AdminMember) => m.isActive !== false ? '정상' : '정지'
  const statusColor = (s: string) => s === '정상' ? 'text-emerald-400' : s === '정지' ? 'text-accent-text' : 'text-text-secondary'

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-accent-text" />
          <h2 className="text-text-primary text-xl font-bold">관리자</h2>
          <span className="text-text-secondary text-sm ml-auto">{loading ? '로딩 중...' : `총 ${total.toLocaleString()}명`}</span>
          <button onClick={() => setShowCreateAdmin(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-text-primary rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" />
            관리자 추가
          </button>
        </div>


        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-bg-tertiary/50 border border-line rounded-xl px-4 py-3">
            <span className="text-text-secondary text-sm font-medium">{selected.size}명 선택됨</span>
            <button onClick={() => openModal('notify')}
              className="px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-600/30 transition-colors">
              알림 발송
            </button>
          </div>
        )}

        <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-text-secondary font-medium px-4 py-3 border-r border-line/20">No.</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3 border-r border-line/20">닉네임</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3 border-r border-line/20">이메일</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3 border-r border-line/20">가입일시</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3 border-r border-line/20">관리자 등급 일시</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3 border-r border-line/20">상세</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-text-secondary py-12">데이터가 없습니다</td></tr>
                  ) : data.map((m, i) => (
                    <tr key={m._id} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="text-text-secondary px-4 py-3 border-r border-line/20">{(page - 1) * 20 + i + 1}</td>
                      <td className="text-text-primary px-4 py-3 font-medium border-r border-line/20">{m.username}</td>
                      <td className="text-text-secondary px-4 py-3 border-r border-line/20">{m.email}</td>
                      <td className="text-text-secondary px-4 py-3 text-xs border-r border-line/20">{new Date(m.createdAt).toLocaleString('ko-KR')}</td>
                      <td className="text-text-secondary px-4 py-3 text-xs border-r border-line/20">
                        {m.adminGrantedAt ? new Date(m.adminGrantedAt).toLocaleString('ko-KR') : '-'}
                      </td>
                      <td className="px-4 py-3 border-r border-line/20">
                        <Link href={`/admin/users-enhanced/${m._id}`}
                          className="px-2 py-1 bg-bg-tertiary hover:bg-bg-hover text-text-secondary text-xs rounded transition-colors">
                          더보기
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setRevokeModal({ open: true, member: m })}
                          className="px-2 py-1 bg-accent-light hover:bg-accent-light/80 text-accent-text text-xs rounded transition-colors border border-accent-muted"
                        >
                          권한 해제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40 transition-colors">
              이전
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${page === p ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'}`}>
                  {p}
                </button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40 transition-colors">
              다음
            </button>
          </div>
        )}
      </div>

      {showCreateAdmin && (
        <GrantAdminModal
          onClose={() => setShowCreateAdmin(false)}
          onConfirm={handleGrantAdmin}
          loading={createLoading}
        />
      )}

      {modal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-bold">알림 발송</h3>
              <button onClick={() => setModal({ open: false, type: null })} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-text-secondary text-sm">{selected.size}명에게 알림을 발송합니다</p>
            <input value={modalTitle} onChange={e => setModalTitle(e.target.value)} placeholder="알림 제목"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
            <textarea value={modalMessage} onChange={e => setModalMessage(e.target.value)} placeholder="알림 내용" rows={4}
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal({ open: false, type: null })}
                className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">
                취소
              </button>
              <button onClick={submitModal} disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                발송
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeModal.open && revokeModal.member && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-bold">관리자 권한 해제</h3>
              <button onClick={() => setRevokeModal({ open: false, member: null })} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-text-secondary text-sm">
              <span className="text-text-primary font-medium">{revokeModal.member.username}</span> 계정의 관리자 권한을 해제합니다.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRevokeModal({ open: false, member: null })}
                className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">
                취소
              </button>
              <button onClick={handleRevoke} disabled={revokeLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {revokeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                권한 해제
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
