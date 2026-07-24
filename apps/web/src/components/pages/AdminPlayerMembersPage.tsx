'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import ConfirmModal from '@/components/ConfirmModal'
import adminService from '@/services/adminService'
import partnerService from '@/services/partnerService'
import { Ban, Building2, ChevronLeft, Loader2, Search, Shield, UserCircle, X } from 'lucide-react'

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

function ManageModal({
  member, onClose, onSuspend, onGrantAdmin, onAffiliate, onUnaffiliate, loading,
}: {
  member: IndividualMember
  onClose: () => void
  onSuspend: () => void
  onGrantAdmin: () => void
  onAffiliate: (partnerId: string) => void
  onUnaffiliate: () => void
  loading: boolean
}) {
  const [view, setView] = useState<'main' | 'affiliate'>('main')
  const [partners, setPartners] = useState<{ _id: string; companyName: string }[]>([])
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState('')

  useEffect(() => {
    if (view === 'affiliate' && partners.length === 0) {
      setPartnersLoading(true)
      partnerService.admin.getApprovedPartners()
        .then(res => {
          setPartners((res.partners || []).map((p: any) => ({
            _id: p._id,
            companyName: (p.userId as any)?.companyInfo?.companyName || p.companyName || '알 수 없음',
          })))
        })
        .catch(() => {})
        .finally(() => setPartnersLoading(false))
    }
  }, [view, partners.length])

  if (view === 'affiliate') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
            <button onClick={() => setView('main')}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-teal-600" />
              </div>
              <h3 className="text-gray-900 font-bold text-base">기업 소속 설정</h3>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-gray-500 text-sm">
              <span className="text-gray-800 font-semibold">{member.nickname || member.username}</span>을 소속시킬 기업을 선택하세요
            </p>

            {partnersLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <select
                value={selectedPartner}
                onChange={e => setSelectedPartner(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all cursor-pointer"
              >
                <option value="">기업 선택</option>
                {partners.map(p => (
                  <option key={p._id} value={p._id}>{p.companyName}</option>
                ))}
              </select>
            )}

            <div className="flex gap-2.5 pt-1">
              <button onClick={() => setView('main')}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-xl text-base font-medium transition-all">
                취소
              </button>
              <button
                onClick={() => onAffiliate(selectedPartner)}
                disabled={!selectedPartner || loading}
                className="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-200 text-white disabled:text-teal-400 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                소속 확정
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-gray-900 font-bold text-base">회원 관리</h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 transition-all shadow-sm">
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* 유저 정보 카드 */}
        <div className="mx-6 mt-5 px-4 py-3.5 bg-gray-50 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(member.nickname || member.username).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-gray-900 font-semibold text-sm truncate">{member.nickname || member.username}</p>
            <p className="text-gray-400 text-xs truncate">{member.email}</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-2.5">

          {/* 관리자 권한 부여 */}
          {/* 기업 소속 */}
          {member.companyName ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Building2 className="w-3.5 h-3.5 text-teal-500" />
                <p className="text-gray-400 text-xs">현재 소속</p>
                <span className="ml-auto text-teal-600 text-xs font-bold">{member.companyName}</span>
              </div>
              <button onClick={onUnaffiliate} disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow transition-all flex items-center gap-3 disabled:opacity-50">
                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <Building2 className="w-4 h-4 text-gray-500" />}
                </div>
                <div className="text-left">
                  <p className="text-gray-700 font-semibold text-sm">기업에서 제외</p>
                  <p className="text-gray-400 text-xs">소속 해제 처리</p>
                </div>
              </button>
            </div>
          ) : (
            <button onClick={() => setView('affiliate')} disabled={loading}
              className="group w-full px-4 py-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 hover:border-teal-300 shadow-sm hover:shadow transition-all flex items-center gap-3 disabled:opacity-50">
              <div className="w-8 h-8 rounded-lg bg-teal-100 group-hover:bg-teal-200 flex items-center justify-center flex-shrink-0 transition-all">
                <Building2 className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-left">
                <p className="text-teal-700 font-semibold text-sm">기업 소속 시키기</p>
                <p className="text-teal-400 text-xs">파트너 채널 팀원으로 추가</p>
              </div>
            </button>
          )}

          {/* 구분선 */}
          <div className="border-t border-gray-100 my-1" />

          <button onClick={onGrantAdmin} disabled={loading}
            className="group w-full px-4 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 hover:border-violet-300 shadow-sm hover:shadow transition-all flex items-center gap-3 disabled:opacity-50">
            <div className="w-8 h-8 rounded-lg bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center flex-shrink-0 transition-all">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-violet-600" /> : <Shield className="w-4 h-4 text-violet-600" />}
            </div>
            <div className="text-left">
              <p className="text-violet-700 font-semibold text-sm">관리자 권한 부여</p>
              <p className="text-violet-400 text-xs">게임회원 → 관리자로 전환</p>
            </div>
          </button>

          {/* 구분선 */}
          <div className="border-t border-gray-100 my-1" />

          {/* 계정 중지 */}
          <button onClick={onSuspend} disabled={loading}
            className="group w-full px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 shadow-sm hover:shadow transition-all flex items-center gap-3 disabled:opacity-50">
            <div className="w-8 h-8 rounded-lg bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center flex-shrink-0 transition-all">
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-amber-600" /> : <Ban className="w-4 h-4 text-amber-600" />}
            </div>
            <div className="text-left">
              <p className="text-amber-700 font-semibold text-sm">{member.isActive !== false ? '계정 중지' : '중지 해제'}</p>
              <p className="text-amber-400 text-xs">{member.isActive !== false ? '플랫폼 접근 차단' : '계정 접근 복원'}</p>
            </div>
          </button>

        </div>

      </div>
    </div>
  )
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

  const [manageModal, setManageModal] = useState<IndividualMember | null>(null)
  const [grantAdminConfirm, setGrantAdminConfirm] = useState(false)

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

  const handleSuspend = async () => {
    if (!manageModal) return
    setSubmitting(true)
    try {
      await adminService.banUser(manageModal._id, {
        isActive: manageModal.isActive === false,
        ...(manageModal.isActive !== false && { banReason: '관리자에 의한 정지' }),
      })
      setManageModal(null)
      fetchData()
    } catch {
      alert('처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGrantAdmin = async () => {
    if (!manageModal) return
    setSubmitting(true)
    try {
      await adminService.updateUserRole(manageModal._id, 'admin')
      setManageModal(null)
      fetchData()
    } catch {
      alert('처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAffiliate = async (partnerId: string) => {
    if (!manageModal || !partnerId) return
    setSubmitting(true)
    try {
      await partnerService.admin.addTeamMember(partnerId, manageModal._id)
      setManageModal(null)
      fetchData()
    } catch {
      alert('소속 처리 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnaffiliate = async () => {
    if (!manageModal) return
    setSubmitting(true)
    try {
      await partnerService.admin.removeTeamMemberByUser(manageModal._id)
      setManageModal(null)
      fetchData()
    } catch {
      alert('소속 해제 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / limit) || 1
  const statusColor = (m: IndividualMember) => {
    if (m.isActive === false) return 'text-accent-text'
    return 'text-text-primary'
  }
  const statusLabel = (m: IndividualMember) => m.isActive === false ? '정지' : '회원'

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

        <div className="bg-bg-secondary border border-line rounded-xl p-4 w-[35%]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="닉네임 / 이메일 / 회원번호 검색"
              className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            />
          </div>
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
                    <th className="text-right text-text-primary font-medium px-4 py-3 border-r border-line/20">레벨</th>
                    <th className="text-right text-text-primary font-medium px-4 py-3 border-r border-line/20">활동점수</th>
                    <th className="text-right text-text-primary font-medium px-4 py-3 border-r border-line/20">포인트</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">등록일시</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">마지막 접속</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">기업 소속</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">회원 정보</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3 border-r border-line/20">상태</th>
                    <th className="text-left text-text-primary font-medium px-4 py-3">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.length === 0 ? (
                    <tr><td colSpan={12} className="text-center text-text-primary py-12">데이터가 없습니다</td></tr>
                  ) : data.map((m, i) => (
                    <tr key={m._id} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="text-text-primary px-4 py-3 border-r border-line/20">{(page - 1) * limit + i + 1}</td>
                      <td className="text-text-primary px-4 py-3 font-medium border-r border-line/20">{m.nickname || m.username}</td>
                      <td className="text-text-primary px-4 py-3 border-r border-line/20">{m.email}</td>
                      <td className="text-right text-text-primary px-4 py-3 font-medium border-r border-line/20">Lv.{m.level}</td>
                      <td className="text-right text-text-primary px-4 py-3 border-r border-line/20">{(m.activityScore ?? 0).toLocaleString()}</td>
                      <td className="text-right text-text-primary px-4 py-3 border-r border-line/20">{(m.points ?? 0).toLocaleString()}</td>
                      <td className="text-text-primary px-4 py-3 text-sm border-r border-line/20">{new Date(m.createdAt).toLocaleString('ko-KR')}</td>
                      <td className="text-text-primary px-4 py-3 text-sm border-r border-line/20">{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('ko-KR') : '-'}</td>
                      <td className="text-text-primary px-4 py-3 text-sm border-r border-line/20">{m.companyName || ''}</td>
                      <td className="px-4 py-3 border-r border-line/20">
                        <Link href={`/admin/users-enhanced/${m._id}`}
                          className="px-2 py-1 bg-bg-tertiary hover:bg-bg-hover text-text-primary text-sm rounded transition-colors">
                          보기
                        </Link>
                      </td>
                      <td className={`px-4 py-3 font-medium text-sm border-r border-line/20 ${statusColor(m)}`}>{statusLabel(m)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setManageModal(m)}
                          className="px-3 py-1 rounded-md text-base font-medium bg-slate-600 hover:bg-slate-500 border border-slate-500 text-white transition-colors whitespace-nowrap">
                          관리
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

      {manageModal && (
        <ManageModal
          member={manageModal}
          onClose={() => setManageModal(null)}
          onSuspend={handleSuspend}
          onGrantAdmin={() => setGrantAdminConfirm(true)}
          onAffiliate={handleAffiliate}
          onUnaffiliate={handleUnaffiliate}
          loading={submitting}
        />
      )}

      <ConfirmModal
        isOpen={grantAdminConfirm}
        title="관리자 권한 부여"
        message={`${manageModal?.nickname || manageModal?.username}에게 관리자 권한을 부여하시겠습니까?`}
        confirmLabel="권한 부여"
        onConfirm={() => {
          setGrantAdminConfirm(false)
          handleGrantAdmin()
        }}
        onCancel={() => setGrantAdminConfirm(false)}
      />
    </AdminLayout>
  )
}
