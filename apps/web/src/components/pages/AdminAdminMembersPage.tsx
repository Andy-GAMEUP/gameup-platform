'use client'
import { useState, useEffect, useCallback } from 'react'
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
  isActive: boolean
  lastLoginAt: string
  createdAt: string
}

interface BulkModalState {
  open: boolean
  type: 'notify' | null
}

const STATUS_OPTIONS = ['전체', '정상', '정지']
const STATUS_MAP: Record<string, string> = { '정상': 'active', '정지': 'inactive' }
const LEVEL_OPTIONS = ['전체', 'super', 'normal', 'monitor']
const LEVEL_LABELS: Record<string, { label: string; cls: string }> = {
  super:   { label: 'Super',   cls: 'bg-accent-light text-accent-text border-accent-muted' },
  normal:  { label: 'Normal',  cls: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
  monitor: { label: 'Monitor', cls: 'bg-bg-muted/30 text-text-secondary border-line/30' },
}
const LIMIT_OPTIONS = [10, 20, 50]

const ADMIN_LEVEL_OPTIONS: { value: 'super' | 'normal' | 'monitor'; label: string; desc: string }[] = [
  { value: 'super',   label: 'Super',   desc: '모든 권한 (수정/삭제/승인)' },
  { value: 'normal',  label: 'Normal',  desc: '승인/삭제 제외 모든 기능' },
  { value: 'monitor', label: 'Monitor', desc: '열람 + 공지/알림 작성만 가능' },
]

function CreateAdminModal({
  onClose, onConfirm, loading,
}: {
  onClose: () => void
  onConfirm: (data: { email: string; username: string; password: string; adminLevel: 'super' | 'normal' | 'monitor' }) => void
  loading: boolean
}) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [adminLevel, setAdminLevel] = useState<'super' | 'normal' | 'monitor'>('normal')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-bold text-lg">관리자 추가</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일"
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="사용자명"
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호"
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
          <div className="space-y-2">
            <p className="text-text-secondary text-xs">관리자 등급</p>
            <div className="flex flex-col gap-2">
              {ADMIN_LEVEL_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${adminLevel === opt.value ? 'bg-accent-light border-accent-muted' : 'bg-bg-tertiary border-line hover:bg-bg-hover'}`}>
                  <input type="radio" name="adminLevel" value={opt.value} checked={adminLevel === opt.value} onChange={() => setAdminLevel(opt.value)} className="accent-red-500" />
                  <div>
                    <span className="text-text-primary text-sm font-medium">{opt.label}</span>
                    <span className="text-text-secondary text-xs ml-2">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">취소</button>
          <button onClick={() => onConfirm({ email, username, password, adminLevel })} disabled={loading || !email || !username || !password}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            추가
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminAdminMembersPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(monthAgo)
  const [endDate, setEndDate] = useState(today)
  const [status, setStatus] = useState('전체')
  const [levelFilter, setLevelFilter] = useState('전체')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState('createdAt')
  const [limit, setLimit] = useState(20)
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

  const fetchData = useCallback(() => {
    setLoading(true)
    const params: Record<string, unknown> = {
      page, limit, role: 'admin',
      search: search || undefined,
      startDate, endDate,
      sortBy, sortOrder,
    }
    if (status !== '전체') params.isActive = STATUS_MAP[status] === 'active'
    adminService.getUsers(params as Parameters<typeof adminService.getUsers>[0])
      .then(res => {
        let users: AdminMember[] = (res?.users ?? []) as AdminMember[]
        if (levelFilter !== '전체') users = users.filter(u => u.adminLevel === levelFilter)
        setData(users)
        setTotal(res?.total ?? 0)
      })
      .catch(() => { setData([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page, limit, search, startDate, endDate, status, levelFilter, sortBy, sortOrder])

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

  const submitModal = async () => {
    if (!modal.type || selected.size === 0) return
    setSubmitting(true)
    try {
      const ids = Array.from(selected)
      await adminService.bulkNotify({ userIds: ids, title: modalTitle, message: modalMessage })
      setModal({ open: false, type: null })
      setSelected(new Set())
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / limit) || 1
  const getStatusLabel = (m: AdminMember) => m.isActive !== false ? '정상' : '정지'
  const statusColor = (s: string) => s === '정상' ? 'text-emerald-400' : 'text-accent-text'

  const handleCreateAdmin = async (data: { email: string; username: string; password: string; adminLevel: 'super' | 'normal' | 'monitor' }) => {
    setCreateLoading(true)
    try {
      await adminService.createAdminUser(data)
      setShowCreateAdmin(false)
      alert('관리자 계정이 생성되었습니다')
      fetchData()
    } catch (err: any) {
      alert(err?.response?.data?.message || '관리자 계정 생성 실패')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-accent-text" />
          <h2 className="text-text-primary text-xl font-bold">관리자 관리</h2>
          <span className="text-text-secondary text-sm ml-auto">{loading ? '로딩 중...' : `총 ${total.toLocaleString()}명`}</span>
          <button onClick={() => setShowCreateAdmin(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary hover:bg-bg-hover text-text-secondary border border-line rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" />
            관리자 추가
          </button>
        </div>

        <div className="bg-bg-secondary border border-line rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="닉네임 / 이메일 검색"
                className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
            <span className="text-text-secondary text-sm">~</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1">
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => { setStatus(s); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${status === s ? 'bg-accent-light text-accent-text border-accent-muted' : 'bg-bg-tertiary text-text-secondary border-line hover:bg-line-light'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {LEVEL_OPTIONS.map(l => (
                <button key={l} onClick={() => { setLevelFilter(l); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${levelFilter === l ? 'bg-blue-600/20 text-blue-300 border-blue-500/30' : 'bg-bg-tertiary text-text-secondary border-line hover:bg-line-light'}`}>
                  {l === '전체' ? '등급전체' : l}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none">
              <option value="createdAt">최근 가입순</option>
              <option value="lastLoginAt">최근 접속순</option>
            </select>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none">
              <option value="desc">역순</option>
              <option value="asc">정순</option>
            </select>
            <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
              className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none">
              {LIMIT_OPTIONS.map(l => <option key={l} value={l}>{l}개씩</option>)}
            </select>
            <button onClick={() => { setPage(1); fetchData() }}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-text-primary text-sm rounded-lg transition-colors">
              검색
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-bg-tertiary/50 border border-line rounded-xl px-4 py-3">
            <span className="text-text-secondary text-sm font-medium">{selected.size}명 선택됨</span>
            <button onClick={() => { setModal({ open: true, type: 'notify' }); setModalTitle(''); setModalMessage('') }}
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
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={selected.size === data.length && data.length > 0}
                        onChange={toggleAll} className="accent-red-500" />
                    </th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">번호</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">닉네임</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">이메일</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">등급</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">최근 접속</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">상태</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">등록일시</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.length === 0 ? (
                    <tr><td colSpan={9} className="text-center text-text-secondary py-12">데이터가 없습니다</td></tr>
                  ) : data.map((m, i) => {
                    const level = m.adminLevel || 'normal'
                    const levelInfo = LEVEL_LABELS[level] || LEVEL_LABELS.normal
                    return (
                      <tr key={m._id} className="hover:bg-bg-tertiary/50 transition-colors">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.has(m._id)} onChange={() => toggleSelect(m._id)} className="accent-red-500" />
                        </td>
                        <td className="text-text-secondary px-4 py-3">{(page - 1) * limit + i + 1}</td>
                        <td className="text-text-primary px-4 py-3 font-medium">{m.username}</td>
                        <td className="text-text-secondary px-4 py-3">{m.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded border ${levelInfo.cls}`}>{levelInfo.label}</span>
                        </td>
                        <td className="text-text-secondary px-4 py-3 text-xs">{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('ko-KR') : '-'}</td>
                        <td className={`px-4 py-3 font-medium text-xs ${statusColor(getStatusLabel(m))}`}>{getStatusLabel(m)}</td>
                        <td className="text-text-secondary px-4 py-3 text-xs">{new Date(m.createdAt).toLocaleString('ko-KR')}</td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/users-enhanced/${m._id}`}
                            className="px-2 py-1 bg-bg-tertiary hover:bg-bg-hover text-text-secondary text-xs rounded transition-colors">
                            더보기
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
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
        <CreateAdminModal
          onClose={() => setShowCreateAdmin(false)}
          onConfirm={handleCreateAdmin}
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
    </AdminLayout>
  )
}
