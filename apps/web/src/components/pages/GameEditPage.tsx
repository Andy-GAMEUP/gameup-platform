'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { RefreshCw, Save, ArrowLeft, Plus, X, Upload } from 'lucide-react'
import { gameService } from '@/services/gameService'

interface GameData {
  _id: string
  title: string
  description: string
  genre: string
  status: string
  approvalStatus: string
  serviceType: string
  monetization: string
  price: number
  isPaid: boolean
  playCount: number
  rating: number
  createdAt: string
  tags?: string[]
  thumbnail?: string
  // 확장 필드 (등록 시 저장된 경우)
  platform?: string
  engine?: string
  startDate?: string
  endDate?: string
  maxTesters?: number
  testType?: string
  requirements?: string
  trailer?: string
  website?: string
  discord?: string
  notes?: string
  rejectionReason?: string
}

const approvalBadge: Record<string, string> = {
  approved: 'bg-green-500/20 text-green-400 border border-green-500/50',
  pending:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  review:   'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  rejected: 'bg-red-500/20 text-red-400 border border-red-500/50',
}
const approvalLabel: Record<string, string> = {
  approved: '승인완료', pending: '승인대기', review: '검토중', rejected: '반려',
}

export default function GameEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const thumbnailRef = useRef<HTMLInputElement>(null)
  const gameFileRef = useRef<HTMLInputElement>(null)

  const [game, setGame] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 폼 상태
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [platform, setPlatform] = useState('')
  const [engine, setEngine] = useState('')
  const [serviceType, setServiceType] = useState('beta')
  const [monetization, setMonetization] = useState('free')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState('draft')

  // 태그
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  // 베타 테스트 정보
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [maxTesters, setMaxTesters] = useState('')
  const [testType, setTestType] = useState('')
  const [requirements, setRequirements] = useState('')

  // 미디어
  const [trailer, setTrailer] = useState('')
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [gameFile, setGameFile] = useState<File | null>(null)

  // 추가 정보
  const [website, setWebsite] = useState('')
  const [discord, setDiscord] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const loadGame = async () => {
      if (!id) return
      setLoading(true)
      setError('')
      try {
        const data = await gameService.getGameById(id)
        const g = data.game as unknown as GameData
        setGame(g)
        setTitle(g.title || '')
        setDescription(g.description || '')
        setGenre(g.genre || '')
        setPlatform(g.platform || '')
        setEngine(g.engine || '')
        setServiceType(g.serviceType || 'beta')
        setMonetization(g.monetization || 'free')
        setPrice(String(g.price || 0))
        setStatus(g.status || 'draft')
        setTags(g.tags || [])
        setStartDate(g.startDate ? g.startDate.split('T')[0] : '')
        setEndDate(g.endDate ? g.endDate.split('T')[0] : '')
        setMaxTesters(String(g.maxTesters || ''))
        setTestType(g.testType || '')
        setRequirements(g.requirements || '')
        setTrailer(g.trailer || '')
        setWebsite(g.website || '')
        setDiscord(g.discord || '')
        setNotes(g.notes || '')
        if (g.thumbnail) setThumbnailPreview(g.thumbnail)
      } catch (err: any) {
        setError(err.response?.data?.message || '게임 정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    loadGame()
  }, [id])

  const handleAddTag = () => {
    const trimmed = newTag.trim()
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed])
      setNewTag('')
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

  const handleGameFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setGameFile(file)
  }

  const handleSave = async () => {
    if (!id || !game) return

    // 재승인 필요 안내
    const confirmed = confirm(
      '게임 정보를 수정하면 관리자의 재승인이 필요합니다.\n' +
      '승인 완료 전까지 승인 상태가 "승인대기"로 변경됩니다.\n\n' +
      '계속하시겠습니까?'
    )
    if (!confirmed) return

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', title)
      fd.append('description', description)
      fd.append('genre', genre)
      fd.append('platform', platform)
      fd.append('engine', engine)
      fd.append('serviceType', serviceType)
      fd.append('monetization', monetization)
      fd.append('price', monetization === 'paid' ? price : '0')
      fd.append('isPaid', monetization === 'paid' ? 'true' : 'false')
      fd.append('status', status)
      fd.append('startDate', startDate)
      fd.append('endDate', endDate)
      fd.append('maxTesters', maxTesters)
      fd.append('testType', testType)
      fd.append('requirements', requirements)
      fd.append('trailer', trailer)
      fd.append('website', website)
      fd.append('discord', discord)
      fd.append('notes', notes)
      fd.append('requestReview', 'true')  // 재승인 요청 플래그
      tags.forEach(tag => fd.append('tags[]', tag))
      if (thumbnail) fd.append('thumbnail', thumbnail)
      if (gameFile) fd.append('gameFile', gameFile)

      await gameService.updateGame(id, fd)
      alert('변경사항이 저장되었습니다.\n관리자 재승인 후 반영됩니다.')
      router.push('/games-management')
    } catch (err: any) {
      alert(err.response?.data?.message || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-3" /> 게임 정보 불러오는 중...
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 mb-4">{error || '게임을 찾을 수 없습니다.'}</p>
        <Link href="/games-management">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-sm">게임 목록으로</button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto pb-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/games-management">
            <button className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> 게임 목록
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{game.title} — 편집</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${approvalBadge[game.approvalStatus] || ''}`}>
                {approvalLabel[game.approvalStatus] || game.approvalStatus}
              </span>
              <span className="text-xs text-slate-500">
                등록일: {new Date(game.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md text-sm font-semibold transition-colors">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>

      {/* 반려 사유 */}
      {game.approvalStatus === 'rejected' && game.rejectionReason && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-sm">
          <p className="text-red-400 font-medium mb-1">⚠️ 반려 사유</p>
          <p className="text-slate-300">{game.rejectionReason}</p>
          <p className="text-slate-400 mt-2 text-xs">내용을 수정 후 저장하면 재검토 요청이 됩니다.</p>
        </div>
      )}

      {/* 재승인 안내 배너 */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div className="text-sm">
          <p className="text-yellow-400 font-medium mb-1">수정 시 재승인 필요</p>
          <p className="text-slate-300">게임 정보를 수정하면 관리자의 재승인이 필요합니다. 저장 후 승인 상태가 <span className="text-yellow-400 font-medium">승인대기</span>로 변경되며, 승인 완료 전까지 변경 내용은 검토 중 상태로 유지됩니다.</p>
        </div>
      </div>

      {/* ── 서비스 유형 및 수익 모델 ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold">서비스 유형 및 수익 모델</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-base font-medium block">서비스 유형 *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { value: 'beta', label: '베타 서비스', desc: '개발 중인 게임을 테스트하고 피드백을 수집합니다', color: 'text-blue-400' },
                { value: 'live', label: '라이브 서비스', desc: '정식 출시된 게임을 서비스합니다', color: 'text-green-400' },
              ].map(opt => (
                <div key={opt.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${serviceType === opt.value ? 'border-green-500 bg-green-500/10' : 'border-slate-700 hover:border-slate-600'}`}
                  onClick={() => setServiceType(opt.value)}>
                  <div className="flex items-start gap-3">
                    <input type="radio" checked={serviceType === opt.value} onChange={() => setServiceType(opt.value)} className="mt-1" />
                    <div>
                      <p className={`font-semibold mb-1 ${opt.color}`}>{opt.label}</p>
                      <p className="text-sm text-slate-400">{opt.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          <div className="space-y-3">
            <label className="text-base font-medium block">수익 모델 *</label>
            <div className="space-y-3">
              {[
                { value: 'free', label: '무료 (Free-to-Play)', desc: '누구나 무료로 플레이 가능' },
                { value: 'ad', label: '광고 기반 (Ad-Supported)', desc: '광고 수익으로 운영되는 무료 게임' },
                { value: 'paid', label: '유료 (Premium)', desc: '구매가 필요한 프리미엄 게임' },
              ].map(opt => (
                <div key={opt.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${monetization === opt.value ? 'border-green-500 bg-green-500/10' : 'border-slate-700 hover:border-slate-600'}`}
                  onClick={() => setMonetization(opt.value)}>
                  <div className="flex items-start gap-3">
                    <input type="radio" checked={monetization === opt.value} onChange={() => setMonetization(opt.value)} className="mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold mb-1">{opt.label}</p>
                      <p className="text-sm text-slate-400">{opt.desc}</p>
                      {opt.value === 'paid' && monetization === 'paid' && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">판매 가격 *</label>
                            <input type="number" placeholder="29900" value={price} onChange={e => setPrice(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm" />
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

      {/* ── 기본 정보 ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold">기본 정보</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block">게임명 *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:border-green-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium block">장르 *</label>
              <select value={genre} onChange={e => setGenre(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm">
                <option value="">장르 선택</option>
                {[['action','액션'],['rpg','RPG'],['fps','FPS'],['racing','레이싱'],['strategy','전략'],['simulation','시뮬레이션'],['adventure','어드벤처'],['horror','호러'],['puzzle','퍼즐'],['sports','스포츠']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block">게임 설명 *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm min-h-32 focus:outline-none focus:border-green-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block">플랫폼</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm">
                <option value="">플랫폼 선택</option>
                {[['pc','PC'],['console','콘솔'],['mobile','모바일'],['multi','멀티 플랫폼'],['web','웹 브라우저']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium block">게임 엔진</label>
              <input value={engine} onChange={e => setEngine(e.target.value)} placeholder="예: Unreal Engine 5"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500" />
            </div>
          </div>

          {/* 게임 상태 */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">게임 상태</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm">
              <option value="draft">초안</option>
              <option value="beta">베타</option>
              <option value="published">라이브</option>
              <option value="archived">종료</option>
            </select>
          </div>

          {/* 태그 */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">태그 <span className="text-slate-500 font-normal">(최대 10개)</span></label>
            <div className="flex flex-wrap gap-2 mb-2 min-h-8">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded-full text-xs">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {tags.length === 0 && <span className="text-slate-500 text-xs py-1">태그 없음</span>}
            </div>
            <div className="flex gap-2">
              <input placeholder="태그 입력 후 Enter" value={newTag} onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500" />
              <button type="button" onClick={handleAddTag}
                className="px-3 py-2 border border-slate-700 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 베타 테스트 정보 ── */}
      {serviceType === 'beta' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold">베타 테스트 정보</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block">시작일</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:border-green-500 cursor-pointer" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">종료일</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:border-green-500 cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block">최대 테스터 수</label>
                <input type="number" placeholder="1000" value={maxTesters} onChange={e => setMaxTesters(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">테스트 유형</label>
                <select value={testType} onChange={e => setTestType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm">
                  <option value="">유형 선택</option>
                  <option value="closed">비공개 베타</option>
                  <option value="open">공개 베타</option>
                  <option value="alpha">알파 테스트</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium block">시스템 요구사항</label>
              <textarea value={requirements} onChange={e => setRequirements(e.target.value)}
                placeholder="최소 및 권장 시스템 요구사항"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 min-h-24" />
            </div>
          </div>
        </div>
      )}

      {/* ── 미디어 & 파일 ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold">미디어 & 파일</h2>
        </div>
        <div className="p-6 space-y-5">

          {/* 썸네일 */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">게임 썸네일 이미지</label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${thumbnailPreview ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 hover:border-slate-600'}`}
              onClick={() => thumbnailRef.current?.click()}>
              <input ref={thumbnailRef} type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
              {thumbnailPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={thumbnailPreview} alt="썸네일 미리보기" className="w-48 h-28 object-cover rounded-lg" />
                  <span className="text-green-400 text-xs">{thumbnail?.name || '현재 썸네일'} · 클릭하여 변경</span>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto mb-2 text-slate-500" />
                  <p className="text-slate-400 text-sm mb-1">클릭하여 이미지 업로드</p>
                  <p className="text-xs text-slate-500">PNG, JPG (최대 5MB, 권장 1920x1080)</p>
                </>
              )}
            </div>
          </div>

          {/* 게임 파일 교체 (선택) */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">
              게임 파일 교체 <span className="text-slate-500 font-normal">(변경 시에만 업로드)</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${gameFile ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 hover:border-slate-600'}`}
              onClick={() => gameFileRef.current?.click()}>
              <input ref={gameFileRef} type="file" className="hidden" accept=".html,.zip,.js" onChange={handleGameFileChange} />
              {gameFile ? (
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">{gameFile.name}</span>
                  <span className="text-xs text-slate-500">({(gameFile.size / 1024 / 1024).toFixed(2)}MB)</span>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto mb-2 text-slate-500" />
                  <p className="text-slate-400 text-sm mb-1">클릭하여 새 게임 파일 업로드</p>
                  <p className="text-xs text-slate-500">HTML, ZIP, JS (최대 50MB) · 업로드 안 하면 기존 파일 유지</p>
                </>
              )}
            </div>
          </div>

          {/* 트레일러 URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">트레일러 URL</label>
            <input value={trailer} onChange={e => setTrailer(e.target.value)}
              placeholder="https://youtube.com/..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500" />
          </div>
        </div>
      </div>

      {/* ── 추가 정보 ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold">추가 정보</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium block">공식 웹사이트</label>
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium block">디스코드 서버</label>
            <input value={discord} onChange={e => setDiscord(e.target.value)} placeholder="https://discord.gg/..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium block">테스터 안내사항</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="베타 테스터들이 알아야 할 특별한 사항"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 min-h-24" />
          </div>
        </div>
      </div>

      {/* ── 게임 통계 (읽기 전용) ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold">게임 통계 <span className="text-slate-500 text-sm font-normal">(읽기 전용)</span></h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '플레이 수', value: (game.playCount || 0).toLocaleString() },
            { label: '평점', value: game.rating > 0 ? game.rating.toFixed(1) : '-' },
            { label: '승인 상태', value: approvalLabel[game.approvalStatus] || game.approvalStatus },
            { label: '등록일', value: new Date(game.createdAt).toLocaleDateString('ko-KR') },
          ].map(s => (
            <div key={s.label} className="text-center p-3 bg-slate-800/50 rounded-lg">
              <div className="text-xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-between">
        <Link href="/games-management">
          <button className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-md text-sm transition-colors">취소</button>
        </Link>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md text-sm font-semibold transition-colors">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>
    </div>
  )
}
