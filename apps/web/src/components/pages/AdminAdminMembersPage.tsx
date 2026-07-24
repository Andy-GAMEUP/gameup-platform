'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, Shield, ShieldOff, X } from 'lucide-react'

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

interface BulkModalState {
  open: boolean
  type: 'notify' | null
}

const LEVEL_LABELS: Record<string, { label: string; cls: string }> = {
  super:   { label: 'Super',   cls: 'bg-accent-light text-accent-text border-accent-muted' },
  normal:  { label: 'Normal',  cls: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
  monitor: { label: 'Monitor', cls: 'bg-bg-muted/30 text-text-secondary border-line/30' },
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
        <div>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-accent-text" />
            <h2 className="text-text-primary text-xl font-bold">관리자</h2>
          </div>
          <p className="text-text-muted text-sm mt-1">플랫폼 관리자 계정을 조회하고 권한을 관리합니다</p>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-bg-tertiary/50 border border-line rounded-xl px-4 py-3">
            <span className="text-text-secondary text-sm font-medium">{selected.size}명 선택됨</span>
            <button onClick={() => openModal('notify')}
              className="px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-base hover:bg-blue-600/30 transition-colors">
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
                    <th className="text-left text-text-secondary font-medium px-4 py-3 border-r border-line/20">회원 정보</th>
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
                          보기
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setRevokeModal({ open: true, member: m })}
                          className="px-2 py-1 bg-accent-light hover:bg-accent-light/80 text-accent-text text-base rounded transition-colors border border-accent-muted"
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
                className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-base transition-colors">
                취소
              </button>
              <button onClick={submitModal} disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                발송
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeModal.open && revokeModal.member && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-bold text-base">관리자 권한 해제</h3>
              <button onClick={() => setRevokeModal({ open: false, member: null })}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 transition-all shadow-sm">
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
            <div className="mx-6 mt-5 px-4 py-3.5 bg-gray-50 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {revokeModal.member.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-gray-900 font-semibold text-sm truncate">{revokeModal.member.username}</p>
                <p className="text-gray-400 text-xs truncate">{revokeModal.member.email}</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <button onClick={handleRevoke} disabled={revokeLoading}
                className="group w-full px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 shadow-sm hover:shadow transition-all flex items-center gap-3 disabled:opacity-50">
                <div className="w-8 h-8 rounded-lg bg-rose-100 group-hover:bg-rose-200 flex items-center justify-center flex-shrink-0 transition-all">
                  {revokeLoading ? <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> : <ShieldOff className="w-4 h-4 text-rose-600" />}
                </div>
                <div className="text-left">
                  <p className="text-rose-700 font-semibold text-sm">권한 해제</p>
                  <p className="text-rose-400 text-xs">관리자 → 원래 역할로 변경</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
