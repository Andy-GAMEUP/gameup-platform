'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import ConfirmModal from '@/components/ConfirmModal'
import AlertModal from '@/components/AlertModal'
import adminService from '@/services/adminService'
import { Loader2, ArrowLeft, Save, Pencil, X, FileText, Ban, KeyRound, Copy } from 'lucide-react'
import { formatDate } from '@/lib/formatDate'

interface RecentPost {
  _id: string
  title: string
  channel: string
  views: number
  commentCount: number
  createdAt: string
}

interface CompanyInfo {
  companyName?: string
  companyCategory?: 'developer' | 'partner'
  companyType?: string[]
  businessNumber?: string
  businessType?: 'individual' | 'corporation'
  homepageUrl?: string
  approvalStatus?: 'pending' | 'approved' | 'rejected'
}

interface ContactPerson {
  name?: string
  phone?: string
  email?: string
}

interface UserDetail {
  _id: string
  username: string
  email: string
  role: 'developer' | 'player' | 'admin'
  memberType?: 'individual' | 'corporate'
  isActive: boolean
  profileImage?: string
  bio?: string
  favoriteGenres?: string[]
  points: number
  activityScore: number
  level: number
  createdAt: string
  lastLoginAt?: string
  adminMemo?: string
  companyInfo?: CompanyInfo
  contactPerson?: ContactPerson
  adminLevel?: 'super' | 'normal' | 'monitor'
  adminGrantedAt?: string
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-4 gap-4 items-start">
      <label className="text-text-secondary text-sm pt-2 col-span-1">{label}</label>
      <div className="col-span-3">{children}</div>
    </div>
  )
}

function Input({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent disabled:opacity-60"
    />
  )
}

const COMPANY_TYPE_LABELS: Record<string, string> = {
  publisher: '퍼블리셔',
  game_solution: '게임솔루션',
  game_service: '게임서비스',
  operations: '운영',
  qa: 'QA',
  marketing: '마케팅',
  development: '개발',
  original_art: '원화',
  other: '기타',
}

const LEVEL_LABELS: Record<string, { label: string; cls: string }> = {
  super:   { label: 'Super',   cls: 'bg-accent-light text-accent-text border-accent-muted' },
  normal:  { label: 'Normal',  cls: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
  monitor: { label: 'Monitor', cls: 'bg-bg-muted/30 text-text-secondary border-line/30' },
}

export default function AdminUserDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [form, setForm] = useState<Partial<UserDetail>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Activity score / points edit modal
  const [scoreModal, setScoreModal] = useState<{ open: boolean; type: 'score' | 'points' }>({ open: false, type: 'score' })
  const [editAmount, setEditAmount] = useState(0)
  const [editReason, setEditReason] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  const memoTextareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = memoTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [form.adminMemo])

  // 계정 중지
  const [banConfirm, setBanConfirm] = useState(false)
  const [banSubmitting, setBanSubmitting] = useState(false)

  // 비밀번호 초기화
  const [resetPwConfirm, setResetPwConfirm] = useState(false)
  const [resetPwSubmitting, setResetPwSubmitting] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  // 커뮤니티 게시글 페이지네이션
  const [posts, setPosts] = useState<RecentPost[]>([])
  const [postsTotal, setPostsTotal] = useState(0)
  const [postsPage, setPostsPage] = useState(1)
  const [postsTotalPages, setPostsTotalPages] = useState(1)

  const fetchPosts = (page: number) => {
    adminService.getUserPosts(id, { page, limit: 10 })
      .then(res => {
        const raw = res?.data ?? res
        setPosts(raw?.posts ?? [])
        setPostsTotal(raw?.total ?? 0)
        setPostsPage(raw?.page ?? 1)
        setPostsTotalPages(raw?.totalPages ?? 1)
      })
      .catch(console.error)
  }

  const fetchDetail = () => {
    adminService.getUserDetail(id)
      .then(res => {
        const raw = res?.data ?? res
        const user = raw?.user ?? raw
        const d = { ...user } as UserDetail
        setDetail(d)
        setForm({ ...d })
        setPosts(raw?.recentPosts ?? [])
        setPostsTotal(raw?.postsTotal ?? 0)
        setPostsPage(1)
        setPostsTotalPages(Math.ceil((raw?.postsTotal ?? 0) / 10) || 1)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDetail() }, [id])

  const setField = (key: keyof UserDetail, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSaveMemo = async () => {
    setSaving(true)
    try {
      await adminService.updateUserDetail(id, { adminMemo: form.adminMemo })
      fetchDetail()
      setAlertMessage('저장되었습니다.')
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const openScoreModal = (type: 'score' | 'points') => {
    setScoreModal({ open: true, type })
    setEditAmount(0)
    setEditReason('')
  }

  const submitScoreEdit = async () => {
    if (!editReason.trim()) { setAlertMessage('사유를 입력하세요.'); return }
    setEditSubmitting(true)
    try {
      if (scoreModal.type === 'score') {
        await adminService.grantActivityScore(id, { amount: editAmount, reason: editReason })
      } else {
        await adminService.grantPoints(id, { amount: editAmount, reason: editReason })
      }
      setScoreModal({ open: false, type: 'score' })
      setLoading(true)
      fetchDetail()
    } catch {
      setAlertMessage('처리 중 오류가 발생했습니다.')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleToggleBan = async () => {
    if (!detail) return
    setBanSubmitting(true)
    try {
      await adminService.banUser(id, {
        isActive: detail.isActive === false,
        ...(detail.isActive !== false && { banReason: '관리자에 의한 정지' }),
      })
      setBanConfirm(false)
      fetchDetail()
    } catch {
      setAlertMessage('처리 중 오류가 발생했습니다.')
    } finally {
      setBanSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    setResetPwSubmitting(true)
    try {
      const res = await adminService.resetUserPassword(id)
      const raw = res?.data ?? res
      setResetPwConfirm(false)
      setTempPassword(raw?.tempPassword ?? null)
    } catch {
      setAlertMessage('비밀번호 초기화 중 오류가 발생했습니다.')
    } finally {
      setResetPwSubmitting(false)
    }
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    </AdminLayout>
  )

  if (!detail) return (
    <AdminLayout>
      <p className="text-text-secondary text-center py-12">회원 정보를 불러올 수 없습니다</p>
    </AdminLayout>
  )

  const viewType: 'admin' | 'corporate' | 'individual' =
    detail.role === 'admin' ? 'admin' : detail.memberType === 'corporate' ? 'corporate' : 'individual'
  const adminLevel = detail.adminLevel ? LEVEL_LABELS[detail.adminLevel] : null

  const TITLE_BY_TYPE: Record<typeof viewType, string> = {
    admin: '관리자 계정 상세정보',
    corporate: '기업회원 상세정보',
    individual: '게임회원 상세정보',
  }

  const accountInfoCard = (
    <div className="flex-1 bg-bg-secondary border border-line rounded-xl p-6 space-y-5">
      <h3 className="text-text-primary font-semibold border-b border-line pb-3">계정 정보</h3>
      {viewType === 'corporate' && (
        <Field label="회사명">
          <Input value={form.companyInfo?.companyName ?? ''} onChange={() => {}} disabled />
        </Field>
      )}
      <Field label={viewType === 'corporate' ? '담당자' : '아이디(사용자명)'}>
        <Input value={form.username ?? ''} onChange={() => {}} disabled />
      </Field>
      <Field label="이메일">
        <Input value={form.email ?? ''} onChange={() => {}} disabled />
      </Field>
      {viewType === 'corporate' && (
        <Field label="회사 웹사이트">
          <Input value={form.companyInfo?.homepageUrl ?? ''} onChange={() => {}} disabled />
        </Field>
      )}
      {viewType === 'corporate' && (
        <Field label="대표 연락처">
          <Input value={detail.contactPerson?.phone || '-'} onChange={() => {}} disabled />
        </Field>
      )}
      {viewType === 'corporate' && (
        <>
          <Field label="사업자 등록번호">
            <Input value={detail.companyInfo?.businessNumber || '-'} onChange={() => {}} disabled />
          </Field>
          <Field label="사업자 형태">
            <Input
              value={detail.companyInfo?.businessType === 'individual' ? '개인사업자' : detail.companyInfo?.businessType === 'corporation' ? '법인' : '-'}
              onChange={() => {}}
              disabled
            />
          </Field>
          <Field label="기업 유형">
            <Input value={detail.companyInfo?.companyCategory === 'partner' ? '파트너' : '개발사'} onChange={() => {}} disabled />
          </Field>
          <Field label="기업 형태">
            <Input
              value={detail.companyInfo?.companyType && detail.companyInfo.companyType.length > 0
                ? detail.companyInfo.companyType.map(t => COMPANY_TYPE_LABELS[t] || t).join(', ')
                : '-'}
              onChange={() => {}}
              disabled
            />
          </Field>
        </>
      )}
      {viewType === 'individual' && (
        <Field label="레벨">
          <Input value={`Lv.${detail.level ?? 1}`} onChange={() => {}} disabled />
        </Field>
      )}
      <Field label="가입일">
        <Input value={detail.createdAt ? formatDate(detail.createdAt) : '-'} onChange={() => {}} disabled />
      </Field>
      <Field label="최근 로그인">
        <Input value={detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString('ko-KR') : '-'} onChange={() => {}} disabled />
      </Field>
      {viewType === 'individual' && (
        <Field label="관심 장르">
          <Input value={detail.favoriteGenres && detail.favoriteGenres.length > 0 ? detail.favoriteGenres.join(', ') : '-'} onChange={() => {}} disabled />
        </Field>
      )}
      {viewType === 'individual' && (
        <Field label="자기소개">
          <textarea
            value={detail.bio ?? ''}
            onChange={() => {}}
            disabled
            rows={4}
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent disabled:opacity-60 resize-none"
          />
        </Field>
      )}
      {viewType === 'individual' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-tertiary/50 border border-line rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-text-secondary text-xs">활동점수</p>
              <button onClick={() => openScoreModal('score')}
                className="text-text-secondary hover:text-emerald-400 transition-colors" title="활동점수 편집">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-emerald-400 text-xl font-bold">{(detail.activityScore ?? 0).toLocaleString()}</p>
          </div>
          <div className="bg-bg-tertiary/50 border border-line rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-text-secondary text-xs">캡코인 (적용 미정)</p>
              <button onClick={() => openScoreModal('points')}
                className="text-text-secondary hover:text-yellow-400 transition-colors" title="캡코인 (적용 미정) 편집">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-yellow-400 text-xl font-bold">{(detail.points ?? 0).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-[80.15rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-text-primary text-xl font-bold">{TITLE_BY_TYPE[viewType]}</h2>
        </div>

        <div className="grid grid-cols-[1fr_31.2rem] gap-6 items-start">
        <div className="space-y-6">
        {/* 계정 정보 (기업회원은 기업 정보 포함) */}
        {accountInfoCard}

        {viewType === 'admin' && (
          <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-5">
            <h3 className="text-text-primary font-semibold border-b border-line pb-3">관리자 권한 정보</h3>
            <Field label="권한 등급">
              {adminLevel ? (
                <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${adminLevel.cls}`}>{adminLevel.label}</span>
              ) : <span className="text-text-muted text-sm">-</span>}
            </Field>
            <Field label="권한 부여일">
              <span className="text-text-primary text-sm">{detail.adminGrantedAt ? formatDate(detail.adminGrantedAt) : '-'}</span>
            </Field>
          </div>
        )}

        {/* 커뮤니티 게시글 */}
        {viewType !== 'admin' && (
          <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <FileText className="w-4 h-4 text-text-secondary" />
              <h3 className="text-text-primary font-semibold">커뮤니티 게시글</h3>
              <span className="ml-auto text-xs text-text-secondary">{postsTotal.toLocaleString()}개 등록</span>
            </div>
            {posts.length > 0 ? (
              <div className="space-y-2">
                {posts.map(post => (
                  <Link key={post._id} href={`/community/${post._id}`} target="_blank"
                    className="flex items-center gap-3 bg-bg-tertiary/50 hover:bg-bg-tertiary rounded-lg px-4 py-3 transition-colors group">
                    <span className="text-text-primary text-sm truncate flex-1 group-hover:text-accent-text transition-colors">
                      {post.title}
                    </span>
                    <span className="text-text-muted text-xs flex-shrink-0">
                      조회 {post.views} · 댓글 {post.commentCount}
                    </span>
                    <span className="text-text-muted text-xs flex-shrink-0">
                      {formatDate(post.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-sm text-center py-4">작성한 게시물이 없습니다</p>
            )}
            {postsTotalPages > 1 && (
              <div className="flex justify-center gap-1 pt-2">
                <button onClick={() => fetchPosts(Math.max(1, postsPage - 1))} disabled={postsPage === 1}
                  className="px-3 py-1.5 text-base rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">이전</button>
                {Array.from({ length: Math.min(postsTotalPages, 7) }, (_, i) => {
                  const p = Math.max(1, Math.min(postsPage - 3, postsTotalPages - 6)) + i
                  return p <= postsTotalPages ? (
                    <button key={p} onClick={() => fetchPosts(p)}
                      className={`px-3 py-1.5 text-base rounded-lg ${postsPage === p ? 'bg-slate-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'}`}>{p}</button>
                  ) : null
                })}
                <button onClick={() => fetchPosts(Math.min(postsTotalPages, postsPage + 1))} disabled={postsPage === postsTotalPages}
                  className="px-3 py-1.5 text-base rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">다음</button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-start">
          <button onClick={() => setResetPwConfirm(true)}
            className="px-[18px] py-[9px] rounded-lg text-base font-semibold bg-bg-tertiary border border-line text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            비밀번호 초기화
          </button>
          <button onClick={() => setBanConfirm(true)}
            className={`ml-auto px-[18px] py-[9px] rounded-lg text-base font-semibold text-white transition-all flex items-center gap-2 ${
              detail.isActive !== false
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
            }`}>
            <Ban className="w-4 h-4" />
            {detail.isActive !== false ? '계정 중지' : '중지 해제'}
          </button>
        </div>
        </div>

        {/* 관리자 메모 */}
        <div className="bg-bg-secondary border border-line rounded-xl pt-6 px-6 pb-[10px]">
          <h3 className="text-text-primary font-semibold border-b border-line pb-3 mb-3">관리자 메모</h3>
          <textarea
            ref={memoTextareaRef}
            value={form.adminMemo ?? ''}
            onChange={e => setField('adminMemo', e.target.value)}
            rows={4}
            placeholder="관리자 메모를 입력하세요 (외부에 공개되지 않습니다)"
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none overflow-hidden"
          />
          <div className="flex justify-end mt-[5px]">
            <button onClick={handleSaveMemo} disabled={saving}
              className="px-5 py-[7px] bg-slate-600 hover:bg-slate-500 border border-slate-500 text-white rounded-xl text-base transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              저장
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Activity Score / Points Edit Modal */}
      {scoreModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-bold">
                {scoreModal.type === 'score' ? '활동점수 편집' : '캡코인 (적용 미정) 편집'}
              </h3>
              <button onClick={() => setScoreModal({ open: false, type: 'score' })} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-text-secondary text-sm">
              현재 {scoreModal.type === 'score' ? '활동점수' : '캡코인 (적용 미정)'}:{' '}
              <span className={scoreModal.type === 'score' ? 'text-emerald-400' : 'text-yellow-400'}>
                {(scoreModal.type === 'score' ? detail.activityScore : detail.points ?? 0).toLocaleString()}
              </span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-text-secondary text-xs mb-1">
                  변경량 (양수: 추가, 음수: 차감)
                </label>
                <input type="number" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">사유 (필수)</label>
                <input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="변경 사유를 입력하세요"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setScoreModal({ open: false, type: 'score' })}
                className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-base transition-colors">
                취소
              </button>
              <button onClick={submitScoreEdit} disabled={editSubmitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={banConfirm}
        title={detail.isActive !== false ? '계정 중지' : '중지 해제'}
        message={`${detail.username}${detail.isActive !== false ? '님을 정지하시겠습니까?' : '님의 정지를 해제하시겠습니까?'}`}
        confirmLabel={detail.isActive !== false ? '정지' : '해제'}
        danger={detail.isActive !== false}
        onConfirm={handleToggleBan}
        onCancel={() => setBanConfirm(false)}
      />

      <ConfirmModal
        isOpen={resetPwConfirm}
        title="비밀번호 초기화"
        message={`${detail.username}님의 비밀번호를 초기화하고 임시 비밀번호를 발급합니다.\n무조건 회원님의 요청이 있을 경우에만 초기화!`}
        confirmLabel="초기화"
        danger
        onConfirm={handleResetPassword}
        onCancel={() => setResetPwConfirm(false)}
      />

      {tempPassword && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={() => setTempPassword(null)}>
          <div className="w-full max-w-sm bg-bg-card border border-line rounded-xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-text-primary font-semibold mb-1.5">임시 비밀번호 발급됨</h3>
            <p className="text-text-secondary text-sm mb-3">
              이 비밀번호는 다시 확인할 수 없습니다. 지금 복사해서 회원님에게 직접(카카오톡/전화 등) 전달하세요.
            </p>
            <div className="flex items-center gap-2 bg-bg-tertiary border border-line rounded-lg px-3 py-2 mb-5">
              <span className="flex-1 font-mono text-text-primary text-sm select-all">{tempPassword}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(tempPassword); setAlertMessage('복사되었습니다.') }}
                className="text-text-secondary hover:text-text-primary transition-colors" title="복사">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setTempPassword(null)}
                className="px-4 py-2 rounded-lg text-base font-medium bg-bg-tertiary hover:bg-bg-hover text-text-primary transition-colors">
                취소
              </button>
              <button onClick={() => setTempPassword(null)}
                className="px-4 py-2 rounded-lg text-base font-medium bg-red-600 hover:bg-red-500 text-white transition-colors">
                초기화 완료
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={!!alertMessage}
        message={alertMessage || ''}
        onConfirm={() => setAlertMessage(null)}
      />
    </AdminLayout>
  )
}
