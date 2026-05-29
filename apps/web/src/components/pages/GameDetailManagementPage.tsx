'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
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
import { developerBalanceService } from '../../services/developerBalanceService'
import DeleteGameModal from '../DeleteGameModal'
import { useRouter } from 'next/navigation'

interface MediaItem { _id: string; type: 'screenshot' | 'video'; title: string; url: string; order: number; createdAt: string }
interface ShopItem { _id: string; name: string; price: number; currency: string; type: string; stock: string; sales: number; active: boolean; description: string }
interface Announcement { _id: string; title: string; createdAt: string; type: string; priority: string; content: string; sendPush: boolean; recipients: number }
type TabKey = 'edit' | 'media' | 'shop' | 'points' | 'dev-settings' | 'announcements'

interface GamePointPolicy {
  _id: string
  type: string
  label: string
  description: string
  amount: number
  multiplier: number
  dailyLimit: number | null
  startDate?: string | null
  endDate?: string | null
  estimatedDailyUsage?: number
  developerNote?: string
  conditionConfig?: Record<string, unknown> | null
  isActive: boolean
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
}

interface ApiKeyItem {
  _id: string
  name: string
  prefix: string
  isActive: boolean
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
}

interface BalanceInfo {
  _id: string
  balance: number
  totalPurchased: number
  totalUsed: number
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'edit', label: '게임정보 편집' },
  { key: 'media', label: '미디어' },
  { key: 'shop', label: '게임샵' },
  { key: 'points', label: '포인트 보상' },
  { key: 'dev-settings', label: '개발자 설정' },
  { key: 'announcements', label: '공지 & 알림' },
]

const POINT_TYPES = [
  { type: 'game_account_create', label: '게임 계정 생성', icon: UserPlus, defaultAmount: 5, description: '게임 최초 가입 시 1회 지급' },
  { type: 'game_daily_login', label: '게임 일일 접속', icon: LogIn, defaultAmount: 1, description: '게임 접속 시 1일 1회 지급' },
  { type: 'game_play_time', label: '게임 플레이 시간', icon: Timer, defaultAmount: 1, description: '플레이 시간 기반 포인트 (분 × multiplier)' },
  { type: 'game_purchase', label: '게임 결제 보상', icon: CreditCard, defaultAmount: 0, description: '결제 금액 기반 포인트 (금액 × multiplier)' },
  { type: 'game_event_participate', label: '게임 이벤트 참여', icon: Zap, defaultAmount: 3, description: '게임 이벤트 참여/완료 시 지급' },
  { type: 'game_level_achieve', label: '레벨 도달 보상', icon: Star, defaultAmount: 5, description: '특정 레벨 도달 시 1회 지급' },
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

interface GameData {
  _id: string
  title: string
  description: string
  genre: string
  status: string
  approvalStatus: string
  serviceType: string
  rating: number
  playCount: number
  testers: number
  notes?: string
  startDate?: string
  endDate?: string
  isPublic?: boolean
  thumbnail?: string
  bannerImage?: string
}

export default function GameDetailManagementPage() {
  const { id: _id } = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('edit')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [gameLoading, setGameLoading] = useState(true)

  // ── 게임정보 편집 폼 상태 ─────────────────────────────────────
  const [editTitle, setEditTitle] = useState('')
  const [editGenre, setEditGenre] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [editSaving, setEditSaving] = useState(false)
  const [iconUploading, setIconUploading] = useState(false)
  const iconInputRef = useRef<HTMLInputElement>(null)
  const [bannerUploading, setBannerUploading] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [screenshots, setScreenshots] = useState<MediaItem[]>([])
  const [videos, setVideos] = useState<MediaItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [shopLoading, setShopLoading] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)

  const [ssModal, setSsModal] = useState(false)
  const [vidModal, setVidModal] = useState(false)
  const [itemModal, setItemModal] = useState(false)
  const [editItemModal, setEditItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null)
  const [notiModal, setNotiModal] = useState(false)
  const [newSsFiles, setNewSsFiles] = useState<File[]>([])
  const [newSsPreviews, setNewSsPreviews] = useState<string[]>([])
  const ssFileRef = useRef<HTMLInputElement>(null)
  const [newVid, setNewVid] = useState({ title: '', url: '', type: 'youtube' })
  const [newItem, setNewItem] = useState({ name: '', price: '', currency: 'KRW', type: '패키지', stock: '무제한', description: '' })
  const [newNoti, setNewNoti] = useState({ title: '', content: '', type: 'notice', priority: 'normal', sendPush: false })
  const [shopSort, setShopSort] = useState<'default' | 'price_high' | 'price_low' | 'sales_high' | 'sales_low'>('default')
  const [shopPeriod, setShopPeriod] = useState<'all' | 'month' | 'last_month' | '3months'>('all')

  // ── 포인트 정책 상태 ──────────────────────────────────────────
  const [pointPolicies, setPointPolicies] = useState<GamePointPolicy[]>([])
  const [pointLoading, setPointLoading] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<{
    type: string; label: string; description: string; amount: number; multiplier: number;
    dailyLimit: number | null; startDate: string; endDate: string;
    estimatedDailyUsage: number; developerNote: string;
  } | null>(null)
  const [pointStats, setPointStats] = useState<{ stats: { type: string; totalPoints: number; count: number; uniqueUsers: number }[]; totalPoints: number; totalTransactions: number } | null>(null)

  // ── 잔액 & API Key 상태 ──────────────────────────────────────
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [apiKeyModal, setApiKeyModal] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)

  const gameId = _id as string

  useEffect(() => {
    if (!gameId) return
    setGameLoading(true)
    gameService.getGameById(gameId)
      .then(data => {
        const g = data.game as unknown as GameData
        setGameData(g)
        setEditTitle(g.title || '')
        setEditGenre(g.genre || '')
        setEditNotes(g.notes || '')
        setEditDescription(g.description || '')
        setEditStartDate(g.startDate ? g.startDate.split('T')[0] : '')
        setEditIsPublic(g.status !== 'draft' && g.status !== 'archived')
      })
      .catch(() => {})
      .finally(() => setGameLoading(false))
  }, [gameId])

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

  const loadBalance = useCallback(async () => {
    try {
      const data = await developerBalanceService.getMyBalance()
      setBalanceInfo(data.balance)
    } catch { /* ignore */ }
  }, [])

  const loadApiKeys = useCallback(async () => {
    if (!gameId) return
    try {
      const data = await gameService.getApiKeys(gameId)
      setApiKeys(data.apiKeys || [])
    } catch { /* ignore */ }
  }, [gameId])

  const loadMedia = useCallback(async () => {
    if (!gameId) return
    setMediaLoading(true)
    try {
      const data = await gameService.getGameMedia(gameId)
      const all: MediaItem[] = data.media || []
      setScreenshots(all.filter((m: MediaItem) => m.type === 'screenshot'))
      setVideos(all.filter((m: MediaItem) => m.type === 'video'))
    } catch { /* ignore */ }
    setMediaLoading(false)
  }, [gameId])

  const loadShopItems = useCallback(async (sort = 'default', period = 'all') => {
    if (!gameId) return
    setShopLoading(true)
    try {
      const data = await gameService.getGameShopItems(gameId, { sort, period })
      setShopItems(data.items || [])
    } catch { /* ignore */ }
    setShopLoading(false)
  }, [gameId])

  const loadAnnouncements = useCallback(async () => {
    if (!gameId) return
    setAnnouncementsLoading(true)
    try {
      const data = await gameService.getGameAnnouncements(gameId)
      setAnnouncements(data.announcements || [])
    } catch { /* ignore */ }
    setAnnouncementsLoading(false)
  }, [gameId])

  useEffect(() => {
    if (activeTab === 'points') {
      loadPointPolicies()
      loadPointStats()
      loadBalance()
    }
    if (activeTab === 'dev-settings') {
      loadApiKeys()
    }
    if (activeTab === 'media') {
      loadMedia()
    }
    if (activeTab === 'shop') {
      loadShopItems(shopSort, shopPeriod)
    }
    if (activeTab === 'announcements') {
      loadAnnouncements()
    }
  }, [activeTab, loadPointPolicies, loadPointStats, loadBalance, loadApiKeys, loadMedia, loadShopItems, loadAnnouncements, shopSort, shopPeriod])

  const handleCreateApiKey = async () => {
    if (!gameId || !newApiKeyName) return
    try {
      const data = await gameService.createApiKey(gameId, { name: newApiKeyName })
      setCreatedApiKey(data.fullKey)
      setNewApiKeyName('')
      loadApiKeys()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'API Key 생성에 실패했습니다'
      alert(msg)
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    if (!gameId || !confirm('이 API Key를 삭제하시겠습니까?')) return
    try {
      await gameService.deleteApiKey(gameId, keyId)
      loadApiKeys()
    } catch { alert('삭제에 실패했습니다') }
  }

  const handleToggleApiKey = async (keyId: string) => {
    if (!gameId) return
    try {
      await gameService.toggleApiKey(gameId, keyId)
      loadApiKeys()
    } catch { alert('토글에 실패했습니다') }
  }

  const handleSavePolicy = async () => {
    if (!editingPolicy || !gameId) return
    try {
      await gameService.upsertGamePointPolicy(gameId, {
        ...editingPolicy,
        startDate: editingPolicy.startDate || null,
        endDate: editingPolicy.endDate || null,
      })
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '승인 요청에 실패했습니다'
      alert(msg)
    }
  }

  const handleDeletePolicy = async (type: string) => {
    if (!gameId) return
    if (!confirm('이 정책을 삭제하시겠습니까?')) return
    try {
      await gameService.deleteGamePointPolicy(gameId, type)
      loadPointPolicies()
    } catch { alert('삭제에 실패했습니다') }
  }

  const handleTogglePolicy = async (type: string) => {
    if (!gameId) return
    try {
      await gameService.toggleGamePointPolicy(gameId, type)
      loadPointPolicies()
    } catch { alert('토글에 실패했습니다') }
  }


  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !gameId) return
    setIconUploading(true)
    try {
      const fd = new FormData()
      fd.append('thumbnail', file)
      const data = await gameService.updateGame(gameId, fd)
      setGameData(prev => prev ? { ...prev, thumbnail: (data.game as unknown as GameData).thumbnail } : prev)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '아이콘 업로드에 실패했습니다'
      alert(msg)
    }
    setIconUploading(false)
    if (iconInputRef.current) iconInputRef.current.value = ''
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !gameId) return
    setBannerUploading(true)
    try {
      const fd = new FormData()
      fd.append('bannerImage', file)
      const data = await gameService.updateGame(gameId, fd)
      setGameData(prev => prev ? { ...prev, bannerImage: (data.game as unknown as GameData).bannerImage } : prev)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '배너 업로드에 실패했습니다'
      alert(msg)
    }
    setBannerUploading(false)
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  const handleSaveGameInfo = async () => {
    if (!gameId) return
    setEditSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', editTitle.trim())
      fd.append('genre', editGenre)
      fd.append('notes', editNotes)
      fd.append('description', editDescription.trim())
      fd.append('startDate', editStartDate)
      if (!editIsPublic) fd.append('status', 'draft')
      const data = await gameService.updateGame(gameId, fd)
      setGameData(prev => prev ? { ...prev, ...(data.game as unknown as GameData) } : prev)
      alert('저장되었습니다.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '저장에 실패했습니다'
      alert(msg)
    }
    setEditSaving(false)
  }

  const handleRequestReview = async () => {
    if (!gameId) return
    if (!confirm('심사를 요청하시겠습니까?')) return
    try {
      await gameService.requestReview(gameId)
      const data = await gameService.getGameById(gameId)
      setGameData(data.game as unknown as GameData)
      alert('심사 요청이 완료되었습니다.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '심사 요청에 실패했습니다'
      alert(msg)
    }
  }

  const handleLaunchGame = async () => {
    if (!gameId || !gameData) return
    if (!confirm('게임을 출시(라이브)로 전환하시겠습니까?')) return
    try {
      const fd = new FormData()
      fd.append('serviceType', 'live')
      const data = await gameService.updateGame(gameId, fd)
      setGameData(prev => prev ? { ...prev, ...(data.game as unknown as GameData) } : prev)
      alert('게임이 출시되었습니다.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '출시 전환에 실패했습니다'
      alert(msg)
    }
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

  const addScreenshot = async () => {
    if (!gameId || newSsFiles.length === 0) return
    try {
      for (const file of newSsFiles) {
        const title = file.name.replace(/\.[^.]+$/, '')
        await gameService.addGameMedia(gameId, { type: 'screenshot', title, file })
      }
      setNewSsFiles([])
      setNewSsPreviews([])
      setSsModal(false)
      loadMedia()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '등록에 실패했습니다'
      alert(msg)
    }
  }

  const handleSsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    const remaining = 10 - screenshots.length - newSsFiles.length
    if (remaining <= 0) return
    const toAdd = selected.slice(0, remaining)
    setNewSsFiles(prev => [...prev, ...toAdd])
    toAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => setNewSsPreviews(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeSsFile = (index: number) => {
    setNewSsFiles(prev => prev.filter((_, i) => i !== index))
    setNewSsPreviews(prev => prev.filter((_, i) => i !== index))
  }
  const deleteScreenshot = async (mediaId: string) => {
    if (!gameId || !confirm('삭제하시겠습니까?')) return
    try {
      await gameService.deleteGameMedia(gameId, mediaId)
      loadMedia()
    } catch { alert('삭제에 실패했습니다') }
  }
  const addVideo = async () => {
    if (!newVid.title || !newVid.url || !gameId) return
    try {
      await gameService.addGameMedia(gameId, { type: 'video', title: newVid.title, url: newVid.url })
      setNewVid({ title: '', url: '', type: 'youtube' }); setVidModal(false)
      loadMedia()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '등록에 실패했습니다'
      alert(msg)
    }
  }
  const deleteVideo = async (mediaId: string) => {
    if (!gameId || !confirm('삭제하시겠습니까?')) return
    try {
      await gameService.deleteGameMedia(gameId, mediaId)
      loadMedia()
    } catch { alert('삭제에 실패했습니다') }
  }
  const addItem = async () => {
    if (!newItem.name || !newItem.price || !gameId) return
    try {
      await gameService.createGameShopItem(gameId, {
        name: newItem.name, price: parseInt(newItem.price),
        currency: newItem.currency, type: newItem.type,
        stock: newItem.stock, description: newItem.description,
      })
      setNewItem({ name: '', price: '', currency: 'KRW', type: '패키지', stock: '무제한', description: '' })
      setItemModal(false)
      loadShopItems(shopSort, shopPeriod)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '등록에 실패했습니다'
      alert(msg)
    }
  }
  const openEditItem = (item: ShopItem) => {
    setEditingItem({ ...item })
    setEditItemModal(true)
  }
  const saveEditItem = async () => {
    if (!editingItem || !editingItem.name || !editingItem.price || !gameId) return
    try {
      await gameService.updateGameShopItem(gameId, editingItem._id, {
        name: editingItem.name, price: editingItem.price,
        currency: editingItem.currency, type: editingItem.type,
        stock: editingItem.stock, active: editingItem.active,
      })
      setEditItemModal(false); setEditingItem(null)
      loadShopItems(shopSort, shopPeriod)
    } catch { alert('수정에 실패했습니다') }
  }
  const deleteItem = async (itemId: string) => {
    if (!gameId || !confirm('이 아이템을 삭제하시겠습니까?')) return
    try {
      await gameService.deleteGameShopItem(gameId, itemId)
      loadShopItems(shopSort, shopPeriod)
    } catch { alert('삭제에 실패했습니다') }
  }
  const sortedShopItems = shopItems
  const addAnnouncement = async () => {
    if (!newNoti.title || !newNoti.content || !gameId) return
    try {
      await gameService.createGameAnnouncement(gameId, {
        title: newNoti.title, content: newNoti.content,
        type: newNoti.type, priority: newNoti.priority, sendPush: newNoti.sendPush,
      })
      setNewNoti({ title: '', content: '', type: 'notice', priority: 'normal', sendPush: false })
      setNotiModal(false)
      loadAnnouncements()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '등록에 실패했습니다'
      alert(msg)
    }
  }
  const deleteAnnouncement = async (announcementId: string) => {
    if (!gameId || !confirm('삭제하시겠습니까?')) return
    try {
      await gameService.deleteGameAnnouncement(gameId, announcementId)
      loadAnnouncements()
    } catch { alert('삭제에 실패했습니다') }
  }

  if (gameLoading) return (
    <div className="flex items-center justify-center h-64 text-text-secondary">불러오는 중...</div>
  )

  if (!gameData) return (
    <div className="flex items-center justify-center h-64 text-text-secondary">게임을 찾을 수 없습니다.</div>
  )

  const serviceLabel: Record<string, string> = { beta: '베타', live: '라이브', ended: '종료' }
  const approvalLabel: Record<string, string> = { not_submitted: '미제출', pending: '심사대기', review: '검토중', approved: '승인됨', rejected: '반려' }

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/games-management">
          <button className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors mb-2">
            <ChevronLeft className="w-4 h-4" /> 게임 목록
          </button>
        </Link>
        <div className="flex items-end gap-3">
          <h1 className="text-3xl font-bold">{gameData.title}</h1>
          <div className="flex items-center gap-2 pb-1">
            <span className="text-xs px-2 py-1 rounded-full bg-accent-light text-accent border border-accent-muted">
              {serviceLabel[gameData.serviceType] || gameData.serviceType}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-bg-tertiary text-text-secondary border border-line">
              {approvalLabel[gameData.approvalStatus] || gameData.approvalStatus}
            </span>
          </div>
        </div>
        {gameData.rating > 0 && (
          <span className="flex items-center gap-1 text-text-secondary text-sm mt-0.5">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{gameData.rating.toFixed(1)}
          </span>
        )}
      </div>


      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === t.key ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleRequestReview}
            disabled={gameData.approvalStatus === 'pending' || gameData.approvalStatus === 'review' || gameData.approvalStatus === 'approved'}
            className="flex items-center gap-2 px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-text-primary rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" /> 심사 등록
          </button>
          <button
            onClick={handleLaunchGame}
            disabled={gameData.serviceType === 'live'}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Globe className="w-4 h-4" /> {gameData.serviceType === 'live' ? '출시됨' : '게임 출시'}
          </button>
        </div>
      </div>

      {activeTab === 'announcements' && (
        <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><h2 className="text-xl font-bold">공지사항 및 푸시 알림</h2><p className="text-sm text-text-secondary mt-1">테스터들에게 중요한 소식을 전달하세요</p></div>
            <button onClick={() => setNotiModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
              <Megaphone className="w-4 h-4" /> 공지 작성
            </button>
          </div>
          {announcementsLoading ? (
            <div className="text-center py-8 text-text-secondary">불러오는 중...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">등록된 공지사항이 없습니다</div>
          ) : announcements.map(a => (
            <div key={a._id} className="p-4 bg-bg-tertiary/30 rounded-lg border border-line flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  {a.priority === 'high' && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/50">긴급</span>}
                  {a.sendPush && <span className="text-xs px-1.5 py-0.5 rounded bg-accent-light text-accent border border-accent-muted flex items-center gap-1"><Check className="w-3 h-3" />발송완료</span>}
                </div>
                <p className="text-sm text-text-secondary mb-1">{a.content}</p>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                  {a.sendPush && <><span>•</span><span className="flex items-center gap-1"><Bell className="w-3 h-3" />{a.recipients.toLocaleString()}명에게 발송</span></>}
                </div>
              </div>
              <button onClick={() => deleteAnnouncement(a._id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold mb-3">알림 통계</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-sm text-text-secondary mb-1">총 공지</p><p className="text-2xl font-bold">{announcements.length}</p></div>
              <div><p className="text-sm text-text-secondary mb-1">푸시 발송</p><p className="text-2xl font-bold text-accent">{announcements.filter(a => a.sendPush).length}</p></div>
              <div><p className="text-sm text-text-secondary mb-1">도달률</p><p className="text-2xl font-bold text-blue-400">98.5%</p></div>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6 items-start">
            {/* 히어로 배너 - 왼쪽 */}
            <div className="bg-bg-secondary border border-line rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold">히어로 배너</h2>
                  <p className="text-xs text-text-secondary mt-0.5">게임 상세 페이지 상단 배너</p>
                </div>
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-md text-xs transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" /> {bannerUploading ? '업로드 중...' : '업로드'}
                </button>
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleBannerUpload}
              />
              <div
                className="relative w-full aspect-video bg-bg-tertiary rounded-lg border-2 border-dashed border-line overflow-hidden cursor-pointer hover:border-accent transition-colors"
                onClick={() => bannerInputRef.current?.click()}
              >
                {gameData.bannerImage ? (
                  <>
                    <img
                      src={gameData.bannerImage.startsWith('/uploads/') ? gameData.bannerImage : `/uploads/banners/${gameData.bannerImage.split('/').pop()}`}
                      alt="히어로 배너"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <p className="text-white text-xs font-medium">클릭하여 변경</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-text-muted gap-1.5">
                    <ImageIcon className="w-8 h-8 opacity-30" />
                    <p className="text-xs">클릭하여 업로드</p>
                    <p className="text-xs opacity-50">1920×640px 권장</p>
                  </div>
                )}
              </div>
            </div>

            {/* 스크린샷 - 오른쪽 */}
            <div className="col-span-2 bg-bg-secondary border border-line rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-xl font-bold">게임 스크린샷</h2><p className="text-sm text-text-secondary mt-1">최대 10개</p></div>
              <button onClick={() => setSsModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
                <Upload className="w-4 h-4" /> 스크린샷 추가
              </button>
            </div>
            {mediaLoading ? (
              <div className="text-center py-8 text-text-secondary">불러오는 중...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {screenshots.map(ss => (
                  <div key={ss._id} className="relative group aspect-video bg-bg-tertiary/50 rounded-lg border border-line overflow-hidden">
                    {ss.url ? (
                      <img src={ss.url} alt={ss.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full text-text-muted">
                        <ImageIcon className="w-10 h-10 opacity-30 mb-1" />
                        <p className="text-xs">{ss.title}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white font-medium truncate">{ss.title}</p>
                    </div>
                    <button onClick={() => deleteScreenshot(ss._id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/80 text-white rounded-md transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {screenshots.length === 0 && [0, 1, 2].map(i => (
                  <div key={i} className="aspect-video border-2 border-dashed border-line rounded-lg flex flex-col items-center justify-center text-text-muted bg-bg-tertiary/20">
                    <ImageIcon className="w-8 h-8 mb-1.5 opacity-25" />
                    <p className="text-xs opacity-50">스크린샷 {i + 1}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary">권장 해상도: 1920x1080px / PNG, JPG (각 최대 5MB)</p>
            </div>
          </div>
          </div>{/* grid end */}
          <div className="bg-bg-secondary border border-line rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div><h2 className="text-xl font-bold">게임 플레이 동영상</h2><p className="text-sm text-text-secondary mt-1">최대 5개</p></div>
              <button onClick={() => setVidModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
                <Plus className="w-4 h-4" /> 동영상 추가
              </button>
            </div>
            {mediaLoading ? (
              <div className="text-center py-8 text-text-secondary">불러오는 중...</div>
            ) : (
              <div className="space-y-4">
                {videos.map(v => (
                  <div key={v._id} className="p-4 bg-bg-tertiary/30 rounded-lg border border-line flex items-start gap-4">
                    <div className="w-40 aspect-video bg-bg-tertiary rounded-lg border-2 border-dashed border-line flex items-center justify-center flex-shrink-0">
                      <Play className="w-10 h-10 text-text-muted" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{v.title}</h3>
                      <p className="text-sm text-text-secondary mb-2">{v.url}</p>
                      <p className="text-xs text-text-muted">{new Date(v.createdAt).toLocaleDateString()} 등록</p>
                    </div>
                    <button onClick={() => deleteVideo(v._id)} className="p-1.5 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {videos.length === 0 && (
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-line rounded-lg text-text-muted bg-bg-tertiary/20">
                    <div className="w-32 aspect-video border border-line rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-tertiary/30">
                      <Film className="w-7 h-7 opacity-25" />
                    </div>
                    <div>
                      <p className="text-sm">등록된 동영상이 없습니다</p>
                      <p className="text-xs mt-0.5 opacity-60">YouTube URL 또는 직접 업로드로 추가해보세요</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'shop' && (
        <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div><h2 className="text-xl font-bold">게임샵 아이템 관리</h2><p className="text-sm text-text-secondary mt-1">인앱 결제 아이템과 가격을 설정하세요</p></div>
            <button onClick={() => setItemModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
              <ShoppingBag className="w-4 h-4" /> 아이템 추가
            </button>
          </div>

          {/* 정렬 & 기간 필터 */}
          <div className="flex flex-wrap gap-3 p-3 bg-bg-tertiary/30 border border-line rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary whitespace-nowrap">기간</span>
              <select value={shopPeriod} onChange={e => setShopPeriod(e.target.value as typeof shopPeriod)} className="px-2 py-1.5 bg-bg-tertiary border border-line rounded text-xs focus:outline-none focus:border-accent">
                <option value="all">전체</option>
                <option value="month">이번 달</option>
                <option value="last_month">지난 달</option>
                <option value="3months">최근 3개월</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary whitespace-nowrap">정렬</span>
              <select value={shopSort} onChange={e => setShopSort(e.target.value as typeof shopSort)} className="px-2 py-1.5 bg-bg-tertiary border border-line rounded text-xs focus:outline-none focus:border-accent">
                <option value="default">기본순</option>
                <option value="price_high">가격 높은순</option>
                <option value="price_low">가격 낮은순</option>
                <option value="sales_high">누적판매 많은순</option>
                <option value="sales_low">누적판매 적은순</option>
              </select>
            </div>
            <span className="text-xs text-text-muted self-center">총 {shopItems.length}개 아이템</span>
          </div>

          {shopLoading ? (
            <div className="text-center py-10 text-text-secondary">불러오는 중...</div>
          ) : sortedShopItems.length === 0 ? (
            <div className="text-center py-10 text-text-muted text-sm">등록된 아이템이 없습니다</div>
          ) : sortedShopItems.map(item => (
            <div key={item._id} className="p-4 bg-bg-tertiary/30 rounded-lg border border-line flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{item.name}</h3>
                    <span className="text-xs px-2 py-0.5 border border-line rounded-full">{item.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${item.active ? 'bg-accent-light text-accent border-accent-muted' : 'bg-bg-muted/20 text-text-secondary border-line/50'}`}>{item.active ? '판매중' : '비활성'}</span>
                  </div>
                  <p className="text-lg font-bold text-accent flex items-center gap-1 mb-1"><DollarSign className="w-4 h-4" />{item.price.toLocaleString()} {item.currency}</p>
                  <p className="text-sm text-text-secondary">재고: {item.stock} · 누적판매: <strong>{item.sales.toLocaleString()}</strong>개</p>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={item.active} onChange={async () => {
                      await gameService.updateGameShopItem(gameId, item._id, { active: !item.active }).catch(() => {})
                      loadShopItems(shopSort, shopPeriod)
                    }} className="w-4 h-4 accent-green-500" />
                    <span className="text-xs text-text-secondary">판매 활성화</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditItem(item)} className="p-1.5 border border-line rounded-md hover:bg-bg-tertiary transition-colors" title="편집">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => deleteItem(item._id)} className="p-1.5 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/10 transition-colors" title="삭제">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold mb-3">판매 통계 ({shopPeriod === 'all' ? '전체' : shopPeriod === 'month' ? '이번 달' : shopPeriod === 'last_month' ? '지난 달' : '최근 3개월'})</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-sm text-text-secondary mb-1">총 판매액</p><p className="text-2xl font-bold text-accent">₩{shopItems.reduce((s, i) => s + i.price * i.sales, 0).toLocaleString()}</p></div>
              <div><p className="text-sm text-text-secondary mb-1">누적 판매수량</p><p className="text-2xl font-bold">{shopItems.reduce((s, i) => s + i.sales, 0).toLocaleString()}개</p></div>
              <div><p className="text-sm text-text-secondary mb-1">활성 아이템</p><p className="text-2xl font-bold">{shopItems.filter(i => i.active).length} / {shopItems.length}</p></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'points' && (
        <div className="space-y-6">
          {/* 잔액 & 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {balanceInfo && (
              <div className="bg-bg-secondary border border-accent/30 rounded-lg p-4">
                <p className="text-sm text-text-secondary mb-1">포인트 잔액</p>
                <p className="text-2xl font-bold text-accent">{balanceInfo.balance.toLocaleString()}P</p>
                <p className="text-xs text-text-muted mt-1">충전: {balanceInfo.totalPurchased.toLocaleString()} / 사용: {balanceInfo.totalUsed.toLocaleString()}</p>
              </div>
            )}
            {pointStats && (
              <>
                <div className="bg-bg-secondary border border-line rounded-lg p-4">
                  <p className="text-sm text-text-secondary mb-1">총 지급 포인트</p>
                  <p className="text-2xl font-bold text-accent">{pointStats.totalPoints?.toLocaleString() || 0}P</p>
                </div>
                <div className="bg-bg-secondary border border-line rounded-lg p-4">
                  <p className="text-sm text-text-secondary mb-1">총 지급 건수</p>
                  <p className="text-2xl font-bold">{pointStats.totalTransactions?.toLocaleString() || 0}</p>
                </div>
              </>
            )}
            <div className="bg-bg-secondary border border-line rounded-lg p-4">
              <p className="text-sm text-text-secondary mb-1">활성 정책</p>
              <p className="text-2xl font-bold">{pointPolicies.filter(p => p.approvalStatus === 'approved' && p.isActive).length} / {POINT_TYPES.length}</p>
            </div>
          </div>

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
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">시작일</label>
                                <input type="date" value={editingPolicy.startDate} onChange={e => setEditingPolicy(p => p ? { ...p, startDate: e.target.value } : null)} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">종료일</label>
                                <input type="date" value={editingPolicy.endDate} onChange={e => setEditingPolicy(p => p ? { ...p, endDate: e.target.value } : null)} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">예상 일일 사용량</label>
                                <input type="number" value={editingPolicy.estimatedDailyUsage || ''} placeholder="0" onChange={e => setEditingPolicy(p => p ? { ...p, estimatedDailyUsage: Number(e.target.value) } : null)} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">개발사 메모</label>
                                <input value={editingPolicy.developerNote} placeholder="관리자에게 전달할 메모" onChange={e => setEditingPolicy(p => p ? { ...p, developerNote: e.target.value } : null)} className={inputCls} />
                              </div>
                              <div className="col-span-2 md:col-span-4 flex gap-2">
                                <button onClick={handleSavePolicy} className="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded text-sm transition-colors">저장</button>
                                <button onClick={() => setEditingPolicy(null)} className="px-3 py-1.5 border border-line rounded text-sm hover:bg-bg-tertiary transition-colors">취소</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 text-sm flex-wrap">
                              {existing ? (
                                <>
                                  <span className="text-text-secondary">기본: <strong>{existing.amount}P</strong></span>
                                  {existing.multiplier !== 1 && <span className="text-text-secondary">배율: <strong>×{existing.multiplier}</strong></span>}
                                  {existing.dailyLimit && <span className="text-text-secondary">일일 한도: <strong>{existing.dailyLimit}P</strong></span>}
                                  {existing.startDate && <span className="text-text-muted">시작: {new Date(existing.startDate).toLocaleDateString()}</span>}
                                  {existing.endDate && <span className="text-text-muted">종료: {new Date(existing.endDate).toLocaleDateString()}</span>}
                                </>
                              ) : (
                                <span className="text-text-muted">미설정</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {existing?.approvalStatus === 'approved' && (
                            <button
                              onClick={() => handleTogglePolicy(pt.type)}
                              className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${existing.isActive ? 'border-green-500/50 text-green-400 hover:bg-green-500/10' : 'border-gray-500/50 text-gray-400 hover:bg-gray-500/10'}`}
                            >
                              {existing.isActive ? 'ON' : 'OFF'}
                            </button>
                          )}
                          <button
                            onClick={() => setEditingPolicy({
                              type: pt.type,
                              label: existing?.label || pt.label,
                              description: existing?.description || pt.description,
                              amount: existing?.amount ?? pt.defaultAmount,
                              multiplier: existing?.multiplier ?? 1,
                              dailyLimit: existing?.dailyLimit ?? null,
                              startDate: existing?.startDate ? new Date(existing.startDate).toISOString().split('T')[0] : '',
                              endDate: existing?.endDate ? new Date(existing.endDate).toISOString().split('T')[0] : '',
                              estimatedDailyUsage: existing?.estimatedDailyUsage ?? 0,
                              developerNote: existing?.developerNote ?? '',
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

      {/* 개발자 설정 탭 */}
      {activeTab === 'dev-settings' && (
        <div className="space-y-6">
          {/* API Key 관리 */}
          <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" /> API Key 관리</h2>
                <p className="text-sm text-text-secondary mt-1">게임 서버에서 포인트 지급 API를 호출할 때 사용하는 인증 키입니다</p>
              </div>
              <button onClick={() => { setApiKeyModal(true); setCreatedApiKey(null) }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition-colors">
                <Plus className="w-4 h-4" /> API Key 생성
              </button>
            </div>
            {apiKeys.length > 0 ? (
              <div className="space-y-2">
                {apiKeys.map(key => (
                  <div key={key._id} className="flex items-center justify-between p-3 bg-bg-tertiary/30 rounded-lg border border-line">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${key.isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                      <div>
                        <p className="text-sm font-medium">{key.name}</p>
                        <p className="text-xs text-text-muted font-mono">{key.prefix}****</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {key.lastUsedAt && <span className="text-xs text-text-muted">마지막 사용: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                      <button onClick={() => handleToggleApiKey(key._id)} className={`px-2 py-1 text-xs rounded border ${key.isActive ? 'border-green-500/50 text-green-400' : 'border-gray-500/50 text-gray-400'}`}>
                        {key.isActive ? '활성' : '비활성'}
                      </button>
                      <button onClick={() => handleDeleteApiKey(key._id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-text-muted text-sm">생성된 API Key가 없습니다</div>
            )}
          </div>

          {/* API 연동 가이드 */}
          <div className="bg-bg-secondary border border-line rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" /> API 연동 가이드</h2>
            <p className="text-sm text-text-secondary mb-4">승인된 포인트 정책이 활성화되면, 게임 서버에서 아래 API를 호출하여 포인트를 지급할 수 있습니다.</p>
            <div className="bg-bg-tertiary rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <p className="text-text-muted mb-2">// 포인트 지급 요청</p>
              <p><span className="text-green-400">POST</span> /api/game-points/grant</p>
              <p className="text-yellow-400 mt-1">Headers: x-api-key: gup_xxxxxxxx_xxxxxxxxxx...</p>
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
        </div>
      )}

      {/* 게임정보 편집 탭 (기본 정보 + 고급 편집 통합) */}
      {activeTab === 'edit' && (
        <div className="space-y-6">
          <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">게임정보 편집</h2>
                <p className="text-sm text-text-secondary mt-1">게임 제목, 장르, 설명 등 기본 정보를 수정하세요.</p>
              </div>
              <button
                onClick={handleSaveGameInfo}
                disabled={editSaving}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {editSaving ? '저장 중...' : '저장'}
              </button>
            </div>

            {/* 아이콘(좌) + 게임 제목·장르(우) */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <label className={`${labelCls} self-start`}>게임 아이콘</label>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleIconUpload}
                />
                <div
                  className="w-32 h-32 bg-bg-tertiary rounded-lg border-2 border-dashed border-line flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent transition-colors"
                  onClick={() => iconInputRef.current?.click()}
                >
                  {gameData.thumbnail
                    ? <img src={
                        gameData.thumbnail.startsWith('http')
                          ? gameData.thumbnail
                          : gameData.thumbnail.startsWith('/uploads/')
                            ? gameData.thumbnail
                            : `/uploads/thumbnails/${gameData.thumbnail.split('/').pop()}`
                      } alt="아이콘" className="w-full h-full object-cover" />
                    : <div className="text-center text-text-muted"><ImageIcon className="w-12 h-12 mx-auto mb-1 opacity-50" /><p className="text-xs">512 × 512</p></div>
                  }
                </div>
                <button
                  onClick={() => iconInputRef.current?.click()}
                  disabled={iconUploading}
                  className="flex items-center gap-2 px-3 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" /> {iconUploading ? '업로드 중...' : '아이콘 업로드'}
                </button>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label className={labelCls}>게임 제목 *</label>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>게임 장르 *</label>
                  <select value={editGenre} onChange={e => setEditGenre(e.target.value)} className={inputCls}>
                    <option value="">장르 선택</option>
                    {['rpg','action','fps','moba','strategy','simulation','adventure','racing','horror','sports'].map(v => (
                      <option key={v} value={v}>{v.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 하단 전체폭 필드 */}
            <div>
              <label className={labelCls}>게임 설명 *</label>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className={`${inputCls} min-h-32 resize-y`} />
            </div>
            <div>
              <label className={labelCls}>짧은 설명 * <span className="text-text-muted">(최대 100자)</span></label>
              <input value={editDescription} onChange={e => setEditDescription(e.target.value)} maxLength={100} className={inputCls} />
            </div>
            <hr className="border-line" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><Calendar className="w-4 h-4 inline mr-1" />출시 예정일</label>
                <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}><Globe className="w-4 h-4 inline mr-1" />공개 여부</label>
                <div className="flex items-center gap-3 mt-2">
                  <input type="checkbox" checked={editIsPublic} onChange={e => setEditIsPublic(e.target.checked)} id="public" className="w-4 h-4 accent-green-500" />
                  <label htmlFor="public" className="text-sm text-text-secondary">베타존에 게임 공개</label>
                </div>
              </div>
            </div>
          </div>

          {/* 고급 편집 (전체 편집 페이지 링크) */}
          <div className="bg-bg-secondary border border-line rounded-lg p-6">
            <h3 className="font-semibold mb-1 flex items-center gap-2"><Edit className="w-4 h-4 text-accent" />고급 편집</h3>
            <p className="text-sm text-text-secondary mb-4">썸네일, 게임 파일 업로드, 베타 테스트 설정, 수익 모델 등 전체 편집 기능을 사용할 수 있습니다.</p>
            <Link href={`/games-management/${_id}/edit`}>
              <button className="flex items-center gap-2 px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-text-primary rounded-md text-sm font-semibold transition-colors">
                <Edit className="w-4 h-4" /> 전체 편집 페이지로 이동
              </button>
            </Link>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" /> 게임 영구 삭제
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && typeof _id === 'string' && (
        <DeleteGameModal
          gameId={_id}
          gameTitle={gameData.title}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => router.push('/games-management')}
        />
      )}

      <Modal open={ssModal} onClose={() => { setSsModal(false); setNewSsFiles([]); setNewSsPreviews([]) }} title="스크린샷 추가">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>이미지 (PNG, JPG, WEBP / 최대 5MB)</label>
              <span className="text-xs text-text-muted">{screenshots.length + newSsFiles.length} / 10</span>
            </div>
            <input ref={ssFileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleSsFileChange} />
            {newSsPreviews.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {newSsPreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-line group">
                    <img src={preview} alt={`미리보기 ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeSsFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                    <p className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black/50 px-1 py-0.5 truncate">{newSsFiles[i]?.name}</p>
                  </div>
                ))}
                {screenshots.length + newSsFiles.length < 10 && (
                  <div
                    className="aspect-video rounded-lg border-2 border-dashed border-line hover:border-accent cursor-pointer flex flex-col items-center justify-center gap-1 text-text-muted transition-colors"
                    onClick={() => ssFileRef.current?.click()}
                  >
                    <Plus className="w-5 h-5 opacity-50" />
                    <span className="text-xs opacity-60">추가</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-line rounded-lg cursor-pointer hover:border-accent transition-colors flex flex-col items-center justify-center gap-2 text-text-muted py-10"
                onClick={() => ssFileRef.current?.click()}
              >
                <Upload className="w-8 h-8 opacity-40" />
                <p className="text-sm">클릭하여 이미지 선택 (여러 장 가능)</p>
                <p className="text-xs opacity-60">권장 해상도: 1920×1080px · 최대 {10 - screenshots.length}장 추가 가능</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setSsModal(false); setNewSsFiles([]); setNewSsPreviews([]) }} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
            <button onClick={addScreenshot} disabled={newSsFiles.length === 0} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-sm">
              {newSsFiles.length > 0 ? `${newSsFiles.length}장 업로드` : '추가'}
            </button>
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

      <Modal open={editItemModal} onClose={() => { setEditItemModal(false); setEditingItem(null) }} title="아이템 편집">
        {editingItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>아이템명 *</label><input value={editingItem.name} onChange={e => setEditingItem(p => p ? { ...p, name: e.target.value } : null)} className={inputCls} /></div>
              <div>
                <label className={labelCls}>카테고리 *</label>
                <select value={editingItem.type} onChange={e => setEditingItem(p => p ? { ...p, type: e.target.value } : null)} className={inputCls}>
                  {['패키지','외형','재화','소모품'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={labelCls}>가격 *</label><input type="number" value={editingItem.price} onChange={e => setEditingItem(p => p ? { ...p, price: Number(e.target.value) } : null)} className={inputCls} /></div>
              <div>
                <label className={labelCls}>통화</label>
                <select value={editingItem.currency} onChange={e => setEditingItem(p => p ? { ...p, currency: e.target.value } : null)} className={inputCls}>
                  <option value="KRW">KRW</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
              </div>
              <div><label className={labelCls}>재고</label><input value={editingItem.stock} onChange={e => setEditingItem(p => p ? { ...p, stock: e.target.value } : null)} className={inputCls} /></div>
            </div>
            <div>
              <label className={labelCls}>판매 상태</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="checkbox" checked={editingItem.active} onChange={e => setEditingItem(p => p ? { ...p, active: e.target.checked } : null)} className="w-4 h-4 accent-green-500" />
                <span className="text-sm text-text-secondary">판매 활성화</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setEditItemModal(false); setEditingItem(null) }} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
              <button onClick={saveEditItem} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm">저장</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={apiKeyModal} onClose={() => { setApiKeyModal(false); setCreatedApiKey(null) }} title="API Key 생성">
        <div className="space-y-4">
          {createdApiKey ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm font-semibold text-green-400 mb-2">API Key가 생성되었습니다!</p>
                <p className="text-xs text-text-secondary mb-2">이 키는 다시 표시되지 않으니 안전한 곳에 저장하세요.</p>
                <div className="bg-bg-tertiary p-3 rounded font-mono text-sm break-all select-all">{createdApiKey}</div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => { setApiKeyModal(false); setCreatedApiKey(null) }} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm">확인</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Key 이름 *</label>
                <input placeholder="예: 프로덕션 서버" value={newApiKeyName} onChange={e => setNewApiKeyName(e.target.value)} className={inputCls} />
              </div>
              <p className="text-xs text-text-muted">게임당 최대 5개의 API Key를 생성할 수 있습니다.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setApiKeyModal(false)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
                <button onClick={handleCreateApiKey} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm">생성</button>
              </div>
            </div>
          )}
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
                <span className="text-sm text-blue-400">{(gameData.testers || 0).toLocaleString()}명의 테스터에게 알림이 전송됩니다</span>
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