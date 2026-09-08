'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, Search, UserCircle, X } from 'lucide-react'

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
  companyName?: string | null
}

interface BulkModalState {
  open: boolean
  type: 'notify' | 'score' | 'points' | null
}

export default function AdminPlayerMembersPage() {
  const [search, setSearch] = useState('')
  const [limit] = useState(20)
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

  const fetchData = useCallback(() => {
    setLoading(true)
    adminService.getIndividualMembers({ page, limit, search: search || undefined })
      .then(res => {
        setData((res?.users ?? res?.data ?? res?.items ?? []) as IndividualMember[])
        setTotal(res?.total ?? 0)
      })
      .catch(() => { setData([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page, limit, search])

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

  const totalPages = Math.ceil(total / limit) || 1
  const statusColor = (m: IndividualMember) => {
    if (m.isActive === false) return 'text-accent-text'
    return 'text-text-primary'
  }
  const statusLabel = (m: IndividualMember) => m.isActive === false ? '정지' : '활성'

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-3">
            <UserCircle className="w-5 h-5 text-accent-text" />
            <h2 className="text-text-primary text-xl font-bold">게임회원</h2>
            <span className="text-text-secondary text-sm ml-auto">총 {total.toLocaleString()}명</span>
          </div>
          <p className="text-text-muted text-sm mt-1">플랫폼에 가입한 게임회원 계정을 조회하고 관리합니다</p>
        </div>

        <div className="relative w-[19%]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="닉네임 · 이메일 검색..."
            className="w-full bg-bg-secondary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-bg-tertiary/50 border border-line rounded-xl px-4 py-3">
            <span className="text-text-secondary text-sm font-medium">{selected.size}명 선택됨</span>
            <button onClick={() => openModal('notify')}
              className="px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-base hover:bg-blue-600/30 transition-colors">
              알림 발송
            </button>
            <button onClick={() => openModal('score')}
              className="px-3 py-1.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-base hover:bg-emerald-600/30 transition-colors">
              활동점수 지급
            </button>
            <button onClick={() => openModal('points')}
              className="px-3 py-1.5 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-base hover:bg-yellow-600/30 transition-colors">
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
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">No.</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">닉네임</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">이메일</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">등록일시</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">마지막 접속</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">소속 기업</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">상태</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3">회원 정보</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-text-primary py-12">데이터가 없습니다</td></tr>
                  ) : data.map((m, i) => (
                    <tr key={m._id} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="text-text-primary px-4 py-3 border-r border-line/20">{(page - 1) * limit + i + 1}</td>
                      <td className="text-text-primary px-4 py-3 font-medium border-r border-line/20">{m.nickname || m.username}</td>
                      <td className="text-text-primary px-4 py-3 border-r border-line/20">{m.email}</td>
                      <td className="text-text-primary px-4 py-3 text-sm border-r border-line/20">{new Date(m.createdAt).toLocaleString('ko-KR')}</td>
                      <td className="text-text-primary px-4 py-3 text-sm border-r border-line/20">{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('ko-KR') : '-'}</td>
                      <td className="text-text-primary px-4 py-3 text-sm border-r border-line/20">{m.companyName || '-'}</td>
                      <td className={`px-4 py-3 font-medium text-sm border-r border-line/20 ${statusColor(m)}`}>{statusLabel(m)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users-enhanced/${m._id}`}
                          className="px-3 py-1 rounded-md text-base font-medium bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white transition-colors whitespace-nowrap">
                          보기
                        </Link>
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
              className="px-3 py-1.5 text-base rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40 transition-colors">
              이전
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-base rounded-lg transition-colors ${page === p ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'}`}>
                  {p}
                </button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-base rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40 transition-colors">
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
                className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-base transition-colors">
                취소
              </button>
              <button onClick={submitModal} disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
