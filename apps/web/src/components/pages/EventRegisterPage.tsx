'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import {
  Gamepad2, User, Mail, Phone, Loader2, CheckCircle2, AlertCircle, ArrowLeft,
} from 'lucide-react'
import { useAuth } from '@/lib/useAuth'

interface EventBannerInfo {
  _id: string
  title: string
  description: string
  imageUrl: string
}

export default function EventRegisterPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const eventId = params.id as string

  const [banner, setBanner] = useState<EventBannerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  })

  // Load event banner info
  useEffect(() => {
    fetch('/api/event-banners')
      .then(r => r.json())
      .then(data => {
        const found = (data.banners || []).find((b: any) => b._id === eventId)
        setBanner(found || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId])

  // Pre-fill from logged-in user
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.username || '',
        email: prev.email || user.email || '',
      }))
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name || !form.email || !form.phone) {
      setError('모든 필수 항목을 입력해주세요')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/event-banners/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          userId: user?.id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || '신청에 실패했습니다')
        return
      }
      setSubmitted(true)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      </div>
    )
  }

  if (!banner) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] text-text-secondary">
          <AlertCircle className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-xl font-semibold mb-2">이벤트를 찾을 수 없습니다</p>
          <Link href="/" className="text-accent hover:text-accent mt-4">홈으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-3xl font-bold mb-4">신청 완료!</h1>
            <p className="text-text-secondary mb-2">
              <span className="text-accent font-semibold">{banner.title}</span> 이벤트에 참가 신청이 완료되었습니다.
            </p>
            <p className="text-text-muted text-sm mb-8">신청 내역은 등록하신 이메일로 안내드립니다.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/"
                className="px-6 py-3 bg-accent hover:bg-accent-hover text-text-primary rounded-lg font-medium transition-colors">
                홈으로
              </Link>
              <Link href="/"
                className="px-6 py-3 bg-bg-tertiary hover:bg-line-light text-text-primary rounded-lg font-medium transition-colors">
                게임 둘러보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back */}
          <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
          </button>

          {/* Banner Preview */}
          {banner.imageUrl && (
            <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-8">
              <Image src={banner.imageUrl} alt={banner.title} fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-6">
                <h1 className="text-2xl font-bold drop-shadow">{banner.title}</h1>
                {banner.description && <p className="text-white/80 text-sm drop-shadow mt-1">{banner.description}</p>}
              </div>
            </div>
          )}

          {/* Registration Form */}
          <div className="bg-bg-secondary border border-line rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">이벤트 참가 신청</h2>
                <p className="text-text-secondary text-sm">아래 정보를 입력하여 이벤트에 참가하세요</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-5">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 참가 이벤트 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">참가 이벤트</label>
                <div className="bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-accent font-medium text-sm">
                  {banner.title}
                </div>
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">이름 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="신청자 이름"
                    className="w-full bg-bg-tertiary border border-line rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                  />
                </div>
              </div>

              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">이메일 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="w-full bg-bg-tertiary border border-line rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                  />
                </div>
              </div>

              {/* 전화번호 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">전화번호 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="w-full bg-bg-tertiary border border-line rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                  />
                </div>
              </div>

              {/* 사용자 ID (로그인시 자동) */}
              {user && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">사용자 ID</label>
                  <div className="bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-secondary text-sm">
                    {user.username} ({user.email})
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-accent hover:bg-accent-hover disabled:bg-green-800 disabled:cursor-not-allowed text-text-primary font-semibold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> 신청 중...</>
                ) : (
                  '이벤트 참가 신청'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
