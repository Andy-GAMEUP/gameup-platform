'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gamepad2, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { login, loginWithKakao, loginWithNaver } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
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
    if (!formData.password) newErrors.password = '비밀번호를 입력해주세요'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setServerError('')
    try {
      await login(formData.email, formData.password)
      const res = await fetch('/api/auth/session')
      const session = await res.json()
      const role = session?.user?.role
      if (role === 'admin') router.push('/admin')
      else if (role === 'developer') router.push('/dashboard')
      else router.push('/games')
    } catch (error: any) {
      const msg = error.message
      const friendlyMsg = (msg === 'CredentialsSignin' || msg === 'Configuration')
        ? '이메일 또는 비밀번호가 올바르지 않습니다'
        : msg || '로그인 중 오류가 발생했습니다'
      setServerError(friendlyMsg)
    } finally {
      setLoading(false)
    }
  }

  const fillTestAccount = (type: 'admin' | 'developer' | 'player') => {
    const accounts = {
      admin: { email: 'admin@gameup.com', password: 'test123456' },
      developer: { email: 'developer@test.com', password: 'test123456' },
      player: { email: 'player@test.com', password: 'test123456' },
    }
    setFormData(accounts[type])
    setServerError('')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
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
          <h1 className="text-3xl font-bold text-white mb-2">로그인</h1>
          <p className="text-slate-400">
            계정이 없으신가요?{' '}
            <Link href="/register" className="text-green-400 hover:text-green-300 font-medium">
              가입하기
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
                  placeholder="••••••••"
                  className={`w-full bg-slate-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.password ? 'border-red-500' : 'border-slate-700'}`}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> 로그인 중...</>
              ) : '로그인'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-slate-400">또는</span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <button
                onClick={loginWithKakao}
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#FEE500] text-[#191919] font-medium hover:bg-[#FDD835] transition-colors"
              >
                카카오로 시작하기
              </button>
              <button
                onClick={loginWithNaver}
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#03C75A] text-white font-medium hover:bg-[#02b351] transition-colors"
              >
                네이버로 시작하기
              </button>
            </div>
          </div>

          {/* Test Accounts */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-slate-900 text-slate-500">테스트 계정</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(['admin', 'developer', 'player'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => fillTestAccount(type)}
                  className="py-2 px-3 rounded-lg border border-slate-700 text-slate-400 hover:border-green-500/50 hover:text-green-400 text-xs font-medium transition-colors"
                >
                  {type === 'admin' ? '관리자' : type === 'developer' ? '개발자' : '플레이어'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
