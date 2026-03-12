'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, Search, Building2, X } from 'lucide-react'

interface CorporateMember {
  _id: string
  memberNo: string
  nickname: string
  username: string
  email: string
  companyName: string
  companyInfo?: {
    companyName?: string
    companyType?: string[]
    approvalStatus?: string
    rejectedReason?: string
  }
  points: number
  lastLoginAt: string
  status: string
  createdAt: string
}

interface BulkModalState {
  open: boolean
  type: 'notify' | 'points' | null
}

interface ApprovalModalState {
  open: boolean
  userId: string
  action: 'approved' | 'rejected'
  reason: string
}

const STATUS_OPTIONS = ['전체', '정상', '정지', '탈퇴']
const APPROVAL_OPTIONS = ['전체', '대기', '승인', '거절']
const APPROVAL_MAP: Record<string, string> = { '대기': 'pending', '승인': 'approved', '거절': 'rejected' }

const COMPANY_TYPE_LABELS: Record<string, string> = {
  developer: '개발사', publisher: '퍼블리셔', game_solution: '게임솔루션',
  game_service: '게임서비스', operations: '운영', qa: 'QA', marketing: '마케팅', other: '기타',
}
const LIMIT_OPTIONS = [10, 20, 50]

export default function AdminCorporateMembersPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(monthAgo)
  const [endDate, setEndDate] = useState(today)
  const [status, setStatus] = useState('전체')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState('createdAt')
  const [limit, setLimit] = useState(20)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CorporateMember[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [approvalFilter, setApprovalFilter] = useState('전체')
  const [approvalModal, setApprovalModal] = useState<ApprovalModalState>({ open: false, userId: '', action: 'approved', reason: '' })
  const [modal, setModal] = useState<BulkModalState>({ open: false, type: null })
  const [modalTitle, setModalTitle] = useState('')
  const [modalMessage, setModalMessage] = useState('')
  const [modalAmount, setModalAmount] = useState(0)
  const [modalReason, setModalReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    adminService.getCorporateMembers({
      page, limit, search: search || undefined,
      startDate, endDate,
      status: status === '전체' ? undefined : status,
      approvalStatus: approvalFilter !== '전체' ? APPROVAL_MAP[approvalFilter] : undefined,
      sortBy, sortOrder,
    })
      .then(res => {
        setData((res?.data ?? res?.items ?? []) as CorporateMember[])
        setTotal(res?.total ?? 0)
      })
      .catch(() => { setData([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page, limit, search, startDate, endDate, status, approvalFilter, sortBy, sortOrder])

  const handleApproval = async () => {
    setSubmitting(true)
    try {
      await adminService.updateCorporateApproval(approvalModal.userId, {
        approvalStatus: approvalModal.action,
        rejectedReason: approvalModal.action === 'rejected' ? approvalModal.reason : undefined,
      })
      setApprovalModal({ open: false, userId: '', action: 'approved', reason: '' })
      fetchData()
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

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

  const openModal = (type: 'notify' | 'points') => {
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
          await adminService.grantPoints(id, { amount: modalAmount, reason: modalReason })
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

  const totalPages = Math.ceil(total / limit) || 1
  const statusColor = (s: string) => s === '정상' ? 'text-emerald-400' : s === '정지' ? 'text-red-400' : 'text-slate-400'

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-red-400" />
          <h2 className="text-white text-xl font-bold">기업회원 관리</h2>
          <span className="text-slate-400 text-sm ml-auto">{loading ? '로딩 중...' : `총 ${total.toLocaleString()}개사`}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="닉네임 / 이메일 / 회사명 / 회원번호 검색"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
            <span className="text-slate-400 text-sm">~</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1">
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => { setStatus(s); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${status === s ? 'bg-red-600/20 text-red-300 border-red-500/30' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {APPROVAL_OPTIONS.map(s => (
                <button key={s} onClick={() => { setApprovalFilter(s); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${approvalFilter === s ? 'bg-blue-600/20 text-blue-300 border-blue-500/30' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                  {s === '전체' ? '승인전체' : s}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
              <option value="createdAt">최근 가입순</option>
              <option value="lastLoginAt">최근 접속순</option>
              <option value="points">포인트순</option>
            </select>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
              <option value="desc">역순</option>
              <option value="asc">정순</option>
            </select>
            <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
              {LIMIT_OPTIONS.map(l => <option key={l} value={l}>{l}개씩</option>)}
            </select>
            <button onClick={() => { setPage(1); fetchData() }}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
              검색
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
            <span className="text-slate-300 text-sm font-medium">{selected.size}개사 선택됨</span>
            <button onClick={() => openModal('notify')}
              className="px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-600/30 transition-colors">
              알림 발송
            </button>
            <button onClick={() => openModal('points')}
              className="px-3 py-1.5 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-xs hover:bg-yellow-600/30 transition-colors">
              포인트 지급
            </button>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={selected.size === data.length && data.length > 0}
                        onChange={toggleAll} className="accent-red-500" />
                    </th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">번호</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">닉네임</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">이메일</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">회사명</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">기업유형</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">승인상태</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-3">포인트</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">접속일시</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">상태</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">등록일시</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.length === 0 ? (
                    <tr><td colSpan={12} className="text-center text-slate-400 py-12">데이터가 없습니다</td></tr>
                  ) : data.map((m, i) => {
                    const approval = m.companyInfo?.approvalStatus || 'pending'
                    const approvalLabel = approval === 'approved' ? '승인' : approval === 'rejected' ? '거절' : '대기'
                    const approvalColor = approval === 'approved' ? 'bg-green-500/20 text-green-400' : approval === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    return (
                    <tr key={m._id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(m._id)} onChange={() => toggleSelect(m._id)} className="accent-red-500" />
                      </td>
                      <td className="text-slate-400 px-4 py-3">{(page - 1) * limit + i + 1}</td>
                      <td className="text-white px-4 py-3 font-medium">{m.nickname || m.username}</td>
                      <td className="text-slate-300 px-4 py-3">{m.email}</td>
                      <td className="text-slate-300 px-4 py-3">{m.companyInfo?.companyName || m.companyName || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.companyInfo?.companyType?.map((t: string) => (
                            <span key={t} className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{COMPANY_TYPE_LABELS[t] || t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${approvalColor}`}>{approvalLabel}</span>
                          {approval === 'pending' && (
                            <div className="flex gap-1">
                              <button onClick={() => setApprovalModal({ open: true, userId: m._id, action: 'approved', reason: '' })}
                                className="text-[10px] px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors">
                                승인
                              </button>
                              <button onClick={() => setApprovalModal({ open: true, userId: m._id, action: 'rejected', reason: '' })}
                                className="text-[10px] px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
                                거절
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-right text-yellow-400 px-4 py-3">{(m.points ?? 0).toLocaleString()}</td>
                      <td className="text-slate-400 px-4 py-3 text-xs">{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('ko-KR') : '-'}</td>
                      <td className={`px-4 py-3 font-medium text-xs ${statusColor(m.status)}`}>{m.status}</td>
                      <td className="text-slate-400 px-4 py-3 text-xs">{new Date(m.createdAt).toLocaleString('ko-KR')}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users-enhanced/${m._id}`}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors">
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
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors">
              이전
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${page === p ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  {p}
                </button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors">
              다음
            </button>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">{modal.type === 'notify' ? '알림 발송' : '포인트 지급'}</h3>
              <button onClick={() => setModal({ open: false, type: null })} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm">{selected.size}개사에게 일괄 처리합니다</p>
            {modal.type === 'notify' ? (
              <>
                <input value={modalTitle} onChange={e => setModalTitle(e.target.value)} placeholder="알림 제목"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                <textarea value={modalMessage} onChange={e => setModalMessage(e.target.value)} placeholder="알림 내용" rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 resize-none" />
              </>
            ) : (
              <>
                <input type="number" value={modalAmount} onChange={e => setModalAmount(Number(e.target.value))} placeholder="지급할 포인트"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                <input value={modalReason} onChange={e => setModalReason(e.target.value)} placeholder="지급 사유"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal({ open: false, type: null })}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors">
                취소
              </button>
              <button onClick={submitModal} disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {approvalModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">
                {approvalModal.action === 'approved' ? '기업회원 승인' : '기업회원 거절'}
              </h3>
              <button onClick={() => setApprovalModal({ open: false, userId: '', action: 'approved', reason: '' })}
                className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm">
              {approvalModal.action === 'approved'
                ? '이 기업회원을 승인하시겠습니까?'
                : '이 기업회원의 가입을 거절하시겠습니까?'}
            </p>
            {approvalModal.action === 'rejected' && (
              <textarea
                value={approvalModal.reason}
                onChange={e => setApprovalModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="거절 사유를 입력해주세요"
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
              />
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setApprovalModal({ open: false, userId: '', action: 'approved', reason: '' })}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors">
                취소
              </button>
              <button onClick={handleApproval} disabled={submitting}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  approvalModal.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {approvalModal.action === 'approved' ? '승인' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
