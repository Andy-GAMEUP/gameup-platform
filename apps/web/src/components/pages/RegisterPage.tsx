'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Mail, Lock, User, AlertCircle, Loader2, Code2, Gamepad,
  Building2, UserCircle, Phone, ChevronLeft, ChevronRight, Check, Handshake,
} from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import Image from 'next/image'

type MemberType = 'individual' | 'corporate'
type CompanyCategory = 'developer' | 'partner'
type CompanyType = 'publisher' | 'game_solution' | 'game_service' | 'operations' | 'qa' | 'marketing' | 'development' | 'original_art' | 'other'

export default function RegisterPage() {
  const router = useRouter()
  const { register, loginWithKakao, loginWithNaver } = useAuth()
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
    companyCategory: 'developer' as CompanyCategory,
    companyType: [] as CompanyType[],
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  // Terms state
  const [termsLoading, setTermsLoading] = useState(false)
  const [serviceTerms, setServiceTerms] = useState('')
  const [privacyTerms, setPrivacyTerms] = useState('')
  const [agreedService, setAgreedService] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)


  // Steps: 1=회원유형, 2=약관동의, 3=기본정보+기업정보
  const totalSteps = 3

  // Load terms when entering step 2
  useEffect(() => {
    if (step === 2 && !serviceTerms && !privacyTerms) {
      setTermsLoading(true)
      fetch('/api/terms')
        .then(r => r.json())
        .then(data => {
          const terms = data?.terms ?? []
          const svc = terms.find((t: any) => t.type === 'service')
          const prv = terms.find((t: any) => t.type === 'privacy')
          setServiceTerms(svc?.content ?? '')
          setPrivacyTerms(prv?.content ?? '')
        })
        .catch(() => {})
        .finally(() => setTermsLoading(false))
    }
  }, [step])

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
    setServerError('')
  }

  const validateStep3 = () => {
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

  const validateStep4 = () => {
    const newErrors: { [key: string]: string } = {}
    if (!formData.email) newErrors.email = '이메일을 입력해주세요'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = '올바른 이메일 형식이 아닙니다'
    if (!formData.username) newErrors.username = '사용자명을 입력해주세요'
    else if (formData.username.length < 2) newErrors.username = '최소 2자 이상 입력해주세요'
    if (!formData.password) newErrors.password = '비밀번호를 입력해주세요'
    else if (formData.password.length < 6) newErrors.password = '최소 6자 이상 입력해주세요'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
    if (!companyData.companyName) newErrors.companyName = '회사명을 입력해주세요'
    if (!companyData.contactPhone) newErrors.contactPhone = '연락처를 입력해주세요'
    if (companyData.companyType.length === 0) newErrors.companyType = '사업 형태를 하나 이상 선택해주세요'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      if (!agreedService || !agreedPrivacy) {
        setErrors({ terms: '모든 약관에 동의해야 합니다' })
        return
      }
      setErrors({})
      setStep(3)
    } else if (step === 3) {
      if (memberType === 'corporate') {
        if (!validateStep4()) return
      } else {
        if (!validateStep3()) return
      }
      setServerError('')
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
        role: memberType === 'corporate' ? 'developer' : formData.role,
        memberType,
      }
      if (memberType === 'corporate') {
        registerData.companyInfo = {
          companyName: companyData.companyName,
          companyCategory: companyData.companyCategory,
          companyType: companyData.companyType,
        }
        registerData.contactPerson = {
          name: formData.username,
          phone: companyData.contactPhone,
          email: companyData.contactEmail || undefined,
        }
        registerData.skipLogin = true
      }
      await register(registerData)
      if (memberType === 'corporate') {
        router.push('/register/pending')
        return
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

  return (<>
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Image src="/logo_gameup_v2_2.png" alt="" width={212} height={80} className="h-[60px] w-auto object-contain" />
          </Link>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {step === 3 && memberType === 'corporate'
              ? <>{companyData.companyCategory === 'developer' ? '개발사' : '파트너'} <span className="text-text-secondary font-normal">·</span> 회원가입</>
              : '회원가입'}
          </h1>
          <p className="text-text-secondary">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-accent hover:text-accent font-medium">
              로그인하기
            </Link>
          </p>
        </div>

        {/* Step 1 & 2: step indicator above card */}
        {(step === 1 || step === 2) && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  onClick={() => s < step && setStep(s)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    s < step ? 'bg-accent text-text-primary cursor-pointer hover:opacity-80' :
                    s === step ? 'bg-accent text-text-primary' :
                    'bg-bg-tertiary text-text-secondary'
                  }`}
                >
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < totalSteps && (
                  <div className={`w-8 h-0.5 ${s < step ? 'bg-accent' : 'bg-bg-tertiary'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 1 & 2 Card */}
        {(step === 1 || step === 2) && (
          <div className="bg-bg-secondary border border-line rounded-2xl p-6">
            {serverError && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-danger px-4 py-3 rounded-lg mb-5">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{serverError}</span>
              </div>
            )}

            {/* Step 1: Member Type */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">회원 유형</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMemberType('individual')}
                      className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                        memberType === 'individual'
                          ? 'border-accent bg-accent-light text-accent'
                          : 'border-line text-text-secondary hover:border-line'
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
                          ? 'border-accent bg-accent-light text-accent'
                          : 'border-line text-text-secondary hover:border-line'
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

                {memberType === 'individual' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-line" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-bg-secondary text-text-secondary">또는 소셜 계정으로 가입</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={loginWithKakao}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#FEE500] text-[#191919] font-medium hover:bg-[#FDD835] transition-colors"
                    >
                      카카오로 시작하기
                    </button>
                    <button
                      type="button"
                      onClick={loginWithNaver}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#03C75A] text-white font-medium hover:bg-[#02b351] transition-colors"
                    >
                      네이버로 시작하기
                    </button>
                    <p className="text-xs text-text-muted text-center leading-relaxed">
                      소셜 계정으로 가입 시 GameUp의{' '}
                      <a href="/terms/service" target="_blank" className="underline hover:text-text-secondary">서비스 이용약관</a>
                      {' '}및{' '}
                      <a href="/terms/privacy" target="_blank" className="underline hover:text-text-secondary">개인정보처리방침</a>
                      에 동의하는 것으로 간주됩니다.
                    </p>
                  </div>
                )}

                {memberType === 'corporate' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-xs text-amber-400">
                      기업회원은 가입 후 관리자 승인이 필요합니다. 승인 완료 후 기업 전용 기능을 이용하실 수 있습니다.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Terms Agreement */}
            {step === 2 && (
              <div className="space-y-5">
                <h3 className="text-text-primary font-semibold text-lg">약관 동의</h3>

                {termsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
                  </div>
                ) : (
                  <>
                    {/* 서비스 이용약관 */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedService}
                          onChange={e => { setAgreedService(e.target.checked); setErrors({}) }}
                          className="accent-green-500 w-4 h-4"
                        />
                        <span className="text-text-primary text-sm font-medium">서비스 이용약관 동의</span>
                      </label>
                      <div className="bg-bg-tertiary border border-line rounded-lg p-3 max-h-40 overflow-y-auto text-text-secondary text-xs leading-relaxed">
                        {serviceTerms ? (
                          <div dangerouslySetInnerHTML={{ __html: serviceTerms }} />
                        ) : (
                          <p>서비스 이용약관이 등록되지 않았습니다.</p>
                        )}
                      </div>
                    </div>

                    {/* 개인정보 수집 및 이용 동의 */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedPrivacy}
                          onChange={e => { setAgreedPrivacy(e.target.checked); setErrors({}) }}
                          className="accent-green-500 w-4 h-4"
                        />
                        <span className="text-text-primary text-sm font-medium">개인정보 수집 및 이용 동의</span>
                      </label>
                      <div className="bg-bg-tertiary border border-line rounded-lg p-3 max-h-40 overflow-y-auto text-text-secondary text-xs leading-relaxed">
                        {privacyTerms ? (
                          <div dangerouslySetInnerHTML={{ __html: privacyTerms }} />
                        ) : (
                          <p>개인정보 수집 및 이용 약관이 등록되지 않았습니다.</p>
                        )}
                      </div>
                    </div>

                    {/* 전체 동의 */}
                    <label className="flex items-center gap-2 cursor-pointer bg-bg-tertiary/50 rounded-lg px-3 py-2.5 border border-line">
                      <input
                        type="checkbox"
                        checked={agreedService && agreedPrivacy}
                        onChange={e => { setAgreedService(e.target.checked); setAgreedPrivacy(e.target.checked); setErrors({}) }}
                        className="accent-green-500 w-4 h-4"
                      />
                      <span className="text-accent text-sm font-medium">전체 동의</span>
                    </label>

                    {errors.terms && (
                      <p className="text-xs text-danger">{errors.terms}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Navigation Buttons (step 1 & 2) */}
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center justify-center gap-1 px-4 py-3 rounded-lg border border-line text-text-secondary hover:bg-bg-tertiary transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex-1 bg-accent hover:bg-accent-hover disabled:bg-green-800 disabled:cursor-not-allowed text-text-primary font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> 처리중...</>
                ) : (
                  <>다음 <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 기본정보 카드 */}
        {step === 3 && (
          <>
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    onClick={() => s < step && setStep(s)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      s < step ? 'bg-accent text-text-primary cursor-pointer hover:opacity-80' :
                      s === step ? 'bg-accent text-text-primary' :
                      'bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    {s < step ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < totalSteps && (
                    <div className={`w-8 h-0.5 ${s < step ? 'bg-accent' : 'bg-bg-tertiary'}`} />
                  )}
                </div>
              ))}
            </div>

            {serverError && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-danger px-4 py-3 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{serverError}</span>
              </div>
            )}

            {/* Card 1: 이메일·사용자명·비밀번호 */}
            <div className="bg-bg-secondary border border-line rounded-2xl p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@email.com"
                      className={`w-full bg-bg-tertiary border rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.email ? 'border-red-500' : 'border-line'}`} />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">사용자명</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="닉네임"
                      className={`w-full bg-bg-tertiary border rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.username ? 'border-red-500' : 'border-line'}`} />
                  </div>
                  {errors.username && <p className="mt-1 text-xs text-danger">{errors.username}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="최소 6자 이상"
                      className={`w-full bg-bg-tertiary border rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.password ? 'border-red-500' : 'border-line'}`} />
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••"
                      className={`w-full bg-bg-tertiary border rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.confirmPassword ? 'border-red-500' : 'border-line'}`} />
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-danger">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Card 2: 기업 정보 (corporate only) */}
            {memberType === 'corporate' && (
              <div className="bg-bg-secondary border border-line rounded-2xl p-6 mt-4">
                <div className="space-y-4">
                  <div>
                    <p className="block text-sm font-medium text-text-secondary mb-2">기업 유형</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button"
                        onClick={() => setCompanyData(prev => ({ ...prev, companyCategory: 'developer' }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${companyData.companyCategory === 'developer' ? 'border-accent bg-accent-light text-accent' : 'border-line text-text-secondary hover:border-line'}`}
                      >
                        <Code2 className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                          <p className="font-medium text-sm">개발사</p>
                          <p className="text-xs opacity-70">게임 개발 & 퍼블리싱</p>
                        </div>
                      </button>
                      <button type="button"
                        onClick={() => setCompanyData(prev => ({ ...prev, companyCategory: 'partner' }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${companyData.companyCategory === 'partner' ? 'border-accent bg-accent-light text-accent' : 'border-line text-text-secondary hover:border-line'}`}
                      >
                        <Handshake className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                          <p className="font-medium text-sm">파트너</p>
                          <p className="text-xs opacity-70">게임서비스 관련사</p>
                        </div>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">회사명</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type="text" name="companyName" value={companyData.companyName} onChange={handleCompanyChange} placeholder="회사명을 입력해주세요"
                        className={`w-full bg-bg-tertiary border rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.companyName ? 'border-red-500' : 'border-line'}`} />
                    </div>
                    {errors.companyName && <p className="mt-1 text-xs text-danger">{errors.companyName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">대표 연락처</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type="tel" name="contactPhone" value={companyData.contactPhone} onChange={handleCompanyChange} placeholder="010-0000-0000"
                        className={`w-full bg-bg-tertiary border rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.contactPhone ? 'border-red-500' : 'border-line'}`} />
                    </div>
                    {errors.contactPhone && <p className="mt-1 text-xs text-danger">{errors.contactPhone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">사업 형태 <span className="text-red-400">*</span> <span className="text-text-muted font-normal">(복수 선택 가능)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: 'publisher',     label: '퍼블리셔' },
                        { value: 'game_solution', label: '게임솔루션' },
                        { value: 'game_service',  label: '게임서비스' },
                        { value: 'operations',    label: '운영' },
                        { value: 'qa',            label: 'QA' },
                        { value: 'marketing',     label: '마케팅' },
                        { value: 'development',   label: '개발' },
                        { value: 'original_art',  label: '원화' },
                        { value: 'other',         label: '기타' },
                      ] as { value: CompanyType; label: string }[]).map(({ value, label }) => {
                        const selected = companyData.companyType.includes(value)
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setCompanyData(prev => ({
                              ...prev,
                              companyType: selected
                                ? prev.companyType.filter(t => t !== value)
                                : [...prev.companyType, value],
                            }))}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              selected
                                ? 'border-accent bg-accent-light text-accent'
                                : 'border-line text-text-secondary hover:border-line hover:text-text-primary'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    {errors.companyType && <p className="mt-1 text-xs text-danger">{errors.companyType}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons (step 3) */}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center justify-center gap-1 px-4 py-3 rounded-lg border border-line text-text-secondary hover:bg-bg-tertiary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex-1 bg-accent hover:bg-accent-hover disabled:bg-green-800 disabled:cursor-not-allowed text-text-primary font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> 처리중...</>
                ) : (
                  '가입하기'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>

  </>)
}
