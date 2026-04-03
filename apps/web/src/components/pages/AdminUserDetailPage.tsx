'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, ArrowLeft, Save, Pencil, X, FileText } from 'lucide-react'

interface RecentPost {
  _id: string
  title: string
  channel: string
  views: number
  commentCount: number
  createdAt: string
}

interface UserDetail {
  _id: string
  type: 'individual' | 'corporate'
  name: string
  email: string
  nickname: string
  profileImage?: string
  isPartner: boolean
  status: string
  role?: string
  bio?: string
  points: number
  activityScore: number
  level: number
  joinDate: string
  lastLoginAt?: string
  recentPost?: string
  recentPosts?: RecentPost[]
  adminMemo?: string
  company?: {
    name: string
    ceo: string
    businessNo: string
    address: string
    phone: string
    website: string
  }
  contact?: {
    name: string
    phone: string
    department: string
    position: string
  }
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

const CHANNEL_LABELS: Record<string, string> = {
  notice: '공지사항',
  general: '자유게시판',
  dev: '개발자',
  daily: '일상',
  'game-talk': '게임토크',
  'info-share': '정보공유',
  'new-game': '신작소개',
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

  const fetchDetail = () => {
    adminService.getUserDetail(id)
      .then(res => {
        const raw = res?.data ?? res
        const user = raw?.user ?? raw
        const d = { ...user, recentPosts: raw?.recentPosts ?? [] } as UserDetail
        setDetail(d)
        setForm({ ...d })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDetail() }, [id])

  const setField = (key: keyof UserDetail, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const setCompanyField = (key: keyof NonNullable<UserDetail['company']>, value: string) =>
    setForm(prev => ({ ...prev, company: { ...((prev.company ?? {}) as NonNullable<UserDetail['company']>), [key]: value } }))

  const setContactField = (key: keyof NonNullable<UserDetail['contact']>, value: string) =>
    setForm(prev => ({ ...prev, contact: { ...((prev.contact ?? {}) as NonNullable<UserDetail['contact']>), [key]: value } }))

  const handlePartnerToggle = (checked: boolean) => {
    setForm(prev => {
      const next = { ...prev, isPartner: checked }
      // 파트너 체크 시 자동으로 기업회원으로 전환
      if (checked && prev.type === 'individual') {
        next.type = 'corporate'
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminService.updateUserDetail(id, form as Record<string, unknown>)
      // Refresh detail to sync
      const res = await adminService.getUserDetail(id)
      const d = (res?.data ?? res) as UserDetail
      setDetail(d)
      setForm({ ...d })
      alert('저장되었습니다.')
    } catch {
      alert('저장 중 오류가 발생했습니다.')
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
    if (!editReason.trim()) { alert('사유를 입력하세요.'); return }
    setEditSubmitting(true)
    try {
      if (scoreModal.type === 'score') {
        await adminService.grantActivityScore(id, { amount: editAmount, reason: editReason })
      } else {
        await adminService.grantPoints(id, { amount: editAmount, reason: editReason })
      }
      setScoreModal({ open: false, type: 'score' })
      // Refresh detail
      setLoading(true)
      fetchDetail()
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setEditSubmitting(false)
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

  const typeChanged = form.type !== detail.type

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-text-primary text-xl font-bold">게임유저상세정보</h2>
          <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full border ${
            (form.type ?? detail.type) === 'corporate'
              ? 'bg-orange-600/20 text-orange-300 border-orange-500/30'
              : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
          }`}>
            {(form.type ?? detail.type) === 'corporate' ? '기업회원' : '개인회원'}
          </span>
        </div>

        {typeChanged && (
          <div className="bg-amber-900/30 border border-amber-600/40 rounded-xl px-4 py-3 text-amber-300 text-sm">
            파트너 설정으로 인해 회원 유형이 <span className="font-bold">기업회원</span>으로 전환됩니다. 저장 시 반영됩니다.
          </div>
        )}

        <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-5">
          <h3 className="text-text-primary font-semibold border-b border-line pb-3">계정 정보</h3>
          <Field label="이름">
            <Input value={form.name ?? ''} onChange={v => setField('name', v)} />
          </Field>
          <Field label="이메일">
            <Input value={form.email ?? ''} onChange={v => setField('email', v)} disabled />
          </Field>
          <Field label="닉네임">
            <Input value={form.nickname ?? ''} onChange={v => setField('nickname', v)} />
          </Field>
          <Field label="프로필 이미지">
            <Input value={form.profileImage ?? ''} onChange={v => setField('profileImage', v)} />
          </Field>
          <Field label="파트너 여부">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPartner ?? false}
                onChange={e => handlePartnerToggle(e.target.checked)}
                className="accent-red-500 w-4 h-4"
              />
              <span className="text-text-primary text-sm">파트너</span>
              {form.isPartner && detail.type === 'individual' && (
                <span className="text-amber-400 text-xs ml-2">* 기업회원으로 자동 전환됩니다</span>
              )}
            </label>
          </Field>
          <Field label="회원 상태">
            <select
              value={form.status ?? ''}
              onChange={e => setField('status', e.target.value)}
              className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="정상">정상</option>
              <option value="정지">정지</option>
              <option value="탈퇴">탈퇴</option>
            </select>
          </Field>
        </div>

        {(form.type ?? detail.type) === 'individual' && (
          <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-5">
            <h3 className="text-text-primary font-semibold border-b border-line pb-3">자기소개</h3>
            <textarea
              value={form.bio ?? ''}
              onChange={e => setField('bio', e.target.value)}
              rows={4}
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
            />
          </div>
        )}

        {(form.type ?? detail.type) === 'corporate' && (
          <>
            <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-5">
              <h3 className="text-text-primary font-semibold border-b border-line pb-3">담당자 정보</h3>
              <Field label="담당자 이름">
                <Input value={form.contact?.name ?? ''} onChange={v => setContactField('name', v)} />
              </Field>
              <Field label="담당자 전화">
                <Input value={form.contact?.phone ?? ''} onChange={v => setContactField('phone', v)} />
              </Field>
              <Field label="부서">
                <Input value={form.contact?.department ?? ''} onChange={v => setContactField('department', v)} />
              </Field>
              <Field label="직책">
                <Input value={form.contact?.position ?? ''} onChange={v => setContactField('position', v)} />
              </Field>
            </div>
            <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-5">
              <h3 className="text-text-primary font-semibold border-b border-line pb-3">회사 정보</h3>
              <Field label="회사명">
                <Input value={form.company?.name ?? ''} onChange={v => setCompanyField('name', v)} />
              </Field>
              <Field label="대표자">
                <Input value={form.company?.ceo ?? ''} onChange={v => setCompanyField('ceo', v)} />
              </Field>
              <Field label="사업자번호">
                <Input value={form.company?.businessNo ?? ''} onChange={v => setCompanyField('businessNo', v)} />
              </Field>
              <Field label="주소">
                <Input value={form.company?.address ?? ''} onChange={v => setCompanyField('address', v)} />
              </Field>
              <Field label="전화번호">
                <Input value={form.company?.phone ?? ''} onChange={v => setCompanyField('phone', v)} />
              </Field>
              <Field label="웹사이트">
                <Input value={form.company?.website ?? ''} onChange={v => setCompanyField('website', v)} />
              </Field>
            </div>
          </>
        )}

        <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-5">
          <h3 className="text-text-primary font-semibold border-b border-line pb-3">이용/활동 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-tertiary/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-text-secondary text-xs">활동점수</p>
                <button onClick={() => openScoreModal('score')}
                  className="text-text-secondary hover:text-emerald-400 transition-colors" title="활동점수 편집">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-emerald-400 text-xl font-bold">{(detail.activityScore ?? 0).toLocaleString()}</p>
              <p className="text-text-muted text-xs mt-1">Lv.{detail.level ?? 1}</p>
            </div>
            <div className="bg-bg-tertiary/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-text-secondary text-xs">포인트</p>
                <button onClick={() => openScoreModal('points')}
                  className="text-text-secondary hover:text-yellow-400 transition-colors" title="포인트 편집">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-yellow-400 text-xl font-bold">{(detail.points ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-bg-tertiary/50 rounded-xl p-4">
              <p className="text-text-secondary text-xs mb-1">가입일</p>
              <p className="text-text-primary text-sm">{detail.joinDate ? new Date(detail.joinDate).toLocaleDateString('ko-KR') : '-'}</p>
            </div>
            <div className="bg-bg-tertiary/50 rounded-xl p-4">
              <p className="text-text-secondary text-xs mb-1">최근 로그인</p>
              <p className="text-text-primary text-sm">{detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString('ko-KR') : '-'}</p>
            </div>
          </div>
        </div>

        {/* 최근 게시물 */}
        <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <FileText className="w-4 h-4 text-text-secondary" />
            <h3 className="text-text-primary font-semibold">최근 게시물</h3>
          </div>
          {detail.recentPosts && detail.recentPosts.length > 0 ? (
            <div className="space-y-2">
              {detail.recentPosts.map(post => (
                <Link key={post._id} href={`/community/${post._id}`} target="_blank"
                  className="flex items-center gap-3 bg-bg-tertiary/50 hover:bg-bg-tertiary rounded-lg px-4 py-3 transition-colors group">
                  <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary flex-shrink-0">
                    {CHANNEL_LABELS[post.channel] || post.channel}
                  </span>
                  <span className="text-text-primary text-sm truncate flex-1 group-hover:text-accent-text transition-colors">
                    {post.title}
                  </span>
                  <span className="text-text-muted text-xs flex-shrink-0">
                    조회 {post.views} · 댓글 {post.commentCount}
                  </span>
                  <span className="text-text-muted text-xs flex-shrink-0">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-4">작성한 게시물이 없습니다</p>
          )}
        </div>

        <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-3">
          <h3 className="text-text-primary font-semibold border-b border-line pb-3">관리자 메모</h3>
          <textarea
            value={form.adminMemo ?? ''}
            onChange={e => setField('adminMemo', e.target.value)}
            rows={4}
            placeholder="관리자 메모를 입력하세요 (외부에 공개되지 않습니다)"
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.back()}
            className="px-5 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      {/* Activity Score / Points Edit Modal */}
      {scoreModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary font-bold">
                {scoreModal.type === 'score' ? '활동점수 편집' : '포인트 편집'}
              </h3>
              <button onClick={() => setScoreModal({ open: false, type: 'score' })} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-text-secondary text-sm">
              현재 {scoreModal.type === 'score' ? '활동점수' : '포인트'}:{' '}
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
                className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm transition-colors">
                취소
              </button>
              <button onClick={submitScoreEdit} disabled={editSubmitting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
