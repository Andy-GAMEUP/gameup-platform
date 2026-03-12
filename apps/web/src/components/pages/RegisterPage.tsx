'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Gamepad2, Mail, Lock, User, AlertCircle, Loader2, Code2, Gamepad,
  Building2, UserCircle, Phone, ChevronLeft, ChevronRight, Check,
} from 'lucide-react'
import { useAuth } from '@/lib/useAuth'

type MemberType = 'individual' | 'corporate'
type CompanyType = 'developer' | 'publisher' | 'game_solution' | 'game_service' | 'operations' | 'qa' | 'marketing' | 'other'

const COMPANY_TYPE_OPTIONS: { value: CompanyType; label: string }[] = [
  { value: 'developer', label: '개발사' },
  { value: 'publisher', label: '퍼블리셔' },
  { value: 'game_solution', label: '게임솔루션' },
  { value: 'game_service', label: '게임서비스' },
  { value: 'operations', label: '운영' },
  { value: 'qa', label: 'QA' },
  { value: 'marketing', label: '마케팅' },
  { value: 'other', label: '기타' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [step, setStep] = useState(1)
  const [memberType, setMemberType] = useState<MemberType>('individual')
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'player' as 'developer' | 'player',
  })
  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyType: [] as CompanyType[],
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const totalSteps = memberType === 'corporate' ? 3 : 2

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
    setServerError('')
  }

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCompanyData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const toggleCompanyType = (type: CompanyType) => {
    setCompanyData(prev => ({
      ...prev,
      companyType: prev.companyType.includes(type)
        ? prev.companyType.filter(t => t !== type)
        : [...prev.companyType, type],
    }))
    setErrors(prev => ({ ...prev, companyType: '' }))
  }

  const validateStep2 = () => {
    const newErrors: { [key: string]: string } = {}
    if (!formData.email) newErrors.email = '이메일을 입력해주세요'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = '올바른 이메일 형식이 아닙니다'
    if (!formData.username) newErrors.username = '사용자명을 입력해주세요'
    else if (formData.username.length < 2) newErrors.username = '최소 2자 이상 입력해주세요'
    if (!formData.password) newErrors.password = '비밀번호를 입력해주세요'
    else if (formData.password.length < 6) newErrors.password = '최소 6자 이상 입력해주세요'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors: { [key: string]: string } = {}
    if (!companyData.companyName) newErrors.companyName = '회사명을 입력해주세요'
    if (companyData.companyType.length === 0) newErrors.companyType = '기업유형을 선택해주세요'
    if (!companyData.contactName) newErrors.contactName = '담당자명을 입력해주세요'
    if (!companyData.contactPhone) newErrors.contactPhone = '연락처를 입력해주세요'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      if (!validateStep2()) return
      if (memberType === 'corporate') {
        setStep(3)
      } else {
        handleSubmit()
      }
    } else if (step === 3) {
      if (!validateStep3()) return
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setServerError('')
    try {
      const registerData: any = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        memberType,
      }
      if (memberType === 'corporate') {
        registerData.companyInfo = {
          companyName: companyData.companyName,
          companyType: companyData.companyType,
        }
        registerData.contactPerson = {
          name: companyData.contactName,
          phone: companyData.contactPhone,
          email: companyData.contactEmail || undefined,
        }
      }
      await register(registerData)
      if (memberType === 'corporate') {
        router.push('/register/pending')
      } else {
        const res = await fetch('/api/auth/session')
        const session = await res.json()
        const role = session?.user?.role
        if (role === 'developer') router.push('/dashboard')
        else router.push('/games')
      }
    } catch (error: any) {
      setServerError(error.message || '회원가입에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold">
              <span className="text-green-400">GAME</span>
              <span className="text-white">UP</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">회원가입</h1>
          <p className="text-slate-400">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-green-400 hover:text-green-300 font-medium">
              로그인하기
            </Link>
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s < step ? 'bg-green-500 text-white' :
                s === step ? 'bg-green-600 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < totalSteps && (
                <div className={`w-8 h-0.5 ${s < step ? 'bg-green-500' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {serverError && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-5">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{serverError}</span>
            </div>
          )}

          {/* Step 1: Member Type */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">회원 유형</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMemberType('individual')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      memberType === 'individual'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <UserCircle className="w-8 h-8" />
                    <span className="font-semibold text-sm">게임회원</span>
                    <span className="text-xs text-center opacity-70 leading-relaxed">
                      게임 플레이, 리뷰,<br />커뮤니티 활동
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberType('corporate')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                      memberType === 'corporate'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Building2 className="w-8 h-8" />
                    <span className="font-semibold text-sm">기업회원</span>
                    <span className="text-xs text-center opacity-70 leading-relaxed">
                      게임 개발, 퍼블리싱,<br />솔루션 제공
                    </span>
                  </button>
                </div>
              </div>

              {memberType === 'corporate' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-xs text-amber-400">
                    기업회원은 가입 후 관리자 승인이 필요합니다. 승인 완료 후 기업 전용 기능을 이용하실 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Role Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">계정 유형</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'player' }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.role === 'player' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}
                  >
                    <Gamepad className="w-6 h-6" />
                    <span className="font-medium text-sm">플레이어</span>
                    <span className="text-xs text-center opacity-70">게임 플레이 & 피드백</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'developer' }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.role === 'developer' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}
                  >
                    <Code2 className="w-6 h-6" />
                    <span className="font-medium text-sm">개발자</span>
                    <span className="text-xs text-center opacity-70">게임 업로드 & 수익화</span>
                  </button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">이메일</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    className={`w-full bg-slate-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.email ? 'border-red-500' : 'border-slate-700'}`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">사용자명</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="닉네임"
                    className={`w-full bg-slate-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.username ? 'border-red-500' : 'border-slate-700'}`}
                  />
                </div>
                {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">비밀번호</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="최소 6자 이상"
                    className={`w-full bg-slate-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.password ? 'border-red-500' : 'border-slate-700'}`}
                  />
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">비밀번호 확인</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full bg-slate-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.confirmPassword ? 'border-red-500' : 'border-slate-700'}`}
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Company Info */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">회사명 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    name="companyName"
                    value={companyData.companyName}
                    onChange={handleCompanyChange}
                    placeholder="회사명을 입력해주세요"
                    className={`w-full bg-slate-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.companyName ? 'border-red-500' : 'border-slate-700'}`}
                  />
                </div>
                {errors.companyName && <p className="mt-1 text-xs text-red-400">{errors.companyName}</p>}
              </div>

              {/* Company Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">기업유형 <span className="text-red-400">*</span> <span className="text-xs text-slate-500">(복수 선택 가능)</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {COMPANY_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleCompanyType(option.value)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        companyData.companyType.includes(option.value)
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {errors.companyType && <p className="mt-1 text-xs text-red-400">{errors.companyType}</p>}
              </div>

              {/* Contact Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">담당자명 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    name="contactName"
                    value={companyData.contactName}
                    onChange={handleCompanyChange}
                    placeholder="담당자 이름"
                    className={`w-full bg-slate-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.contactName ? 'border-red-500' : 'border-slate-700'}`}
                  />
                </div>
                {errors.contactName && <p className="mt-1 text-xs text-red-400">{errors.contactName}</p>}
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">연락처 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="tel"
                    name="contactPhone"
                    value={companyData.contactPhone}
                    onChange={handleCompanyChange}
                    placeholder="010-0000-0000"
                    className={`w-full bg-slate-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.contactPhone ? 'border-red-500' : 'border-slate-700'}`}
                  />
                </div>
                {errors.contactPhone && <p className="mt-1 text-xs text-red-400">{errors.contactPhone}</p>}
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">담당자 이메일 <span className="text-xs text-slate-500">(선택)</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    name="contactEmail"
                    value={companyData.contactEmail}
                    onChange={handleCompanyChange}
                    placeholder="contact@company.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center justify-center gap-1 px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> 처리중...</>
              ) : step < totalSteps ? (
                <>다음 <ChevronRight className="w-4 h-4" /></>
              ) : (
                '가입하기'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
