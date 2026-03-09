'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, ArrowLeft, Save } from 'lucide-react'

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
  joinDate: string
  lastLoginAt?: string
  recentPost?: string
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
      <label className="text-slate-400 text-sm pt-2 col-span-1">{label}</label>
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
      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 disabled:opacity-60"
    />
  )
}

export default function AdminUserDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [form, setForm] = useState<Partial<UserDetail>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminService.getUserDetail(id)
      .then(res => {
        const d = (res?.data ?? res) as UserDetail
        setDetail(d)
        setForm({ ...d })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const setField = (key: keyof UserDetail, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const setCompanyField = (key: keyof NonNullable<UserDetail['company']>, value: string) =>
    setForm(prev => ({ ...prev, company: { ...((prev.company ?? {}) as NonNullable<UserDetail['company']>), [key]: value } }))

  const setContactField = (key: keyof NonNullable<UserDetail['contact']>, value: string) =>
    setForm(prev => ({ ...prev, contact: { ...((prev.contact ?? {}) as NonNullable<UserDetail['contact']>), [key]: value } }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminService.updateUserDetail(id, form as Record<string, unknown>)
      alert('저장되었습니다.')
    } catch {
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    </AdminLayout>
  )

  if (!detail) return (
    <AdminLayout>
      <p className="text-slate-400 text-center py-12">회원 정보를 불러올 수 없습니다</p>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-white text-xl font-bold">회원 상세 정보</h2>
          <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full border ${
            detail.type === 'corporate'
              ? 'bg-orange-600/20 text-orange-300 border-orange-500/30'
              : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
          }`}>
            {detail.type === 'corporate' ? '기업회원' : '개인회원'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-white font-semibold border-b border-slate-800 pb-3">계정 정보</h3>
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
                onChange={e => setField('isPartner', e.target.checked)}
                className="accent-red-500 w-4 h-4"
              />
              <span className="text-white text-sm">파트너</span>
            </label>
          </Field>
          <Field label="회원 상태">
            <select
              value={form.status ?? ''}
              onChange={e => setField('status', e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
            >
              <option value="정상">정상</option>
              <option value="정지">정지</option>
              <option value="탈퇴">탈퇴</option>
            </select>
          </Field>
        </div>

        {detail.type === 'individual' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <h3 className="text-white font-semibold border-b border-slate-800 pb-3">자기소개</h3>
            <textarea
              value={form.bio ?? ''}
              onChange={e => setField('bio', e.target.value)}
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
            />
          </div>
        )}

        {detail.type === 'corporate' && (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              <h3 className="text-white font-semibold border-b border-slate-800 pb-3">담당자 정보</h3>
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              <h3 className="text-white font-semibold border-b border-slate-800 pb-3">회사 정보</h3>
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

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-white font-semibold border-b border-slate-800 pb-3">이용/활동 정보</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">포인트</p>
              <p className="text-yellow-400 text-xl font-bold">{(detail.points ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">가입일</p>
              <p className="text-white text-sm">{detail.joinDate ? new Date(detail.joinDate).toLocaleDateString('ko-KR') : '-'}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">최근 로그인</p>
              <p className="text-white text-sm">{detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString('ko-KR') : '-'}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">최근 게시물</p>
              <p className="text-white text-sm truncate">{detail.recentPost ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="text-white font-semibold border-b border-slate-800 pb-3">관리자 메모</h3>
          <textarea
            value={form.adminMemo ?? ''}
            onChange={e => setField('adminMemo', e.target.value)}
            rows={4}
            placeholder="관리자 메모를 입력하세요 (외부에 공개되지 않습니다)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.back()}
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
