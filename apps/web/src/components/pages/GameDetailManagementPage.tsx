'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ChevronLeft, Star, Users, MessageSquare, Download, Eye,
  Calendar, Globe, Upload, Image as ImageIcon, Film,
  Trash2, Save, AlertCircle, Plus, Edit, Bell, ShoppingBag,
  DollarSign, Package, Megaphone, Play, Clock, Send, Check,
  Gift, Shield, Zap, Trophy, CreditCard, UserPlus, LogIn, Timer,
} from 'lucide-react'

import { gameService } from '../../services/gameService'

interface Screenshot { id: number; title: string }
interface Video { id: number; title: string; url: string; duration: string; views: number }
interface ShopItem { id: number; name: string; price: number; currency: string; type: string; stock: string; sales: number; active: boolean }
interface Announcement { id: number; title: string; date: string; type: string; priority: string; content: string; sent: boolean; recipients: number }
type TabKey = 'announcements' | 'overview' | 'media' | 'shop' | 'points'

interface GamePointPolicy {
  _id: string
  type: string
  label: string
  description: string
  amount: number
  multiplier: number
  dailyLimit: number | null
  isActive: boolean
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'announcements', label: '공지 & 알림' },
  { key: 'overview', label: '기본 정보' },
  { key: 'media', label: '미디어' },
  { key: 'shop', label: '게임샵' },
  { key: 'points', label: '포인트 보상' },
]

const POINT_TYPES = [
  { type: 'game_account_create', label: '게임 계정 생성', icon: UserPlus, defaultAmount: 5, description: '게임 최초 가입 시 1회 지급' },
  { type: 'game_daily_login', label: '게임 일일 접속', icon: LogIn, defaultAmount: 1, description: '게임 접속 시 1일 1회 지급' },
  { type: 'game_play_time', label: '게임 플레이 시간', icon: Timer, defaultAmount: 1, description: '플레이 시간 기반 포인트 (분 × multiplier)' },
  { type: 'game_purchase', label: '게임 결제 보상', icon: CreditCard, defaultAmount: 0, description: '결제 금액 기반 포인트 (금액 × multiplier)' },
  { type: 'game_event_participate', label: '게임 이벤트 참여', icon: Zap, defaultAmount: 3, description: '게임 이벤트 참여/완료 시 지급' },
  { type: 'game_ranking', label: '게임 랭킹 보상', icon: Trophy, defaultAmount: 10, description: '랭킹 달성 시 보상 포인트' },
]

const inputCls = 'w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent'
const labelCls = 'block text-sm text-text-secondary mb-1'

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay" onClick={onClose}>
      <div className="bg-bg-secondary border border-line rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function GameDetailManagementPage() {
  const { id: _id } = useParams()
  const [activeTab, setActiveTab] = useState<TabKey>('announcements')
  const [screenshots, setScreenshots] = useState<Screenshot[]>([
    { id: 1, title: '메인 화면' }, { id: 2, title: '전투 장면' }, { id: 3, title: '도시 풍경' },
  ])
  const [videos, setVideos] = useState<Video[]>([
    { id: 1, title: '공식 트레일러', url: 'https://youtube.com/watch?v=example1', duration: '2:45', views: 15420 },
    { id: 2, title: '게임플레이 영상', url: 'https://youtube.com/watch?v=example2', duration: '10:30', views: 8932 },
  ])
  const [shopItems, setShopItems] = useState<ShopItem[]>([
    { id: 1, name: '스타터 팩', price: 9900, currency: 'KRW', type: '패키지', stock: '무제한', sales: 450, active: true },
    { id: 2, name: '프리미엄 스킨', price: 4900, currency: 'KRW', type: '외형', stock: '무제한', sales: 892, active: true },
    { id: 3, name: '골드 1000개', price: 2900, currency: 'KRW', type: '재화', stock: '무제한', sales: 1240, active: true },
  ])
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    { id: 1, title: '긴급 점검 안내', date: '2024.02.10', type: '점검', priority: 'high', content: '서버 안정화를 위한 긴급 점검이 예정되어 있습니다.', sent: true, recipients: 2450 },
    { id: 2, title: '신규 콘텐츠 업데이트', date: '2024.02.08', type: '업데이트', priority: 'normal', content: '새로운 던전과 아이템이 추가됩니다.', sent: true, recipients: 2450 },
  ])

  const [ssModal, setSsModal] = useState(false)
  const [vidModal, setVidModal] = useState(false)
  const [itemModal, setItemModal] = useState(false)
  const [notiModal, setNotiModal] = useState(false)
  const [newSs, setNewSs] = useState({ title: '' })
  const [newVid, setNewVid] = useState({ title: '', url: '', type: 'youtube' })
  const [newItem, setNewItem] = useState({ name: '', price: '', currency: 'KRW', type: '패키지', stock: '무제한', description: '' })
  const [newNoti, setNewNoti] = useState({ title: '', content: '', type: 'notice', priority: 'normal', sendPush: false })

  // ── 포인트 정책 상태 ──────────────────────────────────────────
  const [pointPolicies, setPointPolicies] = useState<GamePointPolicy[]>([])
  const [pointLoading, setPointLoading] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<{ type: string; label: string; description: string; amount: number; multiplier: number; dailyLimit: number | null } | null>(null)
  const [pointStats, setPointStats] = useState<{ stats: { type: string; totalPoints: number; count: number; uniqueUsers: number }[]; totalPoints: number; totalTransactions: number } | null>(null)

  const gameId = _id as string

  const loadPointPolicies = useCallback(async () => {
    if (!gameId) return
    setPointLoading(true)
    try {
      const data = await gameService.getGamePointPolicies(gameId)
      setPointPolicies(data.policies || [])
    } catch { /* ignore */ }
    setPointLoading(false)
  }, [gameId])

  const loadPointStats = useCallback(async () => {
    if (!gameId) return
    try {
      const data = await gameService.getGamePointStats(gameId)
      setPointStats(data)
    } catch { /* ignore */ }
  }, [gameId])

  useEffect(() => {
    if (activeTab === 'points') {
      loadPointPolicies()
      loadPointStats()
    }
  }, [activeTab, loadPointPolicies, loadPointStats])

  const handleSavePolicy = async () => {
    if (!editingPolicy || !gameId) return
    try {
      await gameService.upsertGamePointPolicy(gameId, editingPolicy)
      setEditingPolicy(null)
      loadPointPolicies()
    } catch { alert('정책 저장에 실패했습니다') }
  }

  const handleSubmitForApproval = async () => {
    if (!gameId) return
    if (!confirm('포인트 정책 승인을 요청하시겠습니까?')) return
    try {
      await gameService.submitPointPolicies(gameId)
      loadPointPolicies()
      alert('승인 요청이 제출되었습니다')
    } catch { alert('승인 요청에 실패했습니다') }
  }

  const handleDeletePolicy = async (type: string) => {
    if (!gameId) return
    if (!confirm('이 정책을 삭제하시겠습니까?')) return
    try {
      await gameService.deleteGamePointPolicy(gameId, type)
      loadPointPolicies()
    } catch { alert('삭제에 실패했습니다') }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '초안' },
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '승인 대기' },
      approved: { bg: 'bg-accent-light', text: 'text-accent', label: '승인됨' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: '거절됨' },
    }
    const s = map[status] || map.draft
    return <span className={`text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.text} border border-current/30`}>{s.label}</span>
  }

  const game = { title: 'Cyber Nexus', description: '사이버펑크 세계를 배경으로 한 액션 RPG', genre: 'RPG', status: '진행중', rating: 4.8, testers: 2450 }

  const addScreenshot = () => {
    if (!newSs.title) return
    setScreenshots(p => [...p, { id: Date.now(), title: newSs.title }])
    setNewSs({ title: '' }); setSsModal(false)
  }
  const addVideo = () => {
    if (!newVid.title || !newVid.url) return
    setVideos(p => [...p, { id: Date.now(), title: newVid.title, url: newVid.url, duration: '0:00', views: 0 }])
    setNewVid({ title: '', url: '', type: 'youtube' }); setVidModal(false)
  }
  const addItem = () => {
    if (!newItem.name || !newItem.price) return
    setShopItems(p => [...p, { id: Date.now(), name: newItem.name, price: parseInt(newItem.price), currency: newItem.currency, type: newItem.type, stock: newItem.stock, sales: 0, active: true }])
    setNewItem({ name: '', price: '', currency: 'KRW', type: '패키지', stock: '무제한', description: '' }); setItemModal(false)
  }
  const addAnnouncement = () => {
    if (!newNoti.title || !newNoti.content) return
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '.')
    setAnnouncements(p => [...p, { id: Date.now(), title: newNoti.title, content: newNoti.content, type: newNoti.type, priority: newNoti.priority, date: today, sent: newNoti.sendPush, recipients: newNoti.sendPush ? game.testers : 0 }])
    setNewNoti({ title: '', content: '', type: 'notice', priority: 'normal', sendPush: false }); setNotiModal(false)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/games-management">
            <button className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors">
              <ChevronLeft className="w-4 h-4" /> 게임 목록
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-1">{game.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-full bg-accent-light text-accent border border-accent-muted">{game.status}</span>
              <span className="flex items-center gap-1 text-text-secondary text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{game.rating}
              </span>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
          <Save className="w-4 h-4" /> 변경사항 저장
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '테스터', value: game.testers.toLocaleString(), icon: <Users className="w-5 h-5" />, color: 'text-blue-400' },
          { label: '다운로드', value: '892', icon: <Download className="w-5 h-5" />, color: 'text-accent' },
          { label: '피드백', value: '342', icon: <MessageSquare className="w-5 h-5" />, color: 'text-purple-400' },
          { label: '조회수', value: '15,420', icon: <Eye className="w-5 h-5" />, color: 'text-orange-400' },
        ].map((s, i) => (
          <div key={i} className="bg-bg-secondary border border-line rounded-lg p-6 flex items-center gap-3">
            <span className={s.color}>{s.icon}</span>
            <div><div className="text-2xl font-bold">{s.value}</div><div className="text-sm text-text-secondary">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === t.key ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'announcements' && (
        <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="text-xl font-bold">공지사항 및 푸시 알림</h2><p className="text-sm text-text-secondary mt-1">테스터들에게 중요한 소식을 전달하세요</p></div>
            <button onClick={() => setNotiModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
              <Megaphone className="w-4 h-4" /> 공지 작성
            </button>
          </div>
          {announcements.map(a => (
            <div key={a.id} className="p-4 bg-bg-tertiary/30 rounded-lg border border-line flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  {a.priority === 'high' && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/50">긴급</span>}
                  {a.sent && <span className="text-xs px-1.5 py-0.5 rounded bg-accent-light text-accent border border-accent-muted flex items-center gap-1"><Check className="w-3 h-3" />발송완료</span>}
                </div>
                <p className="text-sm text-text-secondary mb-1">{a.content}</p>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span>{a.date}</span>
                  {a.sent && <><span>•</span><span className="flex items-center gap-1"><Bell className="w-3 h-3" />{a.recipients.toLocaleString()}명에게 발송</span></>}
                </div>
              </div>
              <button onClick={() => setAnnouncements(p => p.filter(x => x.id !== a.id))} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold mb-3">알림 통계</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-sm text-text-secondary mb-1">총 공지</p><p className="text-2xl font-bold">{announcements.length}</p></div>
              <div><p className="text-sm text-text-secondary mb-1">푸시 발송</p><p className="text-2xl font-bold text-accent">{announcements.filter(a => a.sent).length}</p></div>
              <div><p className="text-sm text-text-secondary mb-1">도달률</p><p className="text-2xl font-bold text-blue-400">98.5%</p></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-bold">게임 기본 정보</h2>
          <div>
            <label className={labelCls}>게임 아이콘</label>
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 bg-bg-tertiary rounded-lg border-2 border-dashed border-line flex items-center justify-center">
                <div className="text-center text-text-muted"><ImageIcon className="w-12 h-12 mx-auto mb-1 opacity-50" /><p className="text-xs">512x512</p></div>
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary transition-colors mt-2">
                <Upload className="w-4 h-4" /> 아이콘 업로드
              </button>
            </div>
          </div>
          <hr className="border-line" />
          <div><label className={labelCls}>게임 제목 *</label><input defaultValue={game.title} className={inputCls} /></div>
          <div>
            <label className={labelCls}>게임 장르 *</label>
            <select defaultValue="rpg" className={inputCls}>
              {['rpg','action','fps','moba','strategy','simulation','adventure','racing','horror','sports'].map(v => (
                <option key={v} value={v}>{v.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div><label className={labelCls}>게임 특징 소개 *</label><textarea defaultValue="• 압도적인 사이버펑크 그래픽" className={`${inputCls} min-h-32 resize-y`} /></div>
          <div><label className={labelCls}>짧은 설명 *</label><input defaultValue={game.description} maxLength={100} className={inputCls} /></div>
          <hr className="border-line" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelCls}><Calendar className="w-4 h-4 inline mr-1" />출시 예정일</label><input type="date" defaultValue="2024-06-15" className={inputCls} /></div>
            <div>
              <label className={labelCls}><Globe className="w-4 h-4 inline mr-1" />공개 여부</label>
              <div className="flex items-center gap-3 mt-2">
                <input type="checkbox" defaultChecked id="public" className="w-4 h-4 accent-green-500" />
                <label htmlFor="public" className="text-sm text-text-secondary">베타존에 게임 공개</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-bg-secondary border border-line rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-xl font-bold">게임 스크린샷</h2><p className="text-sm text-text-secondary mt-1">최대 10개</p></div>
              <button onClick={() => setSsModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
                <Upload className="w-4 h-4" /> 스크린샷 추가
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screenshots.map(ss => (
                <div key={ss.id} className="relative group aspect-video bg-bg-tertiary/50 rounded-lg border-2 border-line flex items-center justify-center">
                  <div className="text-center text-text-muted"><ImageIcon className="w-10 h-10 mx-auto mb-1 opacity-50" /><p className="text-sm">{ss.title}</p></div>
                  <button onClick={() => setScreenshots(p => p.filter(x => x.id !== ss.id))} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-md transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary">권장 해상도: 1920x1080px / PNG, JPG (각 최대 5MB)</p>
            </div>
          </div>
          <div className="bg-bg-secondary border border-line rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-xl font-bold">게임 플레이 동영상</h2><p className="text-sm text-text-secondary mt-1">최대 5개</p></div>
              <button onClick={() => setVidModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
                <Plus className="w-4 h-4" /> 동영상 추가
              </button>
            </div>
            <div className="space-y-4">
              {videos.map(v => (
                <div key={v.id} className="p-4 bg-bg-tertiary/30 rounded-lg border border-line flex items-start gap-4">
                  <div className="w-40 aspect-video bg-bg-tertiary rounded-lg border-2 border-dashed border-line flex items-center justify-center flex-shrink-0">
                    <Play className="w-10 h-10 text-text-muted" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{v.title}</h3>
                    <p className="text-sm text-text-secondary mb-2">{v.url}</p>
                    <div className="flex items-center gap-4 text-sm text-text-muted">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{v.duration}</span>
                      <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{v.views.toLocaleString()} 조회</span>
                    </div>
                  </div>
                  <button onClick={() => setVideos(p => p.filter(x => x.id !== v.id))} className="p-1.5 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shop' && (
        <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="text-xl font-bold">게임샵 아이템 관리</h2><p className="text-sm text-text-secondary mt-1">인앱 결제 아이템과 가격을 설정하세요</p></div>
            <button onClick={() => setItemModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
              <ShoppingBag className="w-4 h-4" /> 아이템 추가
            </button>
          </div>
          {shopItems.map(item => (
            <div key={item.id} className="p-4 bg-bg-tertiary/30 rounded-lg border border-line flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <span className="text-xs px-2 py-0.5 border border-line rounded-full">{item.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${item.active ? 'bg-accent-light text-accent border-accent-muted' : 'bg-bg-muted/20 text-text-secondary border-line/50'}`}>{item.active ? '판매중' : '비활성'}</span>
                  </div>
                  <p className="text-lg font-bold text-accent flex items-center gap-1 mb-1"><DollarSign className="w-4 h-4" />{item.price.toLocaleString()} {item.currency}</p>
                  <p className="text-sm text-text-secondary">재고: {item.stock} · 판매: {item.sales}개</p>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={item.active} onChange={() => setShopItems(p => p.map(x => x.id === item.id ? { ...x, active: !x.active } : x))} className="w-4 h-4 accent-green-500" />
                    <span className="text-xs text-text-secondary">판매 활성화</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 border border-line rounded-md hover:bg-bg-tertiary"><Edit className="w-4 h-4" /></button>
                <button onClick={() => setShopItems(p => p.filter(x => x.id !== item.id))} className="p-1.5 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold mb-3">판매 통계 (이번 달)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-sm text-text-secondary mb-1">총 판매액</p><p className="text-2xl font-bold text-accent">₩{shopItems.reduce((s, i) => s + i.price * i.sales, 0).toLocaleString()}</p></div>
              <div><p className="text-sm text-text-secondary mb-1">판매 건수</p><p className="text-2xl font-bold">{shopItems.reduce((s, i) => s + i.sales, 0).toLocaleString()}</p></div>
              <div><p className="text-sm text-text-secondary mb-1">활성 아이템</p><p className="text-2xl font-bold">{shopItems.filter(i => i.active).length} / {shopItems.length}</p></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'points' && (
        <div className="space-y-6">
          {/* 포인트 통계 */}
          {pointStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-bg-secondary border border-line rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-1">총 지급 포인트</p>
                <p className="text-2xl font-bold text-accent">{pointStats.totalPoints?.toLocaleString() || 0}P</p>
              </div>
              <div className="bg-bg-secondary border border-line rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-1">총 지급 건수</p>
                <p className="text-2xl font-bold">{pointStats.totalTransactions?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-bg-secondary border border-line rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-1">활성 정책</p>
                <p className="text-2xl font-bold">{pointPolicies.filter(p => p.approvalStatus === 'approved' && p.isActive).length} / {POINT_TYPES.length}</p>
              </div>
            </div>
          )}

          {/* 정책 설정 */}
          <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><Gift className="w-5 h-5 text-accent" /> 포인트 보상 정책</h2>
                <p className="text-sm text-text-secondary mt-1">게임과 연동하여 플레이어에게 플랫폼 포인트를 지급할 수 있습니다</p>
              </div>
              {pointPolicies.some(p => p.approvalStatus === 'draft' || p.approvalStatus === 'rejected') && (
                <button onClick={handleSubmitForApproval} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
                  <Send className="w-4 h-4" /> 승인 요청
                </button>
              )}
            </div>

            {pointLoading ? (
              <div className="text-center py-8 text-text-secondary">로딩 중...</div>
            ) : (
              <div className="space-y-3">
                {POINT_TYPES.map(pt => {
                  const existing = pointPolicies.find(p => p.type === pt.type)
                  const Icon = pt.icon
                  const isEditing = editingPolicy?.type === pt.type

                  return (
                    <div key={pt.type} className="p-4 bg-bg-tertiary/30 rounded-lg border border-line">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">{pt.label}</h3>
                            {existing && getStatusBadge(existing.approvalStatus)}
                            {existing?.isActive && existing.approvalStatus === 'approved' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">활성</span>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary mb-2">{pt.description}</p>

                          {existing?.rejectionReason && (
                            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400 mb-2">
                              거절 사유: {existing.rejectionReason}
                            </div>
                          )}

                          {isEditing ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">기본 포인트</label>
                                <input type="number" value={editingPolicy.amount} onChange={e => setEditingPolicy(p => p ? { ...p, amount: Number(e.target.value) } : null)} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">배율</label>
                                <input type="number" step="0.01" value={editingPolicy.multiplier} onChange={e => setEditingPolicy(p => p ? { ...p, multiplier: Number(e.target.value) } : null)} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">일일 한도</label>
                                <input type="number" value={editingPolicy.dailyLimit ?? ''} placeholder="무제한" onChange={e => setEditingPolicy(p => p ? { ...p, dailyLimit: e.target.value ? Number(e.target.value) : null } : null)} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">설명</label>
                                <input value={editingPolicy.description} onChange={e => setEditingPolicy(p => p ? { ...p, description: e.target.value } : null)} className={inputCls} />
                              </div>
                              <div className="col-span-2 md:col-span-4 flex gap-2">
                                <button onClick={handleSavePolicy} className="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded text-sm transition-colors">저장</button>
                                <button onClick={() => setEditingPolicy(null)} className="px-3 py-1.5 border border-line rounded text-sm hover:bg-bg-tertiary transition-colors">취소</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 text-sm">
                              {existing ? (
                                <>
                                  <span className="text-text-secondary">기본: <strong>{existing.amount}P</strong></span>
                                  {existing.multiplier !== 1 && <span className="text-text-secondary">배율: <strong>×{existing.multiplier}</strong></span>}
                                  {existing.dailyLimit && <span className="text-text-secondary">일일 한도: <strong>{existing.dailyLimit}P</strong></span>}
                                </>
                              ) : (
                                <span className="text-text-muted">미설정</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingPolicy({
                              type: pt.type,
                              label: existing?.label || pt.label,
                              description: existing?.description || pt.description,
                              amount: existing?.amount ?? pt.defaultAmount,
                              multiplier: existing?.multiplier ?? 1,
                              dailyLimit: existing?.dailyLimit ?? null,
                            })}
                            className="p-1.5 border border-line rounded-md hover:bg-bg-tertiary transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {existing && (existing.approvalStatus === 'draft' || existing.approvalStatus === 'rejected') && (
                            <button onClick={() => handleDeletePolicy(pt.type)} className="p-1.5 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* API 연동 가이드 */}
          <div className="bg-bg-secondary border border-line rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" /> API 연동 가이드</h2>
            <p className="text-sm text-text-secondary mb-4">승인된 포인트 정책이 활성화되면, 게임 서버에서 아래 API를 호출하여 포인트를 지급할 수 있습니다.</p>
            <div className="bg-bg-tertiary rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <p className="text-text-muted mb-2">// 포인트 지급 요청</p>
              <p><span className="text-green-400">POST</span> /api/game-points/grant</p>
              <p className="text-text-muted mt-2">{'{'}</p>
              <p className="text-text-secondary pl-4">{`"gameId": "${gameId}",`}</p>
              <p className="text-text-secondary pl-4">{`"userId": "플레이어_ID",`}</p>
              <p className="text-text-secondary pl-4">{`"type": "game_daily_login",`}</p>
              <p className="text-text-secondary pl-4">{`"metadata": { "minutes": 60 }`}</p>
              <p className="text-text-muted">{'}'}</p>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="font-semibold text-sm mb-1">단건 지급</h4>
                <p className="text-xs text-text-secondary">POST /api/game-points/grant</p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="font-semibold text-sm mb-1">일괄 지급 (최대 100건)</h4>
                <p className="text-xs text-text-secondary">POST /api/game-points/batch-grant</p>
              </div>
            </div>
          </div>

          {/* 포인트 타입별 통계 */}
          {pointStats && pointStats.stats.length > 0 && (
            <div className="bg-bg-secondary border border-line rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">포인트 타입별 통계</h2>
              <div className="space-y-3">
                {pointStats.stats.map(s => {
                  const pt = POINT_TYPES.find(p => p.type === s.type)
                  return (
                    <div key={s.type} className="flex items-center justify-between p-3 bg-bg-tertiary/30 rounded-lg border border-line">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{pt?.label || s.type}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-text-secondary">{s.count.toLocaleString()}건</span>
                        <span className="text-text-secondary">{s.uniqueUsers.toLocaleString()}명</span>
                        <span className="font-bold text-accent">{s.totalPoints.toLocaleString()}P</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={ssModal} onClose={() => setSsModal(false)} title="스크린샷 추가">
        <div className="space-y-4">
          <div><label className={labelCls}>제목</label><input placeholder="예: 메인 화면" value={newSs.title} onChange={e => setNewSs({ title: e.target.value })} className={inputCls} /></div>
          <div className="border-2 border-dashed border-line rounded-lg p-8 text-center cursor-pointer hover:border-line">
            <Upload className="w-10 h-10 mx-auto mb-2 text-text-secondary" /><p className="text-sm text-text-secondary">클릭하여 이미지 업로드</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setSsModal(false)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
            <button onClick={addScreenshot} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm">추가</button>
          </div>
        </div>
      </Modal>

      <Modal open={vidModal} onClose={() => setVidModal(false)} title="동영상 추가">
        <div className="space-y-4">
          <div><label className={labelCls}>제목</label><input placeholder="예: 공식 트레일러" value={newVid.title} onChange={e => setNewVid(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
          <div>
            <label className={labelCls}>타입</label>
            <select value={newVid.type} onChange={e => setNewVid(p => ({ ...p, type: e.target.value }))} className={inputCls}>
              <option value="youtube">YouTube</option><option value="upload">직접 업로드</option>
            </select>
          </div>
          {newVid.type === 'youtube'
            ? <div><label className={labelCls}>YouTube URL</label><input placeholder="https://youtube.com/watch?v=..." value={newVid.url} onChange={e => setNewVid(p => ({ ...p, url: e.target.value }))} className={inputCls} /></div>
            : <div className="border-2 border-dashed border-line rounded-lg p-8 text-center"><Film className="w-10 h-10 mx-auto mb-2 text-text-secondary" /><p className="text-sm text-text-secondary">MP4 (최대 100MB)</p></div>
          }
          <div className="flex justify-end gap-3">
            <button onClick={() => setVidModal(false)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
            <button onClick={addVideo} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm">추가</button>
          </div>
        </div>
      </Modal>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title="새 아이템 등록">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>아이템명 *</label><input placeholder="예: 프리미엄 패스" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} className={inputCls} /></div>
            <div>
              <label className={labelCls}>카테고리 *</label>
              <select value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                {['패키지','외형','재화','소모품'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelCls}>가격 *</label><input type="number" placeholder="9900" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} className={inputCls} /></div>
            <div>
              <label className={labelCls}>통화</label>
              <select value={newItem.currency} onChange={e => setNewItem(p => ({ ...p, currency: e.target.value }))} className={inputCls}>
                <option value="KRW">KRW</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
            <div><label className={labelCls}>재고</label><input placeholder="무제한" value={newItem.stock} onChange={e => setNewItem(p => ({ ...p, stock: e.target.value }))} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>설명</label><textarea placeholder="아이템 상세 설명" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} className={`${inputCls} min-h-20 resize-y`} /></div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setItemModal(false)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
            <button onClick={addItem} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm">등록</button>
          </div>
        </div>
      </Modal>

      <Modal open={notiModal} onClose={() => setNotiModal(false)} title="새 공지사항 작성">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>공지 유형 *</label>
              <select value={newNoti.type} onChange={e => setNewNoti(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                <option value="notice">일반 공지</option><option value="update">업데이트</option>
                <option value="maintenance">점검</option><option value="event">이벤트</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>우선순위 *</label>
              <select value={newNoti.priority} onChange={e => setNewNoti(p => ({ ...p, priority: e.target.value }))} className={inputCls}>
                <option value="high">긴급</option><option value="normal">일반</option><option value="low">낮음</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>제목 *</label><input placeholder="공지사항 제목" value={newNoti.title} onChange={e => setNewNoti(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>내용 *</label><textarea placeholder="공지사항 내용을 입력하세요" value={newNoti.content} onChange={e => setNewNoti(p => ({ ...p, content: e.target.value }))} className={`${inputCls} min-h-28 resize-y`} /></div>
          <div className="p-4 bg-bg-tertiary/50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <input type="checkbox" id="sendPush" checked={newNoti.sendPush} onChange={e => setNewNoti(p => ({ ...p, sendPush: e.target.checked }))} className="w-4 h-4 accent-green-500" />
              <label htmlFor="sendPush" className="text-sm font-semibold">푸시 알림 전송</label>
            </div>
            {newNoti.sendPush && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">{game.testers.toLocaleString()}명의 테스터에게 알림이 전송됩니다</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setNotiModal(false)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
            <button onClick={addAnnouncement} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm">
              <Send className="w-4 h-4" />{newNoti.sendPush ? '발송 및 등록' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}