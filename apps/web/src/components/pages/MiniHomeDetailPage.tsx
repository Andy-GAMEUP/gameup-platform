'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import minihomeService, { MiniHome, MiniHomeGame, MiniHomeNews, Proposal } from '@/services/minihomeService'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/useAuth'
import {
  Loader2, ExternalLink, Plus, Trash2, Edit2, Check, X,
  Gamepad2, Newspaper, TrendingUp, Globe, Building2
} from 'lucide-react'
import ProposalModal from '@/components/ProposalModal'

const TABS = [
  { id: 'game-news', label: '게임 뉴스' },
  { id: 'company-news', label: '회사 뉴스' },
  { id: 'investment', label: '투자 제안' },
  { id: 'publishing', label: '퍼블리싱 제안' },
]

const GENRES = ['RPG', '액션', '퍼즐', '시뮬레이션', '전략', '기타']

export default function MiniHomeDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { user } = useAuth()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('game-news')
  const [showProposal, setShowProposal] = useState(false)
  const [showAddGame, setShowAddGame] = useState(false)
  const [showNewsForm, setShowNewsForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['minihomeDetail', id],
    queryFn: () => minihomeService.getDetail(id),
    enabled: !!id,
  })

  const minihome = data?.minihome
  const games = data?.games ?? []
  const isOwner = user && minihome && user.id === minihome.userId._id

  const { data: newsData, isLoading: loadingNews } = useQuery({
    queryKey: ['minihomeNews', id, activeTab],
    queryFn: () => minihomeService.getNews(id, {
      type: activeTab === 'game-news' ? 'game' : activeTab === 'company-news' ? 'company' : undefined,
    }),
    enabled: !!id && (activeTab === 'game-news' || activeTab === 'company-news'),
  })

  const { data: proposalData, isLoading: loadingProposals } = useQuery({
    queryKey: ['minihomeProposals', id, activeTab],
    queryFn: () => minihomeService.getMyProposals({ type: activeTab === 'investment' ? 'investment' : 'publishing' }),
    enabled: !!id && !!isOwner && (activeTab === 'investment' || activeTab === 'publishing'),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (!minihome) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-400">미니홈을 찾을 수 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <div
        className="relative h-52 bg-gradient-to-br from-slate-800 to-slate-900"
        style={minihome.coverImage ? { backgroundImage: `url(${minihome.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <div className="relative -mt-16 mb-6 flex items-end gap-5">
          <div className="relative z-10">
            {minihome.profileImage ? (
              <img src={minihome.profileImage} alt={minihome.companyName}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-[#0a0a0f] shadow-xl" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-red-600/20 border-4 border-[#0a0a0f] flex items-center justify-center shadow-xl">
                <Building2 className="w-10 h-10 text-red-400" />
              </div>
            )}
          </div>
          <div className="relative z-10 pb-2 flex-1 min-w-0">
            <h1 className="text-white text-2xl font-bold">{minihome.companyName}</h1>
            <p className="text-slate-400 text-sm">{minihome.userId?.username}</p>
          </div>
          <div className="relative z-10 pb-2 flex gap-2">
            {!isOwner && user?.role === 'developer' && (
              <button onClick={() => setShowProposal(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                <TrendingUp className="w-4 h-4" /> 제안 보내기
              </button>
            )}
            {isOwner && (
              <>
                <button onClick={() => setShowAddGame(true)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-sm transition-colors border border-slate-700">
                  <Gamepad2 className="w-4 h-4" /> 게임 관리
                </button>
                <button onClick={() => setShowNewsForm(true)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-sm transition-colors border border-slate-700">
                  <Plus className="w-4 h-4" /> 뉴스 작성
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">{minihome.introduction}</p>
          <div className="flex flex-wrap items-center gap-3">
            {minihome.website && (
              <a href={minihome.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
                <Globe className="w-4 h-4" /> {minihome.website}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {minihome.tags.map(tag => (
              <span key={tag} className="bg-red-600/20 text-red-400 border border-red-500/30 text-xs px-2.5 py-1 rounded-full">{tag}</span>
            ))}
            {minihome.keywords.map(kw => (
              <span key={kw} className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded border border-slate-700">{kw}</span>
            ))}
          </div>
        </div>

        {games.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-semibold text-sm mb-3">게임 포트폴리오</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {games.map(game => (
                <GameCard key={game._id} game={game} isOwner={!!isOwner} onRefresh={() => qc.invalidateQueries({ queryKey: ['minihomeDetail', id] })} />
              ))}
            </div>
          </div>
        )}

        {isOwner && showAddGame && (
          <AddGameForm
            onClose={() => setShowAddGame(false)}
            onSuccess={() => { setShowAddGame(false); qc.invalidateQueries({ queryKey: ['minihomeDetail', id] }) }}
          />
        )}

        {isOwner && showNewsForm && (
          <AddNewsForm
            onClose={() => setShowNewsForm(false)}
            onSuccess={() => { setShowNewsForm(false); qc.invalidateQueries({ queryKey: ['minihomeNews', id, activeTab] }) }}
          />
        )}

        <div className="border-b border-slate-800 mb-6">
          <div className="flex gap-0">
            {TABS.map(tab => {
              if ((tab.id === 'investment' || tab.id === 'publishing') && !isOwner) return null
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="pb-12">
          {(activeTab === 'game-news' || activeTab === 'company-news') && (
            loadingNews ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : (newsData?.news ?? []).length === 0 ? (
              <div className="text-center py-12">
                <Newspaper className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">등록된 뉴스가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(newsData?.news ?? []).map(news => (
                  <NewsItem key={news._id} news={news} />
                ))}
              </div>
            )
          )}

          {(activeTab === 'investment' || activeTab === 'publishing') && isOwner && (
            loadingProposals ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : (proposalData?.proposals ?? []).length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">받은 제안이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(proposalData?.proposals ?? []).map(proposal => (
                  <ProposalItem
                    key={proposal._id}
                    proposal={proposal}
                    onRefresh={() => qc.invalidateQueries({ queryKey: ['minihomeProposals', id, activeTab] })}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {showProposal && (
        <ProposalModal
          isOpen={showProposal}
          onClose={() => setShowProposal(false)}
          minihomeId={minihome._id}
          games={games}
        />
      )}
    </div>
  )
}

function GameCard({ game, isOwner, onRefresh }: { game: MiniHomeGame; isOwner: boolean; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`"${game.title}" 게임을 삭제하시겠습니까?`)) return
    setDeleting(true)
    try {
      await minihomeService.removeGame(game._id)
      onRefresh()
    } catch {
    } finally {
      setDeleting(false)
    }
  }

  const handleSetRepresentative = async () => {
    try {
      await minihomeService.setRepresentative(game._id)
      onRefresh()
    } catch {
    }
  }

  return (
    <div className="flex-shrink-0 w-44 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group">
      {game.coverUrl ? (
        <img src={game.coverUrl} alt={game.title} className="w-full h-24 object-cover" />
      ) : (
        <div className="w-full h-24 bg-slate-800 flex items-center justify-center">
          <Gamepad2 className="w-8 h-8 text-slate-600" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {game.iconUrl && <img src={game.iconUrl} alt="" className="w-6 h-6 rounded object-cover" />}
          <p className="text-white text-xs font-semibold truncate flex-1">{game.title}</p>
        </div>
        <p className="text-slate-500 text-xs mb-1">{game.genre}</p>
        <p className="text-slate-400 text-xs line-clamp-2">{game.description}</p>
        {game.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {game.platforms.map(p => (
              <span key={p} className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{p}</span>
            ))}
          </div>
        )}
        {isOwner && (
          <div className="flex gap-1 mt-2">
            <button onClick={handleSetRepresentative} title="대표 게임으로 설정"
              className="flex-1 text-xs py-1 bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-400 rounded transition-colors border border-slate-700">
              대표
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="p-1 text-red-400 hover:text-red-300 disabled:opacity-30 transition-colors">
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AddGameForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('RPG')
  const [description, setDescription] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [screenshots, setScreenshots] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await minihomeService.addGame({
        title, genre, description,
        iconUrl: iconUrl || undefined,
        coverUrl: coverUrl || undefined,
        screenshots: screenshots ? screenshots.split(',').map(s => s.trim()).filter(Boolean) : [],
        platforms,
      })
      onSuccess()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">게임 추가</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="게임 이름 *"
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 transition-colors" />
      <select value={genre} onChange={e => setGenre(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 transition-colors">
        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="게임 설명"
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-red-500 transition-colors" />
      <input value={iconUrl} onChange={e => setIconUrl(e.target.value)} placeholder="아이콘 URL"
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 transition-colors" />
      <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="커버 이미지 URL"
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 transition-colors" />
      <input value={screenshots} onChange={e => setScreenshots(e.target.value)} placeholder="스크린샷 URL (쉼표로 구분)"
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 transition-colors" />
      <div className="flex gap-3">
        {['iOS', 'Android', 'PC'].map(p => (
          <label key={p} className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={platforms.includes(p)} onChange={() => togglePlatform(p)} className="w-3.5 h-3.5 accent-red-500" />
            <span className="text-slate-300 text-xs">{p}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">취소</button>
        <button onClick={handleSubmit} disabled={saving || !title.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} 추가
        </button>
      </div>
    </div>
  )
}

function AddNewsForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [type, setType] = useState<'game' | 'company'>('game')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    try {
      await minihomeService.createNews({ type, title, content })
      onSuccess()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">뉴스 작성</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex gap-2">
        {(['game', 'company'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${type === t ? 'bg-red-600/20 border-red-500/40 text-red-300' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
            {t === 'game' ? '게임 뉴스' : '회사 뉴스'}
          </button>
        ))}
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 *"
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-500 transition-colors" />
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="내용 *"
        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-red-500 transition-colors" />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">취소</button>
        <button onClick={handleSubmit} disabled={saving || !title.trim() || !content.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} 등록
        </button>
      </div>
    </div>
  )
}

function NewsItem({ news }: { news: MiniHomeNews }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs px-2 py-0.5 rounded ${news.type === 'game' ? 'bg-blue-600/20 text-blue-400' : 'bg-green-600/20 text-green-400'}`}>
              {news.type === 'game' ? '게임' : '회사'}
            </span>
            <p className="text-white font-semibold text-sm">{news.title}</p>
          </div>
          <p className={`text-slate-400 text-sm leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>{news.content}</p>
          {news.content.length > 120 && (
            <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-300 text-xs mt-1 transition-colors">
              {expanded ? '접기' : '더 보기'}
            </button>
          )}
        </div>
        <p className="text-slate-500 text-xs flex-shrink-0">{new Date(news.createdAt).toLocaleDateString('ko-KR')}</p>
      </div>
    </div>
  )
}

function ProposalItem({ proposal, onRefresh }: { proposal: Proposal; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleStatus = async (status: 'accepted' | 'rejected') => {
    setLoading(true)
    try {
      await minihomeService.updateProposalStatus(proposal._id, { status })
      onRefresh()
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const statusMap = {
    pending: { label: '검토중', cls: 'bg-yellow-600/20 text-yellow-300' },
    accepted: { label: '수락됨', cls: 'bg-green-600/20 text-green-300' },
    rejected: { label: '거절됨', cls: 'bg-red-600/20 text-red-300' },
  }
  const st = statusMap[proposal.status]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
            <p className="text-white font-semibold text-sm">{proposal.title}</p>
          </div>
          <p className="text-slate-400 text-xs mb-1">보낸 사람: {proposal.fromUserId?.username}</p>
          {proposal.gameId && (
            <p className="text-slate-400 text-xs">대상 게임: {proposal.gameId.title}</p>
          )}
          <p className="text-slate-400 text-sm mt-2 leading-relaxed line-clamp-3">{proposal.content}</p>
        </div>
        <p className="text-slate-500 text-xs flex-shrink-0">{new Date(proposal.createdAt).toLocaleDateString('ko-KR')}</p>
      </div>
      {proposal.status === 'pending' && (
        <div className="flex gap-2">
          <button onClick={() => handleStatus('accepted')} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700/30 hover:bg-green-700/50 text-green-300 text-xs rounded-lg border border-green-700/40 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} 수락
          </button>
          <button onClick={() => handleStatus('rejected')} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700/30 hover:bg-red-700/50 text-red-300 text-xs rounded-lg border border-red-700/40 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} 거절
          </button>
        </div>
      )}
    </div>
  )
}
