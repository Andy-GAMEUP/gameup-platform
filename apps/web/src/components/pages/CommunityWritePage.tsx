'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import communityService from '@/services/communityService'
import { gameService } from '@/services/gameService'
import Editor from '@/components/Editor'
import { useAuth } from '@/lib/useAuth'
import {
  Plus, Trash2, Link as LinkIcon, Loader2, ArrowLeft, Save,
  ImageIcon, FlaskConical, Gamepad2, MessageCircle, Sparkles,
  X, ChevronDown, ChevronRight, Search, Star,
} from 'lucide-react'

const CHANNELS = [
  { value: 'beta-game',      label: '베타게임',    icon: FlaskConical,  serviceType: 'beta' },
  { value: 'live-game',      label: '라이브게임',   icon: Gamepad2,       serviceType: 'live' },
  { value: 'free',           label: '자유게시판',   icon: MessageCircle,  serviceType: null, subTabs: [
    { value: 'new-game-intro', label: '신작게임소개', icon: Sparkles },
  ]},
]

// 검색용 플랫 목록 (breadcrumb 경로 포함)
const FLAT_CHANNELS = [
  { value: 'beta-game',      label: '베타게임',    icon: FlaskConical,  path: '전체 > 베타게임' },
  { value: 'live-game',      label: '라이브게임',   icon: Gamepad2,      path: '전체 > 라이브게임' },
  { value: 'free',           label: '자유게시판',   icon: MessageCircle, path: '전체 > 자유게시판' },
  { value: 'new-game-intro', label: '신작게임소개', icon: Sparkles,      path: '전체 > 자유게시판 > 신작게임소개' },
]

function ExpandSection({ label, icon: Icon, count, children }: {
  label: string; icon: React.ElementType; count?: number; children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-tertiary transition-colors">
        <span className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          <Icon className="w-4 h-4" />
          {label}
          {count != null && count > 0 && (
            <span className="ml-1 bg-accent text-white text-xs px-1.5 py-0.5 rounded-full">{count}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-2 border-t border-line bg-bg-secondary">{children}</div>}
    </div>
  )
}

interface WriteGame { _id: string; title: string; thumbnail?: string }

export default function CommunityWritePage() {
  const { id } = useParams<{ id?: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading } = useAuth()
  const isEdit = !!id

  const initChannel = searchParams.get('channel') || 'free'
  const initGameId  = searchParams.get('gameId') || null

  const [title, setTitle]           = useState('')
  const [content, setContent]       = useState('')
  const [channel, setChannel]       = useState(initChannel)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(initGameId)
  const [tags, setTags]             = useState<string[]>([])
  const [links, setLinks]           = useState<{ url: string; label: string }[]>([])
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [thumbnailIndex, setThumbnailIndex] = useState(0)
  const [chanSearch, setChanSearch] = useState('')
  const [chanOpen, setChanOpen]     = useState(false)
  const chanRef = useRef<HTMLDivElement>(null)
  const chanInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [tempSaving, setTempSaving] = useState(false)
  const [error, setError]           = useState('')
  const [tempSaveMsg, setTempSaveMsg] = useState('')

  const [betaGames, setBetaGames]   = useState<WriteGame[]>([])
  const [liveGames, setLiveGames]   = useState<WriteGame[]>([])
  const [expandedChan, setExpandedChan] = useState<string | null>(
    initChannel === 'beta-game' || initChannel === 'live-game' ? initChannel : null
  )

  const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:5000'

  useEffect(() => {
    gameService.getAllGames({ serviceType: 'beta', limit: 100 }).then(d => setBetaGames((d.games ?? []) as WriteGame[])).catch(() => {})
    gameService.getAllGames({ serviceType: 'live', limit: 100 }).then(d => setLiveGames((d.games ?? []) as WriteGame[])).catch(() => {})
  }, [])

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) { router.push('/login'); return }
    if (isEdit) {
      communityService.getPost(id!).then(p => {
        setTitle(p.title)
        setContent(p.content)
        const map: Record<string, string> = {
          general: 'free', dev: 'free', daily: 'free',
          'game-talk': 'free', 'info-share': 'live-game', 'new-game': 'beta-game'
        }
        const ch = map[p.channel] || p.channel
        setChannel(ch)
        if (ch === 'beta-game' || ch === 'live-game') setExpandedChan(ch)
        if (p.gameId?._id) setSelectedGameId(p.gameId._id)
        setTags(p.tags || [])
        setLinks(p.links?.map(l => ({ url: l.url, label: l.label || '' })) || [])
        if (p.images?.length) {
          setUploadedImages(p.images.map(img => img.startsWith('http') ? img : `${UPLOADS_URL}${img}`))
          setThumbnailIndex(p.thumbnailIndex || 0)
        }
      }).catch(() => router.push('/community'))
    }
  }, [id, isAuthenticated, isLoading])

  const selectChannel = (value: string) => {
    setChannel(value)
    setSelectedGameId(null)
    if (value === 'beta-game' || value === 'live-game') {
      setExpandedChan(prev => prev === value ? null : value)
    } else {
      setExpandedChan(null)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (!content || content === '<p></p>') { setError('내용을 입력해주세요'); return }
    setError(''); setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(), content, channel, tags,
        links: links.filter(l => l.url.trim()),
        images: uploadedImages,
        thumbnailIndex,
      }
      if (selectedGameId) payload.gameId = selectedGameId
      if (isEdit) {
        await communityService.updatePost(id!, payload as Parameters<typeof communityService.updatePost>[1])
        router.replace(`/community/${id}`)
      } else {
        const post = await communityService.createPost(payload as Parameters<typeof communityService.createPost>[0])
        router.replace(`/community/${post._id}`)
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message || '저장 실패')
    } finally { setSubmitting(false) }
  }

  const handleTempSave = async () => {
    setTempSaving(true); setTempSaveMsg('')
    try {
      await communityService.tempSave({ title: title.trim() || '임시저장', content, channel, tags })
      setTempSaveMsg('임시저장 완료')
    } catch { setTempSaveMsg('임시저장 실패') }
    finally { setTempSaving(false); setTimeout(() => setTempSaveMsg(''), 3000) }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chanRef.current && !chanRef.current.contains(e.target as Node)) {
        setChanOpen(false); setChanSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openChanDropdown = useCallback(() => {
    setChanOpen(true); setChanSearch('')
    setTimeout(() => chanInputRef.current?.focus(), 0)
  }, [])

  const pickChannel = (value: string, gameId?: string) => {
    selectChannel(value)
    if (gameId) setSelectedGameId(gameId)
    setChanOpen(false); setChanSearch('')
  }

  const allSearchItems = [
    ...FLAT_CHANNELS,
    ...betaGames.map(g => ({
      value: 'beta-game',
      gameId: g._id,
      label: g.title,
      icon: FlaskConical,
      path: `전체 > 베타게임 > ${g.title}`,
      thumbnail: g.thumbnail,
    })),
    ...liveGames.map(g => ({
      value: 'live-game',
      gameId: g._id,
      label: g.title,
      icon: Gamepad2,
      path: `전체 > 라이브게임 > ${g.title}`,
      thumbnail: g.thumbnail,
    })),
  ]

  const filteredChans = chanSearch.trim()
    ? allSearchItems.filter(c =>
        c.label.includes(chanSearch) || c.path.includes(chanSearch)
      )
    : allSearchItems

  const subGames: WriteGame[] = channel === 'beta-game' ? betaGames : channel === 'live-game' ? liveGames : []
  const selectedGame = subGames.find(g => g._id === selectedGameId)

  const currentPath = (() => {
    const flat = FLAT_CHANNELS.find(c => c.value === channel)
    if (!flat) return channel
    if (selectedGame) return flat.path + ' > ' + selectedGame.title
    return flat.path
  })()

  return (
    <div className="min-h-screen bg-bg-primary accent-violet community-accent">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 커뮤니티로 돌아가기
        </button>

        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── 왼쪽: 채널 사이드바 ── */}
          <aside className="w-full lg:w-52 flex-shrink-0">
            <div className="bg-bg-card border border-line rounded-2xl p-4 lg:sticky lg:top-6">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">채널 선택</p>

              <div className="space-y-0.5">
                {CHANNELS.map(ch => {
                  const Icon = ch.icon
                  const isActive = channel === ch.value
                  const hasSubGames = ch.serviceType === 'beta' || ch.serviceType === 'live'
                  const games = ch.serviceType === 'beta' ? betaGames : ch.serviceType === 'live' ? liveGames : []
                  const isExpanded = expandedChan === ch.value

                  return (
                    <div key={ch.value}>
                      <button
                        onClick={() => selectChannel(ch.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left
                          ${isActive ? 'bg-accent-light text-accent' : 'text-text-secondary hover:bg-bg-tertiary'}
                        `}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{ch.label}</span>
                        {hasSubGames && games.length > 0 && (
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </button>

                      {/* 베타/라이브 게임 하위 목록 */}
                      {hasSubGames && isExpanded && games.length > 0 && (
                        <div className="ml-3 mt-0.5 mb-1 max-h-48 overflow-y-auto space-y-0.5">
                          {games.map((game, idx) => {
                            const isLast = idx === games.length - 1
                            const isSelected = selectedGameId === game._id
                            return (
                              <div key={game._id} className="relative flex items-center" style={{ minHeight: 28 }}>
                                <div className={`absolute left-0 w-px bg-line ${isLast ? 'h-1/2 top-0' : 'h-full'}`} />
                                <div className="absolute left-0 top-1/2 w-3 h-px bg-line" />
                                <button
                                  onClick={() => setSelectedGameId(isSelected ? null : game._id)}
                                  className={`ml-4 flex-1 flex items-center gap-1.5 text-left text-xs px-2 py-1 rounded-lg truncate transition-colors ${
                                    isSelected
                                      ? 'bg-accent-light text-accent font-semibold'
                                      : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                                  }`}
                                >
                                  {game.thumbnail
                                    ? <img src={`${UPLOADS_URL}${game.thumbnail}`} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                                    : <Gamepad2 className="w-3 h-3 flex-shrink-0 opacity-50" />
                                  }
                                  <span className="truncate">{game.title}</span>
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* 정적 하위 탭 (신작게임소개) - 항상 표시 */}
                      {'subTabs' in ch && ch.subTabs && ch.subTabs.map((sub, idx) => {
                        const isLast = idx === ch.subTabs!.length - 1
                        const SubIcon = sub.icon
                        const isSubActive = channel === sub.value
                        return (
                          <div key={sub.value} className="relative flex items-center ml-3" style={{ minHeight: 28 }}>
                            <div className={`absolute left-0 w-px bg-line ${isLast ? 'h-1/2 top-0' : 'h-full'}`} />
                            <div className="absolute left-0 top-1/2 w-3 h-px bg-line" />
                            <button
                              onClick={() => { setChannel(sub.value); setSelectedGameId(null); setExpandedChan(null) }}
                              className={`ml-4 flex-1 flex items-center gap-1.5 text-left text-xs px-2 py-1 rounded-lg truncate transition-colors ${
                                isSubActive
                                  ? 'bg-accent-light text-accent font-semibold'
                                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                              }`}
                            >
                              <SubIcon className="w-3 h-3 flex-shrink-0" />
                              {sub.label}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* 선택된 게임 뱃지 */}
              {selectedGame && (
                <div className="mt-3 pt-3 border-t border-line">
                  <p className="text-xs text-text-muted mb-1.5">선택된 게임</p>
                  <div className="flex items-center gap-1.5 bg-bg-tertiary rounded-lg px-2.5 py-1.5">
                    {selectedGame.thumbnail
                      ? <img src={`${UPLOADS_URL}${selectedGame.thumbnail}`} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                      : <Gamepad2 className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    }
                    <span className="text-xs text-text-primary truncate flex-1">{selectedGame.title}</span>
                    <button onClick={() => setSelectedGameId(null)} className="text-text-muted hover:text-text-primary flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ── 오른쪽: 폼 ── */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-text-primary text-xl font-bold">{isEdit ? '게시글 수정' : '게시글 작성'}</h1>
              {!isEdit && (
                <button onClick={handleTempSave} disabled={tempSaving}
                  className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors">
                  {tempSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  임시저장
                  {tempSaveMsg && (
                    <span className={`text-xs ml-1 ${tempSaveMsg.includes('실패') ? 'text-red-400' : 'text-green-400'}`}>{tempSaveMsg}</span>
                  )}
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                <span>{error}</span>
                <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* 제목 */}
            <div className="bg-bg-card border border-line rounded-2xl px-5 py-4">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                placeholder="제목을 입력하세요"
                className="w-full bg-transparent text-text-primary text-lg font-semibold placeholder:text-text-muted focus:outline-none"
              />
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between">
                {/* 채널 검색 콤보박스 */}
                <div ref={chanRef} className="relative flex-1 mr-3">
                  {chanOpen ? (
                    <div className="flex items-center gap-1.5">
                      <Search className="w-3 h-3 text-text-muted flex-shrink-0" />
                      <input
                        ref={chanInputRef}
                        value={chanSearch}
                        onChange={e => setChanSearch(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Escape') { setChanOpen(false); setChanSearch('') }
                          if (e.key === 'Enter' && filteredChans.length > 0) {
                            const first = filteredChans[0]
                            pickChannel(first.value, 'gameId' in first ? (first.gameId as string) : undefined)
                          }
                        }}
                        placeholder="채널 검색..."
                        className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={openChanDropdown}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors group"
                    >
                      <span>{currentPath}</span>
                      <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  {/* 드롭다운 */}
                  {chanOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-56 bg-bg-card border border-line rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                      {filteredChans.length === 0 ? (
                        <p className="text-xs text-text-muted px-3 py-2">검색 결과 없음</p>
                      ) : filteredChans.map((c, idx) => {
                        const Icon = c.icon
                        const gameId = 'gameId' in c ? (c.gameId as string) : undefined
                        const thumbnail = 'thumbnail' in c ? c.thumbnail : undefined
                        const isActive = channel === c.value && (!gameId || selectedGameId === gameId)
                        return (
                          <button
                            key={`${c.value}-${gameId ?? idx}`}
                            onMouseDown={() => pickChannel(c.value, gameId)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                              isActive ? 'bg-accent-light text-accent' : 'hover:bg-bg-tertiary text-text-secondary'
                            }`}
                          >
                            {thumbnail
                              ? <img src={`${UPLOADS_URL}${thumbnail}`} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                              : <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                            }
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{c.label}</p>
                              <p className="text-[10px] text-text-muted truncate">{c.path}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <span className="text-xs text-text-muted flex-shrink-0">{title.length}/200</span>
              </div>
            </div>

            {/* 내용 */}
            <div className="bg-bg-card border border-line rounded-2xl overflow-hidden">
              <Editor
                content={content}
                onChange={setContent}
                placeholder="내용을 입력하세요..."
                onImageUpload={async (file) => {
                  const result = await communityService.uploadImages([file])
                  const raw = result.images[0]
                  const url = raw.startsWith('http') ? raw : `${UPLOADS_URL}${raw}`
                  setUploadedImages(prev => [...prev, url])
                  return url
                }}
              />
            </div>

            {/* 썸네일 선택 */}
            {uploadedImages.length > 0 && (
              <div className="bg-bg-card border border-line rounded-2xl p-4">
                <p className="flex items-center gap-1.5 text-sm font-medium text-text-secondary mb-3">
                  <Star className="w-4 h-4" />
                  썸네일 선택
                  <span className="text-xs text-text-muted font-normal">· 카드에 표시될 대표 이미지</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {uploadedImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setThumbnailIndex(i)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        thumbnailIndex === i
                          ? 'border-accent shadow-sm shadow-accent/30'
                          : 'border-line hover:border-accent/50'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {thumbnailIndex === i && (
                        <div className="absolute inset-0 bg-accent/30 flex items-center justify-center">
                          <Star className="w-4 h-4 text-white fill-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 선택 옵션들 */}
            <div className="space-y-2">
              <ExpandSection label="링크" icon={LinkIcon} count={links.length}>
                <div className="space-y-2 mt-2">
                  {links.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={l.url} onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                        placeholder="https://..."
                        className="flex-1 bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-accent" />
                      <input value={l.label} onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                        placeholder="표시 텍스트"
                        className="w-28 bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-accent" />
                      <button onClick={() => setLinks(links.filter((_, j) => j !== i))}
                        className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {links.length < 10 && (
                    <button onClick={() => setLinks([...links, { url: '', label: '' }])}
                      className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors mt-1">
                      <Plus className="w-4 h-4" /> 링크 추가
                    </button>
                  )}
                </div>
              </ExpandSection>

            </div>

            {/* 제출 */}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary py-3 rounded-xl text-sm font-semibold transition-colors">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? '수정 완료' : '게시하기'}
              </button>
              <button onClick={() => router.back()}
                className="px-6 py-3 text-sm text-text-muted border border-line rounded-xl hover:bg-bg-tertiary transition-colors">
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
