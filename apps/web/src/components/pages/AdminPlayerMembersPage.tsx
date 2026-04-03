'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, Search, UserCircle, X, Ban, Trash2, ShieldOff } from 'lucide-react'

interface IndividualMember {
  _id: string
  memberNo: string
  nickname: string
  username: string
  email: string
  level: number
  activityScore: number
  points: number
  lastLoginAt: string
  isActive: boolean
  status: string
  createdAt: string
}

interface BulkModalState {
  open: boolean
  type: 'notify' | 'score' | 'points' | null
}

const STATUS_OPTIONS = ['전체', '정상', '정지', '탈퇴']
const LIMIT_OPTIONS = [10, 20, 50]

export default function AdminPlayerMembersPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(monthAgo)
  const [endDate, setEndDate] = useState(today)
  const [status, setStatus] = useState('전체')
  const [levelMin, setLevelMin] = useState(1)
  const [levelMax, setLevelMax] = useState(50)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState('createdAt')
  const [limit, setLimit] = useState(20)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<IndividualMember[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<BulkModalState>({ open: false, type: null })
  const [modalTitle, setModalTitle] = useState('')
  const [modalMessage, setModalMessage] = useState('')
  const [modalAmount, setModalAmount] = useState(0)
  const [modalReason, setModalReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Ban modal
  const [banModal, setBanModal] = useState<{ open: boolean; userId: string; username: string }>({ open: false, userId: '', username: '' })
  const [banReason, setBanReason] = useState('')
  const [bannedUntil, setBannedUntil] = useState('')

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; userId: string; username: string }>({ open: false, userId: '', username: '' })

  const fetchData = useCallback(() => {
    setLoading(true)
    adminService.getIndividualMembers({
      page, limit, search: search || undefined,
      startDate, endDate,
      status: status === '전체' ? undefined : status,
      levelMin, levelMax, sortBy, sortOrder,
    })
      .then(res => {
        setData((res?.users ?? res?.data ?? res?.items ?? []) as IndividualMember[])
        setTotal(res?.total ?? 0)
      })
      .catch(() => { setData([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page, limit, search, startDate, endDate, status, levelMin, levelMax, sortBy, sortOrder])

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

  const openModal = (type: 'notify' | 'score' | 'points') => {
    if (selected.size === 0) return
    setModal({ open: true, type })
    setModalTitle(''); setModalMessage(''); setModalAmount(0); setModalReason('')
  }

  const submitModal = async () => {
    if (!modal.type || selected.size === 0) return
    setSubmitting(true)
    try {
      const ids = Array.from(selected)
      if (modal.type === 'notify') {
        await adminService.bulkNotify({ userIds: ids, title: modalTitle, message: modalMessage })
      } else {
        for (const id of ids) {
          if (modal.type === 'score') {
            await adminService.grantActivityScore(id, { amount: modalAmount, reason: modalReason })
          } else {
            await adminService.grantPoints(id, { amount: modalAmount, reason: modalReason })
          }
        }
      }
      setModal({ open: false, type: null })
      setSelected(new Set())
      fetchData()
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBan = async () => {
    setSubmitting(true)
    try {
      await adminService.banUser(banModal.userId, {
        isActive: false,
        banReason: banReason || '관리자에 의한 정지',
        bannedUntil: bannedUntil || undefined,
      })
      setBanModal({ open: false, userId: '', username: '' })
      setBanReason(''); setBannedUntil('')
      fetchData()
    } catch {
      alert('정지 처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnban = async (userId: string) => {
    try {
      await adminService.banUser(userId, { isActive: true })
      fetchData()
    } catch {
      alert('해제 실패')
    }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await adminService.deleteUser(deleteModal.userId)
      setDeleteModal({ open: false, userId: '', username: '' })
      fetchData()
    } catch {
      alert('삭제 처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / limit) || 1
  const statusColor = (m: IndividualMember) => {
    if (m.isActive === false) return 'text-accent-text'
    return 'text-emerald-400'
  }
  const statusLabel = (m: IndividualMember) => m.isActive === false ? '정지' : '정상'

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <UserCircle className="w-5 h-5 text-accent-text" />
          <h2 className="text-text-primary text-xl font-bold">게임유저관리</h2>
          <span className="text-text-secondary text-sm ml-auto">총 {total.toLocaleString()}명</span>
        </div>

        <div className="bg-bg-secondary border border-line rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="닉네임 / 이메일 / 회원번호 검색"
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
            <div className="flex items-center gap-2">
              <span className="text-text-secondary text-sm">레벨</span>
              <input type="number" min={1} max={50} value={levelMin} onChange={e => setLevelMin(Number(e.target.value))}
                className="w-16 bg-bg-tertiary border border-line rounded px-2 py-1.5 text-text-primary text-sm focus:outline-none" />
              <span className="text-text-secondary">~</span>
              <input type="number" min={1} max={50} value={levelMax} onChange={e => setLevelMax(Number(e.target.value))}
                className="w-16 bg-bg-tertiary border border-line rounded px-2 py-1.5 text-text-primary text-sm focus:outline-none" />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none">
              <option value="createdAt">최근 가입순</option>
              <option value="lastLoginAt">최근 접속순</option>
              <option value="activityScore">활동점수순</option>
              <option value="points">포인트순</option>
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
            <button onClick={() => openModal('notify')}
              className="px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-600/30 transition-colors">
              알림 발송
            </button>
            <button onClick={() => openModal('score')}
              className="px-3 py-1.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-600/30 transition-colors">
              활동점수 지급
            </button>
            <button onClick={() => openModal('points')}
              className="px-3 py-1.5 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-xs hover:bg-yellow-600/30 transition-colors">
              포인트 지급
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
                    <th className="text-right text-text-secondary font-medium px-4 py-3">레벨</th>
                    <th className="text-right text-text-secondary font-medium px-4 py-3">활동점수</th>
                    <th className="text-right text-text-secondary font-medium px-4 py-3">포인트</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">접속일시</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">상태</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">등록일시</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.length === 0 ? (
                    <tr><td colSpan={11} className="text-center text-text-secondary py-12">데이터가 없습니다</td></tr>
                  ) : data.map((m, i) => (
                    <tr key={m._id} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(m._id)} onChange={() => toggleSelect(m._id)} className="accent-red-500" />
                      </td>
                      <td className="text-text-secondary px-4 py-3">{(page - 1) * limit + i + 1}</td>
                      <td className="text-text-primary px-4 py-3 font-medium">{m.nickname || m.username}</td>
                      <td className="text-text-secondary px-4 py-3">{m.email}</td>
                      <td className="text-right text-violet-400 px-4 py-3 font-medium">Lv.{m.level}</td>
                      <td className="text-right text-emerald-400 px-4 py-3">{(m.activityScore ?? 0).toLocaleString()}</td>
                      <td className="text-right text-yellow-400 px-4 py-3">{(m.points ?? 0).toLocaleString()}</td>
                      <td className="text-text-secondary px-4 py-3 text-xs">{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('ko-KR') : '-'}</td>
                      <td className={`px-4 py-3 font-medium text-xs ${statusColor(m)}`}>{statusLabel(m)}</td>
                      <td className="text-text-secondary px-4 py-3 text-xs">{new Date(m.createdAt).toLocaleString('ko-KR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/users-enhanced/${m._id}`}
                            className="px-2 py-1 bg-bg-tertiary hover:bg-bg-hover text-text-secondary text-xs rounded transition-colors">
                            상세
                          </Link>
                          {m.isActive !== false ? (
                            <button onClick={() => { setBanModal({ open: true, userId: m._id, username: m.nickname || m.username }); setBanReason(''); setBannedUntil('') }}
                              className="p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-600/20 rounded transition-colors" title="정지">
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => handleUnban(m._id)}
                              className="p-1 text-accent hover:text-accent hover:bg-accent-light rounded transition-colors" title="해제">
                              <ShieldOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => setDeleteModal({ open: true, userId: m._id, username: m.nickname || m.username })}
                            className="p-1 text-accent-text hover:text-accent-text hover:bg-accent-light rounded transition-colors" title="삭제">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

      {/* Bulk modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-bold">
                {modal.type === 'notify' ? '알림 발송' : modal.type === 'score' ? '활동점수 지급' : '포인트 지급'}
              </h3>
              <button onClick={() => setModal({ open: false, type: null })} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-text-secondary text-sm">{selected.size}명에게 일괄 처리합니다</p>
            {modal.type === 'notify' ? (
              <>
                <input value={modalTitle} onChange={e => setModalTitle(e.target.value)} placeholder="알림 제목"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
                <textarea value={modalMessage} onChange={e => setModalMessage(e.target.value)} placeholder="알림 내용" rows={4}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none" />
              </>
            ) : (
              <>
                <input type="number" value={modalAmount} onChange={e => setModalAmount(Number(e.target.value))}
                  placeholder={modal.type === 'score' ? '지급할 활동점수' : '지급할 포인트'}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
                <input value={modalReason} onChange={e => setModalReason(e.target.value)} placeholder="지급 사유"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal({ open: false, type: null })}
                className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">
                취소
              </button>
              <button onClick={submitModal} disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban modal */}
      {banModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-text-primary font-bold">계정 정지</h3>
            <p className="text-text-secondary text-sm"><span className="text-text-primary">{banModal.username}</span>을(를) 정지하시겠습니까?</p>
            <div className="space-y-3">
              <div>
                <label className="block text-text-secondary text-xs mb-1">정지 사유</label>
                <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={2}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
                  placeholder="정지 사유를 입력하세요" />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">정지 종료일 (미입력 시 영구)</label>
                <input type="date" value={bannedUntil} onChange={e => setBannedUntil(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setBanModal({ open: false, userId: '', username: '' })}
                className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">
                취소
              </button>
              <button onClick={handleBan} disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                정지
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-text-primary font-bold">계정 삭제</h3>
            <p className="text-text-secondary text-sm">
              <span className="text-accent-text font-medium">{deleteModal.username}</span>의 계정을 삭제하시겠습니까?
            </p>
            <p className="text-accent-text/70 text-xs">이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteModal({ open: false, userId: '', username: '' })}
                className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">
                취소
              </button>
              <button onClick={handleDelete} disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
