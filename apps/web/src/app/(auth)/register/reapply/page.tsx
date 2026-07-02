'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gamepad2, Building2, Phone, Code2, Handshake, Loader2, AlertCircle, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import { authService } from '@/services/authService'

type CompanyCategory = 'developer' | 'partner'
type CompanyType = 'publisher' | 'game_solution' | 'game_service' | 'operations' | 'qa' | 'marketing' | 'development' | 'original_art' | 'other'

const COMPANY_TYPE_OPTIONS: { value: CompanyType; label: string }[] = [
  { value: 'publisher',     label: '퍼블리셔' },
  { value: 'game_solution', label: '게임솔루션' },
  { value: 'game_service',  label: '게임서비스' },
  { value: 'operations',    label: '운영' },
  { value: 'qa',            label: 'QA' },
  { value: 'marketing',     label: '마케팅' },
  { value: 'development',   label: '개발' },
  { value: 'original_art',  label: '원화' },
  { value: 'other',         label: '기타' },
]

export default function ReapplyPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [companyCategory, setCompanyCategory] = useState<CompanyCategory>('developer')
  const [companyName, setCompanyName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [companyType, setCompanyType] = useState<CompanyType[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  // 기존 정보로 초기화 (userId 기준으로 한 번만 실행)
  const userId = (user as any)?._id
  useEffect(() => {
    if (!user) return
    const info = (user as any)?.companyInfo
    if (info?.companyName) setCompanyName(info.companyName)
    if (info?.companyCategory) setCompanyCategory(info.companyCategory)
    if (info?.companyType?.length) setCompanyType(info.companyType.filter((t: string) => t !== 'developer'))
    const phone = (user as any)?.contactPerson?.phone
    if (phone) setContactPhone(phone)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!companyName.trim()) e.companyName = '회사명을 입력해주세요'
    if (!contactPhone.trim()) e.contactPhone = '대표 연락처를 입력해주세요'
    if (companyType.length === 0) e.companyType = '사업 형태를 하나 이상 선택해주세요'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setServerError('')
    try {
      await authService.reapplyCorporate({ companyName, companyCategory, companyType, contactPhone })
      router.push('/register/pending')
    } catch (err: any) {
      setServerError(err?.response?.data?.message || '재신청에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const toggleType = (value: CompanyType) => {
    setCompanyType(prev =>
      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
    )
    setErrors(prev => ({ ...prev, companyType: '' }))
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-7 h-7 text-text-primary" />
            </div>
            <span className="text-2xl font-bold">
              <span className="text-green-400">GAME</span>
              <span className="text-text-primary">UP</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary mb-1">기업회원 재신청</h1>
          <p className="text-text-secondary text-sm">정보를 수정 후 재신청해주세요</p>
        </div>

        <div className="bg-bg-secondary border border-line rounded-2xl p-6 space-y-5">
          {serverError && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-danger px-4 py-3 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{serverError}</span>
            </div>
          )}

          {/* 기업 유형 */}
          <div>
            <p className="block text-sm font-medium text-text-secondary mb-2">기업 유형</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button"
                onClick={() => setCompanyCategory('developer')}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${companyCategory === 'developer' ? 'border-accent bg-accent-light text-accent' : 'border-line text-text-secondary hover:border-line'}`}
              >
                <Code2 className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-sm">개발사</p>
                  <p className="text-xs opacity-70">게임 개발 & 퍼블리싱</p>
                </div>
              </button>
              <button type="button"
                onClick={() => setCompanyCategory('partner')}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${companyCategory === 'partner' ? 'border-accent bg-accent-light text-accent' : 'border-line text-text-secondary hover:border-line'}`}
              >
                <Handshake className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-sm">파트너</p>
                  <p className="text-xs opacity-70">게임서비스 관련사</p>
                </div>
              </button>
            </div>
          </div>

          {/* 회사명 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">회사명</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="text"
                value={companyName}
                onChange={e => { setCompanyName(e.target.value); setErrors(prev => ({ ...prev, companyName: '' })) }}
                placeholder="회사명을 입력해주세요"
                className={`w-full bg-bg-tertiary border rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.companyName ? 'border-red-500' : 'border-line'}`}
              />
            </div>
            {errors.companyName && <p className="mt-1 text-xs text-danger">{errors.companyName}</p>}
          </div>

          {/* 대표 연락처 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">대표 연락처</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="tel"
                value={contactPhone}
                onChange={e => { setContactPhone(e.target.value); setErrors(prev => ({ ...prev, contactPhone: '' })) }}
                placeholder="010-0000-0000"
                className={`w-full bg-bg-tertiary border rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.contactPhone ? 'border-red-500' : 'border-line'}`}
              />
            </div>
            {errors.contactPhone && <p className="mt-1 text-xs text-danger">{errors.contactPhone}</p>}
          </div>

          {/* 사업 형태 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              사업 형태 <span className="text-red-400">*</span>{' '}
              <span className="text-text-muted font-normal">(복수 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_TYPE_OPTIONS.map(({ value, label }) => {
                const selected = companyType.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleType(value)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selected
                        ? 'border-accent bg-accent-light text-accent'
                        : 'border-line text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {errors.companyType && <p className="mt-1 text-xs text-danger">{errors.companyType}</p>}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-1">
            <Link
              href="/register/pending"
              className="flex items-center justify-center gap-1 px-4 py-3 rounded-lg border border-line text-text-secondary hover:bg-bg-tertiary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-accent hover:bg-accent-hover disabled:bg-green-800 disabled:cursor-not-allowed text-text-primary font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> 처리중...</> : '재신청하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
