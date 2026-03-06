'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gamepad2, Mail, Lock, User, AlertCircle, Loader2, Code2, Gamepad } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'player' as 'developer' | 'player',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
    setServerError('')
  }

  const validate = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setServerError('')
    try {
      await register(formData.email, formData.username, formData.password, formData.role)
      if (formData.role === 'developer') router.push('/dashboard')
      else router.push('/games')
    } catch (error: any) {
      setServerError(error.response?.data?.message || '회원가입에 실패했습니다. 다시 시도해주세요.')
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

        {/* Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {serverError && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{serverError}</span>
              </div>
            )}

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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> 가입 처리중...</>
              ) : '가입하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
