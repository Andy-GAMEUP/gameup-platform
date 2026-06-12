'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import {
  ChevronLeft, ChevronDown, Star, Users, MessageSquare, Download, Eye,
  Globe, Upload, Image as ImageIcon, Film,
  Trash2, Save, AlertCircle, Plus, Edit, Bell, ShoppingBag,
  DollarSign, Package, Megaphone, Play, Clock, Send, Check,
  Gift, Shield, Zap, Trophy, CreditCard, UserPlus, LogIn, Timer, Settings, BarChart2,
} from 'lucide-react'

import { gameService } from '../../services/gameService'
import { developerBalanceService } from '../../services/developerBalanceService'
import DeleteGameModal from '../DeleteGameModal'
import GracRatingBadge from '../GracRatingBadge'
import RequestReviewButton from '../RequestReviewButton'
import { RatingClass } from '@gameup/types'
import { useRouter } from 'next/navigation'
import { FORM_GENRES } from '@/constants/game'

interface MediaItem { _id: string; type: 'screenshot' | 'video'; title: string; url: string; order: number; createdAt: string }
interface ShopItem { _id: string; name: string; price: number; currency: string; type: string; currencyType: string; currencyAmount: number; bonusAmount: number; stock: string; sales: number; active: boolean; description: string; imageUrl: string; sortOrder: number; itemId?: string; isSpecial?: boolean; specialImageUrl?: string; country?: string }
interface Announcement { _id: string; title: string; createdAt: string; type: string; priority: string; content: string; sendPush: boolean; recipients: number }
type TabKey = 'main-settings' | 'edit' | 'media' | 'shop' | 'points' | 'dev-settings' | 'announcements'

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
  { key: 'edit', label: '기본 정보' },
  { key: 'media', label: '미디어' },
  { key: 'shop', label: '상품 등록' },
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
const COUNTRY_CURRENCY: Record<string, string> = { KR: 'KRW', US: 'USD', JP: 'JPY', CN: 'CNY', EU: 'EUR', ALL: 'KRW' }

// KRW 기준 환율 기본값 (API 실패 시 fallback)
const DEFAULT_KRW_TO: Record<string, number> = { KRW: 1, USD: 0.000725, JPY: 0.108, CNY: 0.00526, EUR: 0.000667 }
const EXCHANGE_CACHE_KEY = 'gameup_exchange_rates'
const EXCHANGE_CACHE_DAYS = 30

const COUNTRY_INFO: { code: string; name: string; currency: string; symbol: string; decimals: number }[] = [
  { code: 'KR', name: '한국', currency: 'KRW', symbol: '₩', decimals: 0 },
  { code: 'US', name: '미국', currency: 'USD', symbol: '$', decimals: 2 },
  { code: 'JP', name: '일본', currency: 'JPY', symbol: '¥', decimals: 0 },
  { code: 'CN', name: '중국', currency: 'CNY', symbol: '¥', decimals: 2 },
  { code: 'EU', name: '유럽', currency: 'EUR', symbol: '€', decimals: 2 },
]

function calcPriceList(price: string, baseCurrency: string, rates: Record<string, number>) {
  const amount = parseFloat(price)
  if (!amount || isNaN(amount)) return []
  const krw = baseCurrency === 'KRW' ? amount : amount / rates[baseCurrency]
  return COUNTRY_INFO.map(c => {
    const converted = krw * rates[c.currency]
    return { ...c, price: parseFloat(converted.toFixed(c.decimals)) }
  })
}

function Modal({ open, onClose, title, children, disableBackdropClose = false, size = 'md', showCloseButton = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; disableBackdropClose?: boolean; size?: 'md' | 'lg' | 'xl'; showCloseButton?: boolean }) {
  if (!open) return null
  const maxW = size === 'xl' ? 'max-w-[36rem]' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay" onClick={disableBackdropClose ? undefined : onClose}>
      <div className={`bg-bg-secondary border border-line rounded-xl p-6 w-full ${maxW} mx-4 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          {showCloseButton && <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
        </div>
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
  maxTesters?: number
  testType?: string
  requirements?: string
  website?: string
  discord?: string
  isPublic?: boolean
  thumbnail?: string
  bannerImage?: string
  suspendedAt?: string
  shopCurrencyIconUrl?: string
  shopCurrencyName?: string
  shopCurrencyNames?: Record<string, string>
  monetization?: string
  publishedSnapshot?: Record<string, unknown>
  ratingCertificate?: {
    ratingClass?: string
    certNumber?: string
    certDate?: string
    isVerified?: boolean
  }
}

export default function GameDetailManagementPage() {
  const { id: _id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const adminView = searchParams.get('adminView') === '1'
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
  const [editEndDate, setEditEndDate] = useState('')
  const [editMaxTesters, setEditMaxTesters] = useState('')
  const [editTestType, setEditTestType] = useState('')
  const [editRequirements, setEditRequirements] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editDiscord, setEditDiscord] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [editSaving, setEditSaving] = useState(false)
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null)
  const [pendingIconPreview, setPendingIconPreview] = useState<string | null>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)
  const [genreOpen, setGenreOpen] = useState(false)
  const genreRef = useRef<HTMLDivElement>(null)
  const [showReviewErrors, setShowReviewErrors] = useState(false)
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [screenshots, setScreenshots] = useState<MediaItem[]>([])
  const [videos, setVideos] = useState<MediaItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [shopLoading, setShopLoading] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)

  const [itemModal, setItemModal] = useState(false)
  const [editItemModal, setEditItemModal] = useState(false)
  const [priceSettingModal, setPriceSettingModal] = useState(false)
  const [priceMap, setPriceMap] = useState<Record<string, string>>({})
  const [nameMap, setNameMap] = useState<Record<string, string>>({})
  const countrySwitching = useRef(false)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_KRW_TO)
  const [rateDate, setRateDate] = useState<string>('')
  const [basicSettingModal, setBasicSettingModal] = useState(false)
  const [basicSettingIsFree, setBasicSettingIsFree] = useState(false)
  const [basicSettingName, setBasicSettingName] = useState('')
  const [basicSettingNamesMap, setBasicSettingNamesMap] = useState<Record<string, string>>({})
  const [basicSettingCountry, setBasicSettingCountry] = useState('KR')
  const [basicSettingIconFile, setBasicSettingIconFile] = useState<File | null>(null)
  const [basicSettingIconPreview, setBasicSettingIconPreview] = useState('')
  const [basicSettingSaving, setBasicSettingSaving] = useState(false)
  const [basicSettingErrors, setBasicSettingErrors] = useState<{ icon?: string; name?: string }>({})
  const [newItemErrors, setNewItemErrors] = useState<{ image?: string; name?: string; price?: string; currencyAmount?: string; stock?: string; specialImage?: string; itemId?: string }>({})
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null)
  const [notiModal, setNotiModal] = useState(false)
  const ssFileRef = useRef<HTMLInputElement>(null)
  const vidFileRef = useRef<HTMLInputElement>(null)
  const [newItem, setNewItem] = useState({ name: '', price: '', currency: 'KRW', type: '패키지', currencyType: '', currencyAmount: '', bonusAmount: '', stock: '무제한', description: '', country: 'KR', itemId: '', imageFile: null as File | null, imagePreview: '', isSpecial: false, specialImageFile: null as File | null, specialImagePreview: '' })
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState('')
  const [editSpecialImageFile, setEditSpecialImageFile] = useState<File | null>(null)
  const [editSpecialImagePreview, setEditSpecialImagePreview] = useState('')
  const [editItemErrors, setEditItemErrors] = useState<{ stock?: string; specialImage?: string }>({})
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

  // ── 메인 세팅 탭 상태 ──────────────────────────────────────
  const [certRatingClass, setCertRatingClass] = useState('')
  const [certNumber, setCertNumber] = useState('')
  const [certDate, setCertDate] = useState('')
  const [certSaving, setCertSaving] = useState(false)
  const [certFile, setCertFile] = useState<File | null>(null)
  const certFileRef = useRef<HTMLInputElement>(null)

  const gameId = _id as string

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setGenreOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
        setEditEndDate(g.endDate ? g.endDate.split('T')[0] : '')
        setEditMaxTesters(g.maxTesters ? String(g.maxTesters) : '')
        setEditTestType(g.testType || '')
        setEditRequirements(g.requirements || '')
        setEditWebsite(g.website || '')
        setEditDiscord(g.discord || '')
        setEditIsPublic(g.status !== 'draft' && g.status !== 'archived')
        setCertRatingClass(g.ratingCertificate?.ratingClass || '')
        setCertNumber(g.ratingCertificate?.certNumber || '')
        setCertDate(g.ratingCertificate?.certDate || '')
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
    if (!gameId) return
    loadMedia()
    loadShopItems()
  }, [gameId, loadMedia, loadShopItems])

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


  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingIconFile(file)
    setPendingIconPreview(URL.createObjectURL(file))
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
      await triggerReReview()
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
      fd.append('endDate', editEndDate)
      fd.append('maxTesters', editMaxTesters || '0')
      fd.append('testType', editTestType)
      fd.append('requirements', editRequirements)
      fd.append('website', editWebsite)
      fd.append('discord', editDiscord)
      if (!editIsPublic) fd.append('status', 'draft')
      if (pendingIconFile) fd.append('thumbnail', pendingIconFile)
      const data = await gameService.updateGame(gameId, fd)
      setGameData(prev => prev ? { ...prev, ...(data.game as unknown as GameData) } : prev)
      setPendingIconFile(null)
      setPendingIconPreview(null)
      await triggerReReview()
      alert('저장되었습니다.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '저장에 실패했습니다'
      alert(msg)
    }
    setEditSaving(false)
  }

  const handleSaveCert = async () => {
    if (!gameId) return
    setCertSaving(true)
    try {
      const fd = new FormData()
      fd.append('ratingClass', certRatingClass)
      fd.append('certNumber', certNumber)
      fd.append('certDate', certDate)
      if (certFile) fd.append('certFile', certFile)
      const data = await gameService.updateGame(gameId, fd)
      setGameData(prev => prev ? { ...prev, ...(data.game as unknown as GameData) } : prev)
      await triggerReReview()
      alert('저장되었습니다.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '저장에 실패했습니다'
      alert(msg)
    }
    setCertSaving(false)
  }

  const triggerReReview = async () => {
    if (!gameId || gameData?.approvalStatus !== 'approved') return
    try {
      await gameService.requestReview(gameId)
      setGameData(prev => prev ? { ...prev, approvalStatus: 'pending' } : prev)
    } catch { /* 재심사 트리거 실패 시 무시 */ }
  }


  const handleLaunchGame = () => {
    if (!gameId || !gameData) return
    setShowLaunchConfirm(true)
  }

  const handleLaunchConfirm = async () => {
    if (!gameId || !gameData) return
    setShowLaunchConfirm(false)
    try {
      const fd = new FormData()
      fd.append('status', 'published')
      const data = await gameService.updateGame(gameId, fd)
      setGameData(prev => prev ? { ...prev, ...(data.game as unknown as GameData) } : prev)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '출시에 실패했습니다'
      alert(msg)
    }
  }

  const reloadGameData = async () => {
    if (!gameId) return
    const data = await gameService.getGameById(gameId)
    setGameData(data.game as unknown as GameData)
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

  const handleSsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (!gameId || selected.length === 0) return
    const toAdd = selected.slice(0, 10 - screenshots.length)
    try {
      for (const file of toAdd) {
        const title = file.name.replace(/\.[^.]+$/, '')
        await gameService.addGameMedia(gameId, { type: 'screenshot', title, file })
      }
      loadMedia()
      await triggerReReview()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '등록에 실패했습니다'
      alert(msg)
    }
    e.target.value = ''
  }

  const deleteScreenshot = async (mediaId: string) => {
    if (!gameId) return
    try {
      await gameService.deleteGameMedia(gameId, mediaId)
      loadMedia()
      await triggerReReview()
    } catch { alert('삭제에 실패했습니다') }
  }
  const handleVidFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!gameId) return
    const files = Array.from(e.target.files || []).slice(0, 3 - videos.length)
    for (const file of files) {
      const title = file.name.replace(/\.[^/.]+$/, '')
      try {
        await gameService.addGameMedia(gameId, { type: 'video', title, videoFile: file })
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '등록에 실패했습니다'
        alert(msg)
      }
    }
    if (files.length > 0) { loadMedia(); await triggerReReview() }
    e.target.value = ''
  }
  const deleteVideo = async (mediaId: string) => {
    if (!gameId) return
    try {
      await gameService.deleteGameMedia(gameId, mediaId)
      loadMedia()
      await triggerReReview()
    } catch { alert('삭제에 실패했습니다') }
  }
  const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''
  const resetNewItem = () => { setNewItem({ name: '', price: '', currency: 'KRW', type: '패키지', currencyType: '', currencyAmount: '', bonusAmount: '', stock: '무제한', description: '', country: 'KR', itemId: '', imageFile: null, imagePreview: '', isSpecial: false, specialImageFile: null, specialImagePreview: '' }); setPriceMap({}); setNameMap({}); setNewItemErrors({}) }

  useEffect(() => {
    const cached = localStorage.getItem(EXCHANGE_CACHE_KEY)
    if (cached) {
      try {
        const { rates, date, cachedAt } = JSON.parse(cached)
        const ageMs = Date.now() - cachedAt
        if (date && /^\d{4}\.\d{2}\.\d{2}$/.test(date) && ageMs < EXCHANGE_CACHE_DAYS * 24 * 60 * 60 * 1000) {
          setExchangeRates(rates)
          setRateDate(date)
          return
        }
      } catch {}
      localStorage.removeItem(EXCHANGE_CACHE_KEY)
    }
    void fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => {
        if (!data.rates?.KRW) return
        const usdToKrw = data.rates.KRW
        const rates: Record<string, number> = {
          KRW: 1,
          USD: 1 / usdToKrw,
          JPY: data.rates.JPY / usdToKrw,
          CNY: data.rates.CNY / usdToKrw,
          EUR: data.rates.EUR / usdToKrw,
        }
        const d = new Date(data.time_last_update_utc as string)
        const date = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
        setExchangeRates(rates)
        setRateDate(date)
        localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify({ rates, date, cachedAt: Date.now() }))
      })
      .catch(e => console.error('[환율] fetch 실패:', e))
  }, [])

  useEffect(() => {
    if (countrySwitching.current) { countrySwitching.current = false; return }
    if (!newItem.price) { setPriceMap({}); return }
    const list = calcPriceList(newItem.price, newItem.currency, exchangeRates)
    const map: Record<string, string> = {}
    list.forEach(c => { map[c.code] = String(c.price) })
    setPriceMap(map)
  }, [newItem.price, newItem.currency, exchangeRates])

  const addItem = async () => {
    const errors: typeof newItemErrors = {}
    if (!newItem.imageFile) errors.image = '상품 이미지를 등록해주세요'
    if (!newItem.name.trim()) errors.name = '상품명을 입력해주세요'
    if (!newItem.price) errors.price = '판매가를 입력해주세요'
    if (!newItem.currencyAmount) errors.currencyAmount = '지급 수량을 입력해주세요'
    if (newItem.stock !== '무제한' && !newItem.stock.trim()) errors.stock = '수량을 입력해주세요'
    if (newItem.isSpecial && !newItem.specialImageFile) errors.specialImage = '특별 상품 이미지를 등록해주세요'
    if (!newItem.itemId.trim()) errors.itemId = '상품 ID를 입력해주세요'
    if (Object.keys(errors).length > 0) { setNewItemErrors(errors); return }
    if (!gameId) return
    setNewItemErrors({})
    try {
      await gameService.createGameShopItem(gameId, {
        name: newItem.name, price: parseInt(newItem.price),
        currency: newItem.currency, type: newItem.type,
        currencyType: newItem.currencyType, currencyAmount: Number(newItem.currencyAmount) || 0,
        bonusAmount: Number(newItem.bonusAmount) || 0,
        stock: newItem.stock, description: newItem.description,
        itemId: newItem.itemId,
        imageFile: newItem.imageFile ?? undefined,
      })
      resetNewItem()
      setItemModal(false)
      loadShopItems(shopSort, shopPeriod)
      await triggerReReview()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '등록에 실패했습니다'
      alert(msg)
    }
  }
  const openEditItem = (item: ShopItem) => {
    setEditingItem({ ...item })
    setEditImageFile(null)
    setEditImagePreview('')
    setEditSpecialImageFile(null)
    setEditSpecialImagePreview('')
    setEditItemModal(true)
  }
  const saveEditItem = async () => {
    if (!editingItem || !editingItem.name || !editingItem.price || !gameId) return
    const editErrors: typeof editItemErrors = {}
    if (editingItem.stock !== '무제한' && !editingItem.stock.trim()) editErrors.stock = '수량을 입력해주세요'
    if (editingItem.isSpecial && !editSpecialImageFile && !editingItem.specialImageUrl) editErrors.specialImage = '특별 상품 이미지를 등록해주세요'
    if (Object.keys(editErrors).length > 0) { setEditItemErrors(editErrors); return }
    try {
      await gameService.updateGameShopItem(gameId, editingItem._id, {
        name: editingItem.name, price: editingItem.price,
        currency: editingItem.currency, type: editingItem.type,
        currencyType: editingItem.currencyType, currencyAmount: editingItem.currencyAmount,
        bonusAmount: editingItem.bonusAmount,
        stock: editingItem.stock, description: editingItem.description,
        active: editingItem.active,
        isSpecial: editingItem.isSpecial,
        imageFile: editImageFile ?? undefined,
        specialImageFile: editSpecialImageFile ?? undefined,
      })
      setEditItemModal(false); setEditingItem(null); setEditImageFile(null); setEditImagePreview('')
      loadShopItems(shopSort, shopPeriod)
      await triggerReReview()
    } catch (e: any) { alert(e?.response?.data?.message || '수정에 실패했습니다') }
  }
  const deleteItem = async (itemId: string) => {
    if (!gameId || !confirm('이 아이템을 삭제하시겠습니까?')) return
    try {
      await gameService.deleteGameShopItem(gameId, itemId)
      loadShopItems(shopSort, shopPeriod)
      await triggerReReview()
    } catch { alert('삭제에 실패했습니다') }
  }
  const specialItems = shopItems.filter(item => item.isSpecial)
  const regularItems = shopItems.filter(item => !item.isSpecial)
  const sortedShopItems = [...specialItems, ...regularItems]

  const handleDragStart = (idx: number) => setDragIndex(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIndex(idx) }
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null) }
  const handleDrop = async (idx: number) => {
    if (dragIndex === null || dragIndex === idx) { setDragIndex(null); setDragOverIndex(null); return }
    const newRegular = [...regularItems]
    const [moved] = newRegular.splice(dragIndex, 1)
    newRegular.splice(idx, 0, moved)
    setShopItems([...specialItems, ...newRegular])
    setDragIndex(null)
    setDragOverIndex(null)
    await gameService.reorderGameShopItems(gameId, [
      ...specialItems.map((item, i) => ({ _id: item._id, sortOrder: i + 1 })),
      ...newRegular.map((item, i) => ({ _id: item._id, sortOrder: specialItems.length + i + 1 })),
    ]).catch(() => {})
  }
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

  const isEditDirty = useMemo(() => {
    if (!gameData) return false
    return (
      editTitle !== (gameData.title || '') ||
      editGenre !== (gameData.genre || '') ||
      editNotes !== (gameData.notes || '') ||
      editDescription !== (gameData.description || '') ||
      editStartDate !== (gameData.startDate ? gameData.startDate.split('T')[0] : '') ||
      editEndDate !== (gameData.endDate ? gameData.endDate.split('T')[0] : '') ||
      editMaxTesters !== (gameData.maxTesters ? String(gameData.maxTesters) : '') ||
      editTestType !== (gameData.testType || '') ||
      editWebsite !== (gameData.website || '') ||
      editDiscord !== (gameData.discord || '')
    )
  }, [gameData, editTitle, editGenre, editNotes, editDescription, editStartDate, editEndDate, editMaxTesters, editTestType, editWebsite, editDiscord])

  if (gameLoading) return (
    <div className="flex items-center justify-center h-64 text-text-secondary">불러오는 중...</div>
  )

  if (!gameData) return (
    <div className="flex items-center justify-center h-64 text-text-secondary">게임을 찾을 수 없습니다.</div>
  )

  const serviceLabel: Record<string, string> = { beta: '베타', live: '라이브', ended: '종료' }
  const approvalLabel: Record<string, { label: string; bg: string; text: string; border: string }> = {
    not_submitted: { label: '초안 작성 중', bg: 'bg-bg-tertiary/40',   text: 'text-text-muted',   border: 'border-line/50' },
    pending:       { label: '심사중',       bg: 'bg-yellow-500/20',    text: 'text-yellow-400',   border: 'border-yellow-500/50' },
    review:        { label: '심사중',       bg: 'bg-yellow-500/20',    text: 'text-yellow-400',   border: 'border-yellow-500/50' },
    approved:      { label: '완료',         bg: 'bg-accent-light',     text: 'text-accent',       border: 'border-accent-muted' },
    rejected:      { label: '심사 거부',    bg: 'bg-red-500/20',       text: 'text-red-400',      border: 'border-red-500/50' },
  }

  const isUnderReview = gameData.approvalStatus === 'pending' || gameData.approvalStatus === 'review'
  const isSuspended = !!gameData.suspendedAt

  const reviewChecks = {
    basicInfo: !!(gameData.title && gameData.genre && gameData.description),
    heroBanner: !!gameData.bannerImage,
    trailer: videos.length >= 1,
    screenshots: screenshots.length >= 4,
    rating: !!gameData.ratingCertificate?.ratingClass,
    shopItems: gameData.monetization === 'free' || shopItems.length >= 1,
  }
  const canRequestReview = Object.values(reviewChecks).every(Boolean)
  const reviewBlockReasons = [
    !reviewChecks.basicInfo && '기본 정보',
    !reviewChecks.heroBanner && '히어로 배너',
    !reviewChecks.trailer && '트레일러 (최소 1개)',
    !reviewChecks.screenshots && '게임 스크린샷 (최소 4개)',
    !reviewChecks.rating && '등급 분류',
    !reviewChecks.shopItems && '상품 등록 (최소 1개)',
  ].filter((v): v is string => !!v)

  const isEditPriceCtx = editItemModal && editingItem !== null
  const priceModalPrice = isEditPriceCtx ? String(editingItem!.price) : newItem.price
  const priceModalCurrency = isEditPriceCtx ? (editingItem!.currency ?? 'KRW') : newItem.currency
  const priceModalMap: Record<string, string> = {}
  if (priceModalPrice) {
    calcPriceList(priceModalPrice, priceModalCurrency, exchangeRates).forEach(c => { priceModalMap[c.code] = String(c.price) })
  }

  return (
    <div className="space-y-6 p-6">

      {/* 출시 확인 팝업 */}
      {showLaunchConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-line rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="w-full h-48 overflow-hidden">
              <img src="/launch-congrats.jpg" alt="출시 축하" className="w-full h-full object-cover object-top" />
            </div>
            <div className="p-6 text-center">
              <h3 className="text-xl font-extrabold text-text-primary mb-2">출시를 축하합니다!</h3>
              <p className="text-text-secondary text-sm mb-6">응원합니다!! 앞으로도 잘 부탁드립니다 🚀</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLaunchConfirm(false)}
                  className="flex-1 py-2.5 border border-line text-text-secondary hover:bg-bg-tertiary font-semibold rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleLaunchConfirm}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            {gameData.suspendedAt
              ? <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/50">강제 중지</span>
              : gameData.approvalStatus === 'not_submitted'
              ? <span className="text-xs px-2 py-1 rounded-full bg-bg-tertiary/40 text-text-muted border border-line/50">초안 작성 중</span>
              : (gameData.approvalStatus === 'pending' || gameData.approvalStatus === 'review')
              ? <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">심사중</span>
              : gameData.approvalStatus === 'approved' && gameData.status === 'published'
              ? null
              : gameData.approvalStatus === 'approved'
              ? <span className="text-xs px-2 py-1 rounded-full bg-accent-light text-accent border border-accent-muted">출시 대기</span>
              : gameData.approvalStatus === 'rejected'
              ? <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/50">심사 거부</span>
              : <span className="text-xs px-2 py-1 rounded-full bg-bg-tertiary text-text-secondary border border-line">{gameData.approvalStatus}</span>
            }
          </div>
        </div>
        {gameData.rating > 0 && (
          <span className="flex items-center gap-1 text-text-secondary text-sm mt-0.5">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{gameData.rating.toFixed(1)}
          </span>
        )}
      </div>


      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1 flex-wrap">
          {TABS.map(t => {
            const tabError = showReviewErrors && (
              (t.key === 'edit'  && (!reviewChecks.basicInfo || !reviewChecks.heroBanner)) ||
              (t.key === 'media' && (!reviewChecks.trailer   || !reviewChecks.screenshots))
            )
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === t.key ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                {t.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setActiveTab('main-settings')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${activeTab === 'main-settings' ? 'bg-purple-600 border-purple-500 text-white' : 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10'}`}
        >
          <Shield className="w-4 h-4" /> 등급 분류
        </button>
        <div className={`flex items-center gap-2 ml-auto ${isSuspended ? 'pointer-events-none opacity-40' : ''}`}>
          {gameData.status !== 'published' && (
            <button
              onClick={adminView ? undefined : handleLaunchGame}
              disabled={adminView || !!gameData.suspendedAt || gameData.approvalStatus !== 'approved'}
              title={adminView ? '관리자는 출시할 수 없습니다' : gameData.suspendedAt ? '강제 중지 상태에서는 출시가 불가합니다' : gameData.approvalStatus !== 'approved' ? '심사 완료 후 출시할 수 있습니다' : undefined}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold transition-colors text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Globe className="w-5 h-5" />
              게임 출시
            </button>
          )}
          <RequestReviewButton
            gameId={gameId}
            gameTitle={gameData.title}
            approvalStatus={gameData.approvalStatus}
            hasSnapshot={!!gameData.publishedSnapshot}
            onSuccess={reloadGameData}
            size="lg"
            color="violet"
            extraDisabled={adminView || isSuspended || !canRequestReview}
            extraDisabledTitle={adminView ? '관리자는 심사 등록할 수 없습니다' : gameData.suspendedAt ? '강제 중지 상태에서는 심사 등록이 불가합니다' : !canRequestReview ? ['등록 필요:', ...reviewBlockReasons.map(r => `• ${r}`)] : undefined}
            onDisabledClick={!canRequestReview && !adminView && !gameData.suspendedAt ? () => setShowReviewErrors(true) : undefined}
          />
        </div>
      </div>

      {/* ── 탭 콘텐츠 ── */}
      <div className={isSuspended ? 'pointer-events-none opacity-50' : ''}>

      {/* ── GCRB 탭 ── */}
      {activeTab === 'main-settings' && (
        <div className={`flex gap-10 items-start ${isUnderReview ? 'pointer-events-none opacity-50' : ''}`}>

          {/* 왼쪽: 헤더 + 폼 */}
          <div className="flex-1 max-w-xl space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-bold">게임물관리위원회 등급분류 인증서 등록</h2>
                <p className="text-sm text-text-muted mt-0.5">발급받은 등급 분류 정보를 입력하고 인증서 파일을 첨부하세요.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className={labelCls}>등급 분류</label>
                <select value={certRatingClass} onChange={e => setCertRatingClass(e.target.value)} className="w-full px-3 py-3 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent">
                  <option value="">선택 안 함</option>
                  <option value="전체이용가">전체이용가</option>
                  <option value="12세이용가">12세이용가</option>
                  <option value="15세이용가">15세이용가</option>
                  <option value="18세이용가">18세이용가</option>
                  <option value="청소년이용불가">청소년이용불가</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>등급 분류 번호</label>
                <input value={certNumber} onChange={e => setCertNumber(e.target.value)} placeholder="예: 2024-게-12345" className="w-full px-3 py-3 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className={labelCls}>등급 분류일</label>
                <input type="date" value={certDate} onChange={e => setCertDate(e.target.value)} className="w-full px-3 py-3 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className={labelCls}>인증서 파일</label>
                <input ref={certFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setCertFile(e.target.files?.[0] ?? null)} />
                <div
                  onClick={() => certFileRef.current?.click()}
                  className="flex items-center gap-3 px-4 py-3 bg-bg-tertiary border border-line rounded-md cursor-pointer hover:border-accent transition-colors group"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 transition-colors ${certFile ? 'bg-accent/10' : 'bg-bg-secondary border border-line group-hover:border-accent'}`}>
                    {certFile ? <Check className="w-4 h-4 text-accent" /> : <Upload className="w-4 h-4 text-text-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {certFile ? (
                      <>
                        <p className="text-sm text-text-primary font-medium truncate">{certFile.name}</p>
                        <p className="text-xs text-text-muted">{(certFile.size / 1024).toFixed(0)} KB</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-text-secondary">파일을 선택하세요</p>
                        <p className="text-xs text-text-muted">PDF, JPG, PNG · 최대 10MB</p>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-text-muted group-hover:text-accent transition-colors flex-shrink-0">
                    {certFile ? '변경' : '업로드'}
                  </span>
                </div>
              </div>
            </div>

            <button onClick={handleSaveCert} disabled={certSaving || !certRatingClass || !certNumber.trim() || !certDate || !certFile} className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-semibold transition-colors">
              <Save className="w-4 h-4" /> {certSaving ? '저장 중...' : '저장'}
            </button>
          </div>

          {/* 구분선 */}
          {gameData.ratingCertificate?.ratingClass && (
            <div className="self-stretch flex flex-col pt-20">
              <div className="w-px bg-line flex-1" />
            </div>
          )}

          {/* 오른쪽: 등급 상태 */}
          {gameData.ratingCertificate?.ratingClass && (
            <div className="w-52 flex-shrink-0 pt-20">
              <p className="text-sm text-text-secondary mb-4">등급 현황</p>
              {(() => {
                const cert = gameData.ratingCertificate
                const isSubmitted = gameData.approvalStatus !== 'not_submitted'

                if (cert?.isVerified) return (
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div className="scale-[1.5] origin-top mb-[34px]">
                      <GracRatingBadge ratingClass={cert.ratingClass as RatingClass} size="md" />
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-xs font-semibold text-green-400">승인 완료</span>
                      </div>
                      <p className="text-sm font-semibold text-text-primary">{cert.ratingClass}</p>
                      {cert.certNumber && <p className="text-xs text-text-muted mt-1 font-mono">{cert.certNumber}</p>}
                    </div>
                    <p className="text-xs text-text-secondary">플레이어 화면에 노출 중</p>
                  </div>
                )

                if (isSubmitted) return (
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div className="scale-[1.5] origin-top mb-[34px]">
                      <div className="w-14 h-[68px] rounded-lg bg-bg-tertiary border border-line flex items-center justify-center">
                        <Clock className="w-6 h-6 text-text-muted" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-xs font-semibold text-yellow-400">심사 중</span>
                      </div>
                      <p className="text-sm font-semibold text-text-primary">{cert?.ratingClass}</p>
                      {cert?.certNumber && <p className="text-xs text-text-muted mt-1 font-mono">{cert.certNumber}</p>}
                    </div>
                  </div>
                )

                return (
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div className="scale-[1.5] origin-top mb-[34px]">
                      <div className="w-14 h-[68px] rounded-lg bg-bg-tertiary border border-line flex items-center justify-center">
                        <Shield className="w-6 h-6 text-text-muted" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        <span className="text-xs font-semibold text-text-muted">미제출</span>
                      </div>
                      <p className="text-sm font-semibold text-text-primary">{cert?.ratingClass}</p>
                      {cert?.certNumber && <p className="text-xs text-text-muted mt-1 font-mono">{cert.certNumber}</p>}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

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
        <div className={`space-y-5 ${isUnderReview ? 'pointer-events-none opacity-50' : ''}`}>
          <input ref={ssFileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleSsFileChange} />
          <input ref={vidFileRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/avi,.mp4,.mov,.webm,.avi" multiple className="hidden" onChange={handleVidFileChange} />

          {/* ── 상단: 히어로 배너 + 트레일러 ──────────────────────── */}
          <div className="grid grid-cols-[5fr_7fr] gap-5 items-start">

            {/* 히어로 배너 */}
            <div className="rounded-2xl overflow-hidden border border-line bg-bg-secondary">
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleBannerUpload}
              />
              <div className="px-5 py-4 border-b border-line">
                <h2 className="text-sm font-bold leading-none">히어로 배너</h2>
              </div>
              <div className="p-4">
                {gameData.bannerImage ? (
                  <div
                    className="relative w-full h-40 rounded-xl overflow-hidden border border-line cursor-pointer group"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <img
                      src={gameData.bannerImage.startsWith('/uploads/') ? gameData.bannerImage : `/uploads/banners/${gameData.bannerImage.split('/').pop()}`}
                      alt="히어로 배너"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-xs font-medium border border-white/20">
                        <Upload className="w-3.5 h-3.5" /> 변경
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-full h-40 border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-accent text-text-muted hover:text-accent transition-colors"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <ImageIcon className="w-6 h-6 opacity-40" />
                    <p className="text-xs">배너 업로드</p>
                  </div>
                )}
              </div>
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <p className="text-[11px] text-text-secondary">권장 1920×640px · PNG, JPG, WEBP · 최대 5MB</p>
                </div>
              </div>
            </div>

            {/* 트레일러 */}

            <div className="rounded-2xl border border-line bg-bg-secondary overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <div>
                  <h2 className="text-sm font-bold leading-none">트레일러 영상</h2>
                </div>
                <p className="text-xs text-text-muted">{videos.length} / 3</p>
              </div>

              <div className="p-4 space-y-3">
                {mediaLoading ? (
                  <div className="text-center py-10 text-text-secondary text-sm">불러오는 중...</div>
                ) : (
                  <div className="flex gap-2.5">
                    {videos.map((v, idx) => (
                      <div key={v._id} className="relative group flex-1 rounded-xl overflow-hidden border border-line bg-black h-40">
                        <video
                          src={`${UPLOADS_URL}${v.url}`}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                          onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1 }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors" />
                        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <button
                          onClick={() => deleteVideo(v._id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-md transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {Array.from({ length: 3 - videos.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="flex-1 h-40 border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-accent text-text-muted hover:text-accent transition-colors"
                        onClick={() => vidFileRef.current?.click()}
                      >
                        <Film className="w-6 h-6 opacity-40" />
                        <p className="text-xs">트레일러 업로드 {videos.length + i + 1}</p>
                      </div>
                    ))}
                  </div>
                )}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <p className="text-[11px] text-text-secondary">MP4, MOV, WEBM · 최대 500MB · <span className="text-yellow-400">최소 1개 필수</span></p>
              </div>
              </div>
            </div>

          </div>{/* 상단 2열 end */}

          {/* ── 하단: 게임 스크린샷 ──────────────────────── */}
          <div className="rounded-2xl border border-line bg-bg-secondary overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="text-sm font-bold leading-none">게임 스크린샷</h2>
              <p className="text-xs text-text-muted">{screenshots.length} / 10</p>
            </div>

            <div className="p-4 space-y-3">
              {mediaLoading ? (
                <div className="text-center py-10 text-text-secondary text-sm">불러오는 중...</div>
              ) : (
                <div className="grid grid-cols-5 gap-2.5">
                  {screenshots.map(ss => (
                    <div key={ss._id} className="relative group aspect-video rounded-xl border border-line overflow-hidden">
                      <img src={ss.url} alt={ss.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors" />
                      <button
                        onClick={() => deleteScreenshot(ss._id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-md transition-all"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {Array.from({ length: screenshots.length < 10 ? Math.max(1, 5 - screenshots.length) : 0 }).map((_, i) => {
                    const isRequired = screenshots.length >= 1 && screenshots.length < 4 && i < (4 - screenshots.length)
                    return (
                      <div
                        key={`empty-${i}`}
                        className={`aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${isRequired ? '!border-red-500 text-red-400 hover:!border-red-400' : 'border-line text-text-muted hover:border-accent hover:text-accent'}`}
                        onClick={() => ssFileRef.current?.click()}
                      >
                        <ImageIcon className="w-6 h-6 opacity-40" />
                        <p className="text-xs">스크린샷 업로드 {screenshots.length + i + 1}</p>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <p className="text-[11px] text-text-secondary">권장 1920×1080px · PNG, JPG, WEBP · 최대 5MB · <span className="text-yellow-400">최소 4개 필수</span></p>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'shop' && (
        <div className="space-y-5">
          {/* 헤더 & 필터 */}
          <div className="bg-bg-secondary border border-line rounded-xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold">상품 목록</h2>
                <p className="text-xs text-text-secondary mt-0.5">상점에 표시될 상품을 등록하고 관리하세요</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { const names = gameData?.shopCurrencyNames ?? {}; setBasicSettingNamesMap(names); setBasicSettingCountry('KR'); setBasicSettingName(names['KR'] ?? gameData?.shopCurrencyName ?? ''); setBasicSettingIconFile(null); setBasicSettingIconPreview(''); setBasicSettingErrors({}); setBasicSettingIsFree(gameData?.monetization === 'free'); setBasicSettingModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-line hover:bg-bg-tertiary rounded-lg text-sm font-medium transition-colors">
                  <Settings className="w-4 h-4" /> 기본 세팅
                </button>
                <div className="relative group">
                  <button onClick={() => { const currencyName = gameData?.shopCurrencyNames?.['KR'] ?? gameData?.shopCurrencyName ?? ''; setNewItem(p => ({ ...p, currencyType: currencyName })); setItemModal(true) }} disabled={gameData?.monetization === 'free' || !gameData?.shopCurrencyName || !gameData?.shopCurrencyIconUrl} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus className="w-4 h-4" /> 상품 추가
                  </button>
                  {(gameData?.monetization === 'free' || !gameData?.shopCurrencyName || !gameData?.shopCurrencyIconUrl) && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 whitespace-nowrap">
                      <div className="bg-bg-primary border border-line rounded-lg px-3 py-1.5 text-xs text-text-secondary shadow-lg">
                        {gameData?.monetization === 'free' ? '완전 무료 게임은 상품을 등록할 수 없습니다' : '기본 세팅을 먼저 완료해주세요'}
                      </div>
                      <div className="w-2 h-2 bg-bg-primary border-r border-b border-line rotate-45 mx-auto -mt-1" />
                    </div>
                  )}
                </div>

              </div>
            </div>

            {shopLoading ? (
              <div className="text-center py-16 text-text-secondary text-sm">불러오는 중...</div>
            ) : sortedShopItems.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted text-sm">{gameData?.monetization === 'free' ? '상품 판매가 없는 무료 게임입니다.' : '등록된 상품이 없습니다'}</p>
                {gameData?.monetization !== 'free' && <p className="text-text-muted text-xs mt-1">상품 추가 버튼을 눌러 첫 상품을 등록해보세요</p>}
              </div>
            ) : (
              <div className="border border-line rounded-xl overflow-hidden">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-[6.5%]" />
                    <col className="w-[21%]" />
                    <col className="w-[8%]" />
                    <col className="w-[7%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[3.5%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-bg-tertiary border-b border-line divide-x divide-white/[0.06]">
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-text-secondary">상품 이미지</th>
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-text-secondary">상품명</th>
                      <th className="pl-3 pr-0 py-2.5 text-left text-sm font-medium text-text-secondary">지급 재화</th>
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-text-secondary">재화 수량</th>
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-text-secondary">판매가</th>
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-text-secondary">구매 가능 수량</th>
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-text-secondary">활성화</th>
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-text-secondary">수정하기</th>
                      <th className="px-2 py-2.5 text-left text-sm font-medium text-text-secondary">순서</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedShopItems.map((item, idx) => {
                      const TYPE_COLOR: Record<string, string> = {
                        '패키지': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
                        '외형': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                        '재화': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                        '소모품': 'bg-green-500/15 text-green-400 border-green-500/30',
                      }
                      const typeColor = TYPE_COLOR[item.type] || 'bg-bg-tertiary text-text-secondary border-line'
                      const regularIdx = idx - specialItems.length
                      const isDraggable = !item.isSpecial
                      return (
                        <tr
                          key={item._id}
                          draggable={isDraggable}
                          onDragStart={isDraggable ? () => handleDragStart(regularIdx) : undefined}
                          onDragOver={isDraggable ? e => handleDragOver(e, regularIdx) : undefined}
                          onDrop={isDraggable ? () => handleDrop(regularIdx) : undefined}
                          onDragEnd={isDraggable ? handleDragEnd : undefined}
                          className={`border-b border-line last:border-b-0 transition-colors divide-x divide-white/[0.06] ${!item.active ? 'opacity-40' : item.isSpecial ? 'bg-red-500/5 border-l-2 border-l-red-500/50' : dragOverIndex === regularIdx && dragIndex !== regularIdx ? 'border-t-2 border-t-accent bg-accent/5' : idx % 2 === 0 ? 'hover:bg-bg-tertiary/40' : 'bg-bg-tertiary/20 hover:bg-bg-tertiary/40'} ${dragIndex === regularIdx && !item.isSpecial ? 'opacity-30' : ''}`}
                        >
                          <td className="px-1 py-2.5">
                            <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-bg-tertiary border border-line">
                              {item.imageUrl
                                ? <img src={`${UPLOADS_URL}${item.imageUrl}`} alt={item.name} className="w-full h-full object-contain" />
                                : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-text-muted" /></div>
                              }
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[17px] text-text-primary truncate">{item.name}</p>
                              {item.isSpecial && <span className="text-[9px] px-1.5 py-0.5 bg-red-500 text-white rounded font-medium whitespace-nowrap flex-shrink-0">특별 상품</span>}
                            </div>
                            {item.itemId && <p className="text-[6px] text-text-muted mt-0.5">{item.itemId}</p>}
                          </td>
                          <td className="pl-3 pr-0 py-2.5">
                            <span className="text-[17px] text-text-primary">{(item.country ? gameData?.shopCurrencyNames?.[item.country] : undefined) ?? gameData?.shopCurrencyName ?? item.currencyType ?? '-'}</span>
                          </td>
                          <td className="px-3 py-2.5 text-left">
                            <span className="text-[17px] text-text-primary">{item.currencyAmount ? item.currencyAmount.toLocaleString() : '-'}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[17px] text-text-primary">
                              {item.currency === 'KRW' ? '₩' : item.currency === 'USD' ? '$' : '€'}{item.price.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[17px] text-text-primary">
                              {item.stock === '무제한' ? '무제한' : Number(item.stock).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={async () => {
                                await gameService.updateGameShopItem(gameId, item._id, { active: !item.active }).catch(() => {})
                                loadShopItems(shopSort, shopPeriod)
                              }}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all ${item.active ? 'bg-green-500 hover:bg-green-400 hover:scale-110' : 'bg-zinc-600 hover:bg-zinc-500 hover:scale-110'}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${item.active ? 'translate-x-4' : 'translate-x-1'}`} />
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center">
                              <button onClick={() => openEditItem(item)} className="p-2.5 border border-line rounded-lg hover:bg-bg-tertiary transition-colors" title="편집">
                                <Edit className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-center select-none">
                            {item.isSpecial ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 text-red-500/60" title="특별 상품은 항상 최상단 고정">
                                ★
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-line bg-bg-tertiary hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-400 text-text-secondary cursor-grab active:cursor-grabbing transition-all text-base">
                                ⠿
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
                <p className="text-sm text-text-secondary mt-1">{isUnderReview ? '심사 중에는 기본 정보를 수정할 수 없습니다.' : '게임 제목, 장르, 설명 등 기본 정보를 수정하세요.'}</p>
              </div>
              <button
                onClick={handleSaveGameInfo}
                disabled={isUnderReview || editSaving || !(gameData.thumbnail || pendingIconFile) || !editTitle.trim() || !editGenre || !editNotes.trim() || !editDescription.trim() || (gameData.serviceType !== 'live' && (!editStartDate || !editEndDate || !editMaxTesters || !editTestType))}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" /> {editSaving ? '저장 중...' : '저장'}
              </button>
            </div>

            {/* 아이콘(좌) + 게임 제목·장르(우) */}
            <div className={`flex items-start gap-6 ${isUnderReview ? 'pointer-events-none opacity-50' : ''}`}>
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
                  {pendingIconPreview
                    ? <img src={pendingIconPreview} alt="아이콘 미리보기" className="w-full h-full object-cover" />
                    : gameData.thumbnail
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
                  disabled={editSaving}
                  className="flex items-center gap-2 px-3 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" /> {pendingIconFile ? '아이콘 선택됨 (미저장)' : '아이콘 업로드'}
                </button>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label className={labelCls}>게임 제목 *</label>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>게임 장르 *</label>
                  <div className="relative" ref={genreRef}>
                    <button
                      type="button"
                      onClick={() => setGenreOpen(o => !o)}
                      className={`${inputCls} flex items-center justify-between w-full text-left`}
                    >
                      <span className={editGenre ? 'text-text-primary' : 'text-text-muted'}>{editGenre || '장르 선택'}</span>
                      <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${genreOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {genreOpen && (
                      <div className="absolute left-0 top-full mt-1 w-full bg-bg-primary border border-line rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        <div
                          className="px-3 py-2 text-sm text-text-muted hover:bg-bg-tertiary cursor-pointer"
                          onClick={() => { setEditGenre(''); setGenreOpen(false) }}
                        >
                          장르 선택
                        </div>
                        {FORM_GENRES.map(g => (
                          <div
                            key={g}
                            onClick={() => { setEditGenre(g); setGenreOpen(false) }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary ${editGenre === g ? 'bg-accent/10 text-accent font-medium' : 'text-text-primary'}`}
                          >
                            {g}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 전체폭 필드 */}
            <div className={isUnderReview ? 'pointer-events-none opacity-50' : ''}>
              <label className={labelCls}>게임 설명 *</label>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className={`${inputCls} min-h-32 resize-y`} />
            </div>
            <div className={isUnderReview ? 'pointer-events-none opacity-50' : ''}>
              <label className={labelCls}>짧은 설명 * <span className="text-text-muted">(최대 100자)</span></label>
              <input value={editDescription} onChange={e => setEditDescription(e.target.value)} maxLength={100} className={inputCls} />
            </div>
          </div>

          {/* 베타 테스트 정보 */}
          {gameData.serviceType !== 'live' && <div className={`bg-bg-secondary border border-line rounded-lg p-6 space-y-4 ${isUnderReview ? 'pointer-events-none opacity-50' : ''}`}>
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-accent" />베타 테스트 정보</h3>
              <p className="text-sm text-text-secondary mt-1">베타 테스트 기간, 모집 인원, 시스템 요구사항을 설정하세요.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>시작일</label>
                <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>종료일</label>
                <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>최대 테스터 수</label>
                <input type="number" placeholder="1000" value={editMaxTesters} onChange={e => setEditMaxTesters(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>테스트 유형</label>
                <select value={editTestType} onChange={e => setEditTestType(e.target.value)} className={inputCls}>
                  <option value="">유형 선택</option>
                  <option value="closed">비공개 베타</option>
                  <option value="open">공개 베타</option>
                  <option value="alpha">알파 테스트</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>시스템 요구사항</label>
              <textarea value={editRequirements} onChange={e => setEditRequirements(e.target.value)} placeholder="최소 및 권장 시스템 요구사항" className={`${inputCls} min-h-20 resize-y`} />
            </div>
          </div>}

          {/* 추가 정보 */}
          <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-accent" />추가 정보</h3>
              <p className="text-sm text-text-secondary mt-1">공식 웹사이트, 커뮤니티 링크를 등록하세요.</p>
            </div>
            <div>
              <label className={labelCls}>공식 웹사이트</label>
              <input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>디스코드 서버</label>
              <input value={editDiscord} onChange={e => setEditDiscord(e.target.value)} placeholder="https://discord.gg/..." className={inputCls} />
            </div>
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

      {/* 기본 세팅 모달 */}
      <Modal open={basicSettingModal} onClose={() => setBasicSettingModal(false)} title="기본 세팅" disableBackdropClose showCloseButton>
        {(() => { const isLive = gameData?.approvalStatus === 'approved' && gameData?.status === 'published'; return (
        <div className="space-y-6 py-2">
          {/* 판매 방식 토글 */}
          <div className="flex rounded-lg border border-line overflow-hidden text-sm font-medium">
            <button
              type="button"
              onClick={() => { setBasicSettingIsFree(false); setBasicSettingErrors({}) }}
              className={`flex-1 py-2 transition-colors ${!basicSettingIsFree ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:bg-bg-tertiary'}`}
            >
              상품 판매
            </button>
            <button
              type="button"
              onClick={() => { setBasicSettingIsFree(true); setBasicSettingErrors({}) }}
              className={`flex-1 py-2 transition-colors ${basicSettingIsFree ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:bg-bg-tertiary'}`}
            >
              완전 무료
            </button>
          </div>

          <div className="h-px bg-line" />
          <div className={basicSettingIsFree ? 'pointer-events-none opacity-40' : ''}>
          {/* 재화 아이콘 */}
          <div className="space-y-3">
            <p className="text-sm font-medium">재화 아이콘</p>
            <div className="flex items-center gap-4">
              <div
                onClick={() => !isLive && document.getElementById('currency-icon-input')?.click()}
                className={`w-16 h-16 rounded-xl border-2 border-dashed transition-colors overflow-hidden flex items-center justify-center bg-bg-tertiary/50 flex-shrink-0 ${isLive ? 'cursor-not-allowed opacity-60' : 'hover:border-accent/60 cursor-pointer'} ${basicSettingErrors.icon ? 'border-red-500' : 'border-line'}`}
              >
                {basicSettingIconPreview ? (
                  <img src={basicSettingIconPreview} alt="미리보기" className="w-full h-full object-cover" />
                ) : gameData?.shopCurrencyIconUrl ? (
                  <img src={`${UPLOADS_URL}${gameData.shopCurrencyIconUrl}`} alt="재화 아이콘" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-text-muted" />
                )}
              </div>
              <div>
                <p className="text-xs text-text-secondary">PNG 파일만 업로드 가능합니다</p>
                {!isLive && (
                  <button onClick={() => document.getElementById('currency-icon-input')?.click()} className="mt-2 text-xs text-accent hover:underline">
                    파일 선택
                  </button>
                )}
              </div>
              <input id="currency-icon-input" type="file" accept=".png,image/png" disabled={isLive} className="hidden" onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                setBasicSettingIconFile(file)
                setBasicSettingIconPreview(URL.createObjectURL(file))
                setBasicSettingErrors(prev => ({ ...prev, icon: undefined }))
              }} />
            </div>
            {basicSettingErrors.icon && <p className="text-xs text-red-400">{basicSettingErrors.icon}</p>}
          </div>

          <div className="h-px bg-line my-6" />

          {/* 재화 이름 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">재화 이름</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="예: 다이아, 골드, 코인"
                value={basicSettingName}
                disabled={isLive}
                onChange={e => {
                  const v = e.target.value
                  setBasicSettingName(v)
                  setBasicSettingNamesMap(prev => ({ ...prev, [basicSettingCountry]: v }))
                  setBasicSettingErrors(prev => ({ ...prev, name: undefined }))
                }}
                className={`flex-1 px-3 py-2 bg-bg-tertiary border rounded-lg text-sm focus:outline-none focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed ${basicSettingErrors.name ? 'border-red-500' : 'border-line'}`}
              />
              <select
                value={basicSettingCountry}
                disabled={isLive}
                onChange={e => {
                  const c = e.target.value
                  setBasicSettingNamesMap(prev => ({ ...prev, [basicSettingCountry]: basicSettingName }))
                  setBasicSettingCountry(c)
                  setBasicSettingName(basicSettingNamesMap[c] ?? '')
                }}
                className="px-3 py-2 bg-bg-tertiary border border-line rounded-lg text-sm focus:outline-none focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {[{code:'KR',label:'한국'},{code:'US',label:'미국'},{code:'JP',label:'일본'},{code:'CN',label:'중국'},{code:'EU',label:'유럽'}].map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            {basicSettingErrors.name ? <p className="text-xs text-red-400">{basicSettingErrors.name}</p> : <p className="text-xs text-text-muted">상품 목록에서 재화 단위로 표시됩니다</p>}
          </div>
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <p className="text-xs text-text-muted mr-auto">{isLive ? '출시 중에는 판매 방식만 변경 가능합니다' : '게임 출시 이후에는 기본 세팅을 수정할 수 없습니다'}</p>
            <button
              disabled={basicSettingSaving}
              onClick={async () => {
                if (!gameId) return
                const finalNamesMap = { ...basicSettingNamesMap, [basicSettingCountry]: basicSettingName }
                const errors: { icon?: string; name?: string } = {}
                if (!basicSettingIsFree) {
                  if (!basicSettingIconFile && !gameData?.shopCurrencyIconUrl) errors.icon = '재화 아이콘을 선택해주세요'
                  if (!Object.values(finalNamesMap).some(v => v.trim())) errors.name = '재화 이름을 하나 이상 입력해주세요'
                }
                if (Object.keys(errors).length > 0) { setBasicSettingErrors(errors); return }
                setBasicSettingSaving(true)
                try {
                  await gameService.updateGame(gameId, { monetization: basicSettingIsFree ? 'free' : 'freemium' } as any)
                  if (!basicSettingIsFree) {
                    if (basicSettingIconFile) {
                      const data = await gameService.updateShopCurrencyIcon(gameId, basicSettingIconFile)
                      setGameData(prev => prev ? { ...prev, shopCurrencyIconUrl: data.shopCurrencyIconUrl } : prev)
                    }
                    const krName = finalNamesMap['KR'] || Object.values(finalNamesMap).find(v => v.trim()) || ''
                    const data = await gameService.updateShopCurrencyName(gameId, krName, finalNamesMap)
                    setGameData(prev => prev ? { ...prev, shopCurrencyName: data.shopCurrencyName, shopCurrencyNames: data.shopCurrencyNames } : prev)
                  }
                  setGameData(prev => prev ? { ...prev, monetization: basicSettingIsFree ? 'free' : 'freemium' } : prev)
                  await triggerReReview()
                  setBasicSettingModal(false)
                } catch { alert('저장에 실패했습니다') }
                finally { setBasicSettingSaving(false) }
              }}
              className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-hover font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {basicSettingSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        )})()}
      </Modal>

      <Modal open={itemModal} onClose={() => { setItemModal(false); resetNewItem() }} title="상품 추가" size="xl" disableBackdropClose showCloseButton>
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <div className="flex gap-5">
            {/* 왼쪽: 이미지 */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <div
                onClick={() => document.getElementById('new-item-img')?.click()}
                className={`w-36 h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-accent/50 transition-colors bg-bg-tertiary/30 overflow-hidden ${newItemErrors.image ? '!border-red-500' : 'border-line'}`}
              >
                {newItem.imagePreview ? (
                  <img src={newItem.imagePreview} alt="preview" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-text-muted mb-1.5" />
                    <span className="text-[10px] text-text-muted">PNG 이미지</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-text-muted">클릭하여 업로드</span>
              <input id="new-item-img" type="file" accept=".png,image/png" className="hidden" onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                setNewItem(p => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file) }))
                setNewItemErrors(p => ({ ...p, image: undefined }))
              }} />
            </div>

            {/* 오른쪽: 기본 정보 */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-[30fr_11fr] gap-3">
                <div>
                  <label className={labelCls}>상품명 *</label>
                  <div className="relative">
                    <input placeholder="예: 다이아 100개" value={newItem.name} onChange={e => { const v = e.target.value; setNewItem(p => ({ ...p, name: v })); setNameMap(prev => ({ ...prev, [newItem.country]: v })); setNewItemErrors(p => ({ ...p, name: undefined })) }} className={`${inputCls} w-full ${newItemErrors.name ? 'border-red-500' : ''}`} />
                    {newItemErrors.name && <div className="absolute left-2 top-full mt-1 z-10"><div className="w-2 h-2 bg-red-500 rotate-45 ml-2 -mb-1" /><div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">{newItemErrors.name}</div></div>}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>판매 국가</label>
                  <select value={newItem.country ?? 'KR'} onChange={e => {
                    const c = e.target.value
                    const savedName = nameMap[c] ?? ''
                    const currencyName = gameData?.shopCurrencyNames?.[c] ?? gameData?.shopCurrencyName ?? ''
                    countrySwitching.current = true
                    setNameMap(prev => ({ ...prev, [newItem.country]: newItem.name }))
                    setNewItem(p => ({ ...p, country: c, currency: COUNTRY_CURRENCY[c] ?? 'KRW', price: priceMap[c] ?? p.price, name: savedName, currencyType: currencyName }))
                  }} className={inputCls}>
                    <option value="KR">한국</option>
                    <option value="US">미국</option>
                    <option value="JP">일본</option>
                    <option value="CN">중국</option>
                    <option value="EU">유럽</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-[30fr_11fr] gap-3 items-end">
                <div>
                  <label className={labelCls}>판매가 *</label>
                  <div className="relative">
                    <div className={`flex items-center bg-bg-tertiary border rounded-md overflow-hidden focus-within:border-accent ${newItemErrors.price ? 'border-red-500' : 'border-line'}`}>
                      <input type="number" placeholder="9900" value={newItem.price} onChange={e => { setNewItem(p => ({ ...p, price: e.target.value })); setNewItemErrors(p => ({ ...p, price: undefined })) }} className="flex-1 px-3 py-2 bg-transparent text-sm focus:outline-none" />
                      <span className="px-3 py-2 text-xs text-text-secondary border-l border-line bg-bg-secondary whitespace-nowrap">{newItem.currency}</span>
                    </div>
                    {newItemErrors.price && <div className="absolute left-2 top-full mt-1 z-10"><div className="w-2 h-2 bg-red-500 rotate-45 ml-2 -mb-1" /><div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">{newItemErrors.price}</div></div>}
                  </div>
                </div>
                <button type="button" onClick={() => setPriceSettingModal(true)} className="w-full px-2 py-2 bg-accent border border-accent rounded-md text-xs text-white font-medium hover:bg-accent/80 transition-colors">환율 확인</button>
              </div>
            </div>
          </div>

          {/* 재화 정보 + 구매 가능 수량 */}
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 gap-y-3">
            {/* Row 1 Col 1: 지급 재화 */}
            <div className="flex flex-col gap-1 min-w-0 w-[95%]">
              <p className="text-xs font-medium text-text-secondary">지급 재화</p>
              <div className="flex items-center gap-2 p-3 bg-bg-tertiary border border-line rounded-xl h-11">
                <div className="w-6 h-6 rounded-md bg-bg-secondary border border-line flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {gameData?.shopCurrencyIconUrl
                    ? <img src={`${UPLOADS_URL}${gameData.shopCurrencyIconUrl}`} alt="재화" className="w-full h-full object-contain" />
                    : <div className="w-3 h-3 rounded-full bg-amber-500/30" />
                  }
                </div>
                <p className="text-sm font-medium truncate">
                  {(gameData?.shopCurrencyNames?.[newItem.country] ?? gameData?.shopCurrencyName) || <span className="text-text-muted">미설정</span>}
                </p>
              </div>
            </div>
            {/* Row 1 Col 2: 수량 */}
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-text-secondary">지급 수량</p>
              <div className="relative">
                <div className={`flex items-center p-3 bg-bg-tertiary border rounded-xl h-11 ${newItemErrors.currencyAmount ? 'border-red-500' : 'border-line'}`}>
                  <input type="number" placeholder="100" value={newItem.currencyAmount} onChange={e => { setNewItem(p => ({ ...p, currencyAmount: e.target.value })); setNewItemErrors(p => ({ ...p, currencyAmount: undefined })) }} className="w-48 bg-transparent text-sm focus:outline-none" />
                </div>
                {newItemErrors.currencyAmount && <div className="absolute left-2 bottom-full mb-1.5 z-10"><div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">{newItemErrors.currencyAmount}</div><div className="w-2 h-2 bg-red-500 rotate-45 ml-2 -mt-1" /></div>}
              </div>
            </div>
          </div>

          {/* 구매 가능 수량 */}
          <div className="mt-3 flex flex-col gap-1 w-[71%]">
            <label className={labelCls}>구매 가능 수량</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="수량 입력"
                  min={1}
                  value={newItem.stock === '무제한' ? '' : newItem.stock}
                  disabled={newItem.stock === '무제한'}
                  onChange={e => { setNewItem(p => ({ ...p, stock: e.target.value.replace(/[^0-9]/g, '') })); setNewItemErrors(p => ({ ...p, stock: undefined })) }}
                  className={`${inputCls} w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:text-text-muted ${newItemErrors.stock ? 'border-red-500' : ''}`}
                />
                {newItemErrors.stock && <div className="absolute left-2 top-full mt-1 z-10"><div className="w-2 h-2 bg-red-500 rotate-45 ml-2 -mb-1" /><div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">{newItemErrors.stock}</div></div>}
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={newItem.stock === '무제한'}
                  onChange={e => { setNewItem(p => ({ ...p, stock: e.target.checked ? '무제한' : '' })); if (e.target.checked) setNewItemErrors(p => ({ ...p, stock: undefined })) }}
                  className="w-7 h-7 accent-accent cursor-pointer"
                />
                <span className="text-base text-text-secondary">무제한</span>
              </label>
            </div>
          </div>

          {/* 특별 상품 */}
          <div className="mt-3 space-y-2">
            <label className={labelCls}>특별 상품</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="isSpecial" checked={!newItem.isSpecial} onChange={() => setNewItem(p => ({ ...p, isSpecial: false, specialImageFile: null, specialImagePreview: '' }))} className="w-4 h-4 accent-accent cursor-pointer" />
                <span className="text-sm text-text-secondary">미설정</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="isSpecial" checked={newItem.isSpecial} onChange={() => setNewItem(p => ({ ...p, isSpecial: true }))} className="w-4 h-4 accent-accent cursor-pointer" />
                <span className="text-sm text-text-secondary">설정</span>
              </label>
            </div>
            <p style={{ fontSize: '12px' }} className="text-text-muted">특별상품으로 설정 시 별도 팝업으로 노출됩니다.</p>
            {newItem.isSpecial && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div onClick={() => document.getElementById('special-item-img')?.click()} className={`w-16 h-16 rounded-xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center bg-bg-tertiary/50 flex-shrink-0 cursor-pointer hover:border-accent/60 transition-colors ${newItemErrors.specialImage ? '!border-red-500' : 'border-line'}`}>
                    {newItem.specialImagePreview
                      ? <img src={newItem.specialImagePreview} alt="특별 이미지" className="w-full h-full object-cover" />
                      : <>
                          <ImageIcon className="w-6 h-6 text-text-muted mb-1" />
                          <span className="text-[9px] text-text-muted">이미지</span>
                        </>
                    }
                  </div>
                  <span className="text-[10px] text-text-muted">클릭하여 업로드</span>
                </div>
                <input id="special-item-img" type="file" accept=".png,.jpg,.jpeg,image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setNewItem(p => ({ ...p, specialImageFile: file, specialImagePreview: URL.createObjectURL(file) }))
                  setNewItemErrors(p => ({ ...p, specialImage: undefined }))
                }} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-4">
            <div className="flex-1 max-w-[640px]">
              <label className={labelCls}>상품 ID</label>
              <div className="relative">
                <input placeholder="예: item_diamond_100" value={newItem.itemId ?? ''} onChange={e => { const v = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 32); setNewItem(p => ({ ...p, itemId: v })); setNewItemErrors(p => ({ ...p, itemId: undefined })) }} className={`${inputCls} w-full ${newItemErrors.itemId ? 'border-red-500' : ''}`} />
                {newItemErrors.itemId && <div className="absolute left-2 bottom-full mb-1.5 z-10"><div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">{newItemErrors.itemId}</div><div className="w-2 h-2 bg-red-500 rotate-45 ml-2 -mt-1" /></div>}
              </div>
              <p style={{ fontSize: '9px' }} className="mt-1 text-text-tertiary">*영문, 숫자, 하이픈(-), 언더바(_)만 사용 가능하며, 32자 이하로 입력, 동일한 값은 사용할 수 없습니다</p>
            </div>
            <div className="flex gap-3">
              <button onClick={addItem} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium">등록</button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={editItemModal} onClose={() => { setEditItemModal(false); setEditingItem(null); setEditImageFile(null); setEditImagePreview(''); setEditSpecialImageFile(null); setEditSpecialImagePreview(''); setEditItemErrors({}) }} title="상품 편집" size="xl" disableBackdropClose showCloseButton>
        {editingItem && (
          <div className="max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex gap-5">
              {/* 왼쪽: 이미지 */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div
                  onClick={() => document.getElementById('edit-item-img')?.click()}
                  className="w-36 h-36 border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-accent/50 transition-colors bg-bg-tertiary/30 overflow-hidden"
                >
                  {editImagePreview || editingItem.imageUrl ? (
                    <img src={editImagePreview || `${UPLOADS_URL}${editingItem.imageUrl}`} alt="preview" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-text-muted mb-1.5" />
                      <span className="text-[10px] text-text-muted">PNG 이미지</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-text-muted">클릭하여 업로드</span>
                <input id="edit-item-img" type="file" accept=".png,image/png" className="hidden" onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setEditImageFile(file)
                  setEditImagePreview(URL.createObjectURL(file))
                }} />
              </div>

              {/* 오른쪽: 기본 정보 */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-[30fr_11fr] gap-3">
                  <div>
                    <label className={labelCls}>상품명 *</label>
                    <input value={editingItem.name} onChange={e => setEditingItem(p => p ? { ...p, name: e.target.value } : null)} className={`${inputCls} w-full`} />
                  </div>
                  <div>
                    <label className={labelCls}>판매 국가</label>
                    <select value={editingItem.currency === 'KRW' ? 'KR' : editingItem.currency === 'USD' ? 'US' : editingItem.currency === 'EUR' ? 'EU' : 'KR'} onChange={e => { const c = e.target.value; setEditingItem(p => p ? { ...p, currency: COUNTRY_CURRENCY[c] ?? 'KRW' } : null) }} className={inputCls}>
                      <option value="KR">한국</option>
                      <option value="US">미국</option>
                      <option value="JP">일본</option>
                      <option value="CN">중국</option>
                      <option value="EU">유럽</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-[30fr_11fr] gap-3 items-end">
                  <div>
                    <label className={labelCls}>판매가 *</label>
                    <div className="flex items-center bg-bg-tertiary border border-line rounded-md overflow-hidden focus-within:border-accent">
                      <input type="number" value={editingItem.price} onChange={e => setEditingItem(p => p ? { ...p, price: Number(e.target.value) } : null)} className="flex-1 px-3 py-2 bg-transparent text-sm focus:outline-none" />
                      <span className="px-3 py-2 text-xs text-text-secondary border-l border-line bg-bg-secondary whitespace-nowrap">{editingItem.currency}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setPriceSettingModal(true)} className="w-full px-2 py-2 bg-accent border border-accent rounded-md text-xs text-white font-medium hover:bg-accent/80 transition-colors">환율 확인</button>
                </div>
              </div>
            </div>

            {/* 지급 재화 + 수량 */}
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 gap-y-3">
              <div className="flex flex-col gap-1 min-w-0 w-[95%]">
                <p className="text-xs font-medium text-text-secondary">지급 재화</p>
                <div className="flex items-center gap-2 p-3 bg-bg-tertiary border border-line rounded-xl h-11">
                  <div className="w-6 h-6 rounded-md bg-bg-secondary border border-line flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {gameData?.shopCurrencyIconUrl
                      ? <img src={`${UPLOADS_URL}${gameData.shopCurrencyIconUrl}`} alt="재화" className="w-full h-full object-contain" />
                      : <div className="w-3 h-3 rounded-full bg-amber-500/30" />
                    }
                  </div>
                  <p className="text-sm font-medium truncate">
                    {gameData?.shopCurrencyName || <span className="text-text-muted">미설정</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-text-secondary">지급 수량</p>
                <div className="flex items-center p-3 bg-bg-tertiary border border-line rounded-xl h-11">
                  <input type="number" placeholder="100" value={editingItem.currencyAmount} onChange={e => setEditingItem(p => p ? { ...p, currencyAmount: Number(e.target.value) } : null)} className="w-48 bg-transparent text-sm focus:outline-none" />
                </div>
              </div>
            </div>

            {/* 구매 가능 수량 */}
            <div className="mt-3 flex flex-col gap-1 w-[71%]">
              <label className={labelCls}>구매 가능 수량</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    placeholder="수량 입력"
                    min={1}
                    value={editingItem.stock === '무제한' ? '' : editingItem.stock}
                    disabled={editingItem.stock === '무제한'}
                    onChange={e => { setEditingItem(p => p ? { ...p, stock: e.target.value.replace(/[^0-9]/g, '') } : null); setEditItemErrors({}) }}
                    className={`${inputCls} w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:text-text-muted ${editItemErrors.stock ? 'border-red-500' : ''}`}
                  />
                  {editItemErrors.stock && <div className="absolute left-2 top-full mt-1 z-10"><div className="w-2 h-2 bg-red-500 rotate-45 ml-2 -mb-1" /><div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">{editItemErrors.stock}</div></div>}
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={editingItem.stock === '무제한'}
                    onChange={e => { setEditingItem(p => p ? { ...p, stock: e.target.checked ? '무제한' : '' } : null); if (e.target.checked) setEditItemErrors({}) }}
                    className="w-7 h-7 accent-accent cursor-pointer"
                  />
                  <span className="text-base text-text-secondary">무제한</span>
                </label>
              </div>
            </div>

            {/* 특별 상품 */}
            <div className="mt-3 space-y-2">
              <label className={labelCls}>특별 상품</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="edit-isSpecial" checked={!editingItem.isSpecial} onChange={() => setEditingItem(p => p ? { ...p, isSpecial: false } : null)} className="w-4 h-4 accent-accent cursor-pointer" />
                  <span className="text-sm text-text-secondary">미설정</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="edit-isSpecial" checked={!!editingItem.isSpecial} onChange={() => setEditingItem(p => p ? { ...p, isSpecial: true } : null)} className="w-4 h-4 accent-accent cursor-pointer" />
                  <span className="text-sm text-text-secondary">설정</span>
                </label>
              </div>
              <p style={{ fontSize: '12px' }} className="text-text-muted">특별상품으로 설정 시 별도 팝업으로 노출됩니다.</p>
              {editingItem.isSpecial && (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div onClick={() => document.getElementById('edit-special-img')?.click()} className={`w-16 h-16 rounded-xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center bg-bg-tertiary/50 flex-shrink-0 cursor-pointer hover:border-accent/60 transition-colors ${editItemErrors.specialImage ? '!border-red-500' : 'border-line'}`}>
                      {editSpecialImagePreview || editingItem.specialImageUrl ? (
                        <img src={editSpecialImagePreview || `${UPLOADS_URL}${editingItem.specialImageUrl}`} alt="특별 이미지" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-text-muted mb-1" />
                          <span className="text-[9px] text-text-muted">이미지</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted">클릭하여 업로드</span>
                  </div>
                  <input id="edit-special-img" type="file" accept=".png,.jpg,.jpeg,image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setEditSpecialImageFile(file)
                    setEditSpecialImagePreview(URL.createObjectURL(file))
                    setEditItemErrors(p => ({ ...p, specialImage: undefined }))
                  }} />
                </div>
              )}
            </div>



            <div className="flex items-center justify-between gap-3 pt-4">
              <div className="flex-1 max-w-[640px]">
                <label className={labelCls}>상품 ID</label>
                <div className="relative">
                  <input value={editingItem.itemId ?? ''} readOnly className={`${inputCls} w-full cursor-not-allowed`} />
                </div>
                <p style={{ fontSize: '9px' }} className="mt-1 text-text-tertiary">*영문, 숫자, 하이픈(-), 언더바(_)만 사용 가능하며, 32자 이하로 입력, 동일한 값은 사용할 수 없습니다</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { if (editingItem) { deleteItem(editingItem._id); setEditItemModal(false); setEditingItem(null) } }} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium text-white">삭제</button>
                <button onClick={saveEditItem} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium">저장</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={priceSettingModal} onClose={() => setPriceSettingModal(false)} title="나라별 환율 가격" disableBackdropClose showCloseButton>
        <div className="space-y-3">
          {!priceModalPrice ? (
            <p className="text-sm text-text-secondary text-center py-4">판매가를 먼저 입력해주세요.</p>
          ) : (
            <>
              <p className="text-xs text-text-tertiary">기준가 <span className="font-semibold text-text-primary">{Number(priceModalPrice).toLocaleString()} {priceModalCurrency}</span></p>
              <div className="divide-y divide-line">
                {COUNTRY_INFO.map(c => (
                  <div key={c.code} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-text-tertiary">{c.currency}</span>
                    </div>
                    <span className="text-sm font-semibold">{c.symbol}{Number(priceModalMap[c.code] ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-3 bg-bg-tertiary rounded-lg space-y-1">
                <p className="text-[10px] text-text-tertiary">판매 국가 변경 시 해당 환율 금액이 판매가에 자동 세팅됩니다.</p>
                {rateDate && <p className="text-[10px] text-text-tertiary">{rateDate} 환율 적용</p>}
              </div>
            </>
          )}
        </div>
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
      </div>{/* 탭 콘텐츠 wrapper end */}
    </div>
  )
}