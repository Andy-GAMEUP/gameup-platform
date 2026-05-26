'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { gameService } from '@/services/gameService'
import { Upload, Loader2, Globe } from 'lucide-react'

interface FormData {
  title: string
  genre: string
  description: string
  serviceType: string
  monetizationType: string
  price: string
  currency: string
  startDate: string
  endDate: string
  maxTesters: string
  testType: string
  requirements: string
  gameDomain: string
  trailer: string
  website: string
  discord: string
  notes: string
  rewardAd: boolean
  inAppPurchase: boolean
  subscription: boolean
  battlePass: boolean
}

export default function UploadGamePage() {
  const router = useRouter()
  const thumbnailRef = useRef<HTMLInputElement>(null)

  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<FormData>({
    title: '',
    genre: '',
    description: '',
    serviceType: 'beta',
    monetizationType: 'free',
    price: '',
    currency: 'krw',
    startDate: '',
    endDate: '',
    maxTesters: '',
    testType: '',
    requirements: '',
    gameDomain: '',
    trailer: '',
    website: '',
    discord: '',
    notes: '',
    rewardAd: false,
    inAppPurchase: false,
    subscription: false,
    battlePass: false,
  })

  const isValidUrl = (url: string) => {
    try { new URL(url); return true } catch { return false }
  }


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnail(file)
      const reader = new FileReader()
      reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.gameDomain.trim()) {
      setError('게임 서비스 URL을 입력해주세요.')
      return
    }

    if (!isValidUrl(formData.gameDomain.trim())) {
      setError('유효한 URL 형식으로 입력해주세요. (예: https://mygame.com)')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', formData.title)
      fd.append('genre', formData.genre)
      fd.append('description', formData.description)
      fd.append('serviceType', formData.serviceType)
      fd.append('monetization', formData.monetizationType)
      fd.append('price', formData.monetizationType === 'paid' ? formData.price || '0' : '0')
      fd.append('isPaid', formData.monetizationType === 'paid' ? 'true' : 'false')
      fd.append('status', 'draft')
      fd.append('startDate', formData.startDate)
      fd.append('endDate', formData.endDate)
      fd.append('maxTesters', formData.maxTesters)
      fd.append('testType', formData.testType)
      fd.append('requirements', formData.requirements)
      fd.append('gameDomain', formData.gameDomain.trim())
      fd.append('trailer', formData.trailer)
      fd.append('website', formData.website)
      fd.append('discord', formData.discord)
      fd.append('notes', formData.notes)

      if (thumbnail) fd.append('thumbnail', thumbnail)

      await gameService.createGame(fd)
      alert('게임 등록 신청이 완료되었습니다. 관리자 승인을 기다려주세요.')
      router.push('/games-management')
    } catch (err: any) {
      setError(err.response?.data?.message || '게임 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 p-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">새 게임 등록</h1>
        <p className="text-text-secondary">게임 정보를 입력하고 등록 신청을 진행하세요</p>
      </div>


      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 서비스 유형 및 수익 모델 */}
        <div className="bg-bg-secondary border border-line rounded-lg">
          <div className="p-6 border-b border-line">
            <h2 className="text-xl font-bold">서비스 유형 및 수익 모델</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* 서비스 유형 */}
            <div className="space-y-3">
              <label className="text-base font-medium block">서비스 유형 *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { value: 'beta', label: '베타 서비스', desc: '개발 중인 게임을 테스트하고 피드백을 수집합니다', color: 'text-blue-400' },
                  { value: 'live', label: '라이브 서비스', desc: '정식 출시된 게임을 서비스합니다', color: 'text-accent' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.serviceType === opt.value ? 'border-accent bg-accent-light' : 'border-line hover:border-line'}`}
                    onClick={() => setFormData(prev => ({ ...prev, serviceType: opt.value }))}
                  >
                    <div className="flex items-start gap-3">
                      <input type="radio" name="serviceType" value={opt.value} checked={formData.serviceType === opt.value} onChange={handleChange} className="mt-1" />
                      <div>
                        <p className={`font-semibold mb-1 ${opt.color}`}>{opt.label}</p>
                        <p className="text-sm text-text-secondary">{opt.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-bg-tertiary" />

            {/* 수익 모델 */}
            <div className="space-y-3">
              <label className="text-base font-medium block">수익 모델 *</label>
              <div className="space-y-3">
                {[
                  { value: 'free', label: '무료 (Free-to-Play)', desc: '누구나 무료로 플레이 가능' },
                  { value: 'ad', label: '광고 기반 (Ad-Supported)', desc: '광고 수익으로 운영되는 무료 게임' },
                  { value: 'paid', label: '유료 (Premium)', desc: '구매가 필요한 프리미엄 게임' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.monetizationType === opt.value ? 'border-accent bg-accent-light' : 'border-line hover:border-line'}`}
                    onClick={() => setFormData(prev => ({ ...prev, monetizationType: opt.value }))}
                  >
                    <div className="flex items-start gap-3">
                      <input type="radio" name="monetizationType" value={opt.value} checked={formData.monetizationType === opt.value} onChange={handleChange} className="mt-1" />
                      <div className="flex-1">
                        <p className="font-semibold mb-1">{opt.label}</p>
                        <p className="text-sm text-text-secondary">{opt.desc}</p>
                        {opt.value === 'paid' && formData.monetizationType === 'paid' && (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-text-secondary mb-1 block">판매 가격 *</label>
                              <input
                                name="price"
                                type="number"
                                placeholder="29900"
                                value={formData.price}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-xs text-text-secondary mb-1 block">통화</label>
                              <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm">
                                <option value="krw">KRW (원)</option>
                                <option value="usd">USD ($)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-bg-secondary border border-line rounded-lg">
          <div className="p-6 border-b border-line">
            <h2 className="text-xl font-bold">기본 정보</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block">게임명 *</label>
                <input name="title" placeholder="게임 제목을 입력하세요" value={formData.title} onChange={handleChange}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">장르 *</label>
                <select name="genre" value={formData.genre} onChange={handleChange}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm" required>
                  <option value="">장르 선택</option>
                  <option value="액션">액션</option>
                  <option value="RPG">RPG</option>
                  <option value="FPS">FPS</option>
                  <option value="레이싱">레이싱</option>
                  <option value="전략">전략</option>
                  <option value="시뮬레이션">시뮬레이션</option>
                  <option value="어드벤처">어드벤처</option>
                  <option value="호러">호러</option>
                  <option value="퍼즐">퍼즐</option>
                  <option value="스포츠">스포츠</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block">게임 설명 *</label>
              <textarea name="description" placeholder="게임에 대한 상세 설명을 입력하세요" value={formData.description} onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm placeholder-text-muted min-h-32 focus:outline-none focus:border-accent" required />
            </div>

          </div>
        </div>

        {/* 베타 테스트 정보 */}
        {formData.serviceType === 'beta' && (
          <div className="bg-bg-secondary border border-line rounded-lg">
            <div className="p-6 border-b border-line">
              <h2 className="text-xl font-bold">베타 테스트 정보</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">시작일</label>
                  <input name="startDate" type="date" value={formData.startDate} onChange={handleChange}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block">종료일</label>
                  <input name="endDate" type="date" value={formData.endDate} onChange={handleChange}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">최대 테스터 수</label>
                  <input name="maxTesters" type="number" placeholder="1000" value={formData.maxTesters} onChange={handleChange}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm placeholder-text-muted" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block">테스트 유형</label>
                  <select name="testType" value={formData.testType} onChange={handleChange}
                    className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm">
                    <option value="">유형 선택</option>
                    <option value="closed">비공개 베타</option>
                    <option value="open">공개 베타</option>
                    <option value="alpha">알파 테스트</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">시스템 요구사항</label>
                <textarea name="requirements" placeholder="최소 및 권장 시스템 요구사항" value={formData.requirements} onChange={handleChange}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm placeholder-text-muted min-h-24" />
              </div>
            </div>
          </div>
        )}

        {/* 게임 URL & 미디어 */}
        <div className="bg-bg-secondary border border-line rounded-lg">
          <div className="p-6 border-b border-line">
            <h2 className="text-xl font-bold">게임 URL & 미디어</h2>
          </div>
          <div className="p-6 space-y-5">

            {/* 게임 서비스 URL (필수) */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">
                게임 서비스 URL * <span className="text-text-muted font-normal">(플레이 가능한 주소)</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  name="gameDomain"
                  type="url"
                  placeholder="https://mygame.com"
                  value={formData.gameDomain}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent"
                  required
                />
              </div>
              <p className="text-xs text-text-muted">게임을 플레이할 수 있는 외부 URL을 입력하세요. 승인 후 이 주소로 연결됩니다.</p>
            </div>

            {/* 썸네일 업로드 */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">게임 썸네일 이미지</label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${thumbnail ? 'border-accent-muted bg-accent/5' : 'border-line hover:border-line'}`}
                onClick={() => thumbnailRef.current?.click()}
              >
                <input ref={thumbnailRef} type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                {thumbnailPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <Image src={thumbnailPreview} alt="미리보기" width={160} height={96} className="w-40 h-24 object-cover rounded-lg" unoptimized />
                    <span className="text-accent text-sm">{thumbnail?.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto mb-2 text-text-muted" />
                    <p className="text-text-secondary text-sm mb-1">클릭하여 이미지 업로드</p>
                    <p className="text-xs text-text-muted">PNG, JPG (최대 5MB, 권장 1920x1080)</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block">트레일러 URL</label>
              <input name="trailer" placeholder="https://youtube.com/..." value={formData.trailer} onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent" />
            </div>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="bg-bg-secondary border border-line rounded-lg">
          <div className="p-6 border-b border-line">
            <h2 className="text-xl font-bold">추가 정보</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block">공식 웹사이트</label>
              <input name="website" placeholder="https://..." value={formData.website} onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium block">디스코드 서버</label>
              <input name="discord" placeholder="https://discord.gg/..." value={formData.discord} onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm placeholder-text-muted focus:outline-none focus:border-accent" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium block">테스터 안내사항</label>
              <textarea name="notes" placeholder="베타 테스터들이 알아야 할 특별한 사항" value={formData.notes} onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-text-primary text-sm placeholder-text-muted min-h-24" />
            </div>
          </div>
        </div>

        {/* 등록 안내 */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
          <p className="text-blue-400 font-medium text-sm mb-2">등록 전 확인사항</p>
          <ul className="text-text-secondary text-sm space-y-1">
            <li>• 게임 등록 후 관리자의 승인이 필요합니다 (평균 1-3일 소요)</li>
            <li>• 승인 완료 후 베타존에 게임이 공개됩니다</li>
            <li>• 등록 상태는 게임 관리 페이지에서 확인하실 수 있습니다</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="flex gap-4 justify-end">
          <button type="button" onClick={() => router.push('/games-management')}
            className="px-6 py-2 border border-line hover:bg-bg-tertiary rounded-md text-sm transition-colors">
            취소
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-md text-sm font-semibold transition-colors">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 등록 중...</> : '등록 신청'}
          </button>
        </div>
      </form>
    </div>
  )
}
