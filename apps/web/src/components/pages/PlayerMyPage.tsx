'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import playerService, { Activity, ActivityScoreItem } from '@/services/playerService'
import { authService } from '@/services/authService'
import MyInquiryTab from '@/components/MyInquiryTab'
import { gameService } from '@/services/gameService'
import { FILTER_GENRES } from '@/constants/game'
import MiniHomeManagementPage from '@/components/pages/MiniHomeManagementPage'
import {
  Activity as ActivityIcon, Award,
  Edit2, Lock, Trash2, Check, X, Loader2, ChevronRight, Eye, EyeOff, HelpCircle, Building2, Camera,
  MessageCircleQuestion,
} from 'lucide-react'
import LevelBadge from '@/components/LevelBadge'
import OfficialBadge from '@/components/OfficialBadge'
import AdminBadge from '@/components/AdminBadge'
import TwoFactorSettings from '@/components/TwoFactorSettings'
import { formatDate } from '@/lib/formatDate'

const ACTIVITY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  play:      { label: '게임 플레이',  icon: '🎮', color: 'text-cyan-400'   },
  review:    { label: '리뷰 작성',   icon: '✍️', color: 'text-purple-400' },
  helpful:   { label: '추천 표시',  icon: '👍', color: 'text-accent'  },
}

const GENRE_LIST = FILTER_GENRES.filter(g => g !== '전체')

interface MyQA {
  _id: string
  gameId: { _id: string; title: string } | string
  question: string
  answer?: string
  answeredAt?: string
  isPublic: boolean
  createdAt: string
}

const ACTIVITY_SCORE_CONFIG: Record<string, { label: string; icon: string }> = {
  login:                { label: '로그인',        icon: '🔑' },
  stay_time:            { label: '체류 시간',     icon: '⏱️' },
  post_write:           { label: '글 작성',       icon: '📝' },
  post_delete:          { label: '글 삭제',       icon: '🗑️' },
  comment_write:        { label: '댓글 작성',     icon: '💬' },
  comment_delete:       { label: '댓글 삭제',     icon: '🗑️' },
  recommend_received:   { label: '추천 받음',     icon: '👍' },
  recommend_cancelled:  { label: '추천 취소',     icon: '👎' },
  game_access:          { label: '게임 접속',     icon: '🎮' },
  game_stay_time:       { label: '게임 체류',     icon: '⏰' },
  game_event_reward:    { label: '이벤트 보상',   icon: '🎁' },
  game_payment_reward:  { label: '결제 보상',     icon: '💰' },
  game_account_create:  { label: '게임 계정 생성', icon: '🆕' },
  game_daily_login:     { label: '게임 일일 로그인', icon: '📅' },
  game_play_time:       { label: '게임 플레이 시간', icon: '🕹️' },
  game_purchase:        { label: '게임 구매',     icon: '🛒' },
  game_event_participate: { label: '이벤트 참여', icon: '🎉' },
  game_level_achieve:   { label: '레벨 달성',     icon: '⭐' },
  game_ranking:         { label: '랭킹',          icon: '🏆' },
  admin_grant:          { label: '관리자 지급',   icon: '✅' },
  admin_deduct:         { label: '관리자 차감',   icon: '❌' },
}

type Tab = 'activity' | 'activityPoints' | 'qa' | 'profile' | 'inquiry' | 'security'

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
      type === 'success' ? 'bg-accent text-text-primary' : 'bg-red-600 text-text-primary'
    }`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {msg}
    </div>
  )
}

export default function PlayerMyPage() {
  const { user, isAuthenticated, isLoading, logout, updateUser } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('profile')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  // ── 계정 정보 탭 표시용: 가입일 / 최근 로그인 ──
  const [accountMeta, setAccountMeta] = useState<{ createdAt?: string; lastLoginAt?: string }>({})
  useEffect(() => {
    if (!isAuthenticated) return
    authService.getProfile()
      .then((data) => {
        const u = data.user ?? data
        setAccountMeta({ createdAt: u.createdAt, lastLoginAt: u.lastLoginAt })
      })
      .catch(() => {})
  }, [isAuthenticated])

  // ── 활동 ──
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityStats, setActivityStats] = useState({ playCount: 0, reviewCount: 0 })

  // ── 활동포인트 ──
  const [activityScores, setActivityScores] = useState<ActivityScoreItem[]>([])
  const [activityScoreTotal, setActivityScoreTotal] = useState(0)
  const [activityScorePage, setActivityScorePage] = useState(1)
  const [activityScoreLoading, setActivityScoreLoading] = useState(false)
  const [activityScoreFilter, setActivityScoreFilter] = useState<string>('')
  const activityScoreLoadedRef = useRef(false)

  // ── Q&A ──
  const [myQAs, setMyQAs] = useState<MyQA[]>([])
  const [qaTotal, setQaTotal] = useState(0)
  const [qaLoading, setQaLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const qaLoadedRef = useRef(false)

  const loadMyQAs = useCallback(async () => {
    setQaLoading(true)
    try {
      const data = await gameService.getMyQAs({ limit: 20 })
      setMyQAs(data.qas || [])
      setQaTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setQaLoading(false)
    }
  }, [])

  const loadActivityScores = useCallback(async (page = 1, type = '') => {
    setActivityScoreLoading(true)
    try {
      const params: { page: number; limit: number; type?: string } = { page, limit: 20 }
      if (type) params.type = type
      const data = await playerService.getMyActivityScores(params)
      setActivityScores(data.history || [])
      setActivityScoreTotal(data.total || 0)
      setActivityScorePage(data.page || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setActivityScoreLoading(false)
    }
  }, [])

  // 활동포인트 탭 최초 진입 시 로드
  useEffect(() => {
    if (tab === 'activityPoints' && !activityScoreLoadedRef.current) {
      activityScoreLoadedRef.current = true
      loadActivityScores(1, activityScoreFilter)
    }
  }, [tab, loadActivityScores, activityScoreFilter])

  // Q&A 초기 카운트 로드 (한 번만)
  useEffect(() => {
    if (!qaLoadedRef.current) {
      qaLoadedRef.current = true
      loadMyQAs()
    }
  }, [loadMyQAs])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const actData = await playerService.getMyActivity({ limit: 20 })
      setActivities(actData.activities)
      setActivityStats(actData.stats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── 프로필 편집 ──
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    bio: (user as any)?.bio || '',
    favoriteGenres: (user as any)?.favoriteGenres || [] as string[],
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileEditing, setProfileEditing] = useState(false)

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username,
        bio: (user as any).bio || '',
        favoriteGenres: (user as any).favoriteGenres || [],
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username, (user as any)?.bio, JSON.stringify((user as any)?.favoriteGenres)])

  // ── 프로필 이미지 변경 ──
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 업로드 가능합니다', 'error'); e.target.value = ''; return }
    if (file.size > 2 * 1024 * 1024) { showToast('2MB 이하의 이미지만 업로드 가능합니다', 'error'); e.target.value = ''; return }
    setAvatarUploading(true)
    try {
      await authService.uploadAvatar(file)
      await updateUser({})
      showToast('프로필 이미지가 변경되었습니다')
    } catch (err: any) {
      showToast(err?.response?.data?.message || '업로드 실패', 'error')
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const toggleGenre = (g: string) => {
    setProfileForm((prev) => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(g)
        ? prev.favoriteGenres.filter((x: string) => x !== g)
        : [...prev.favoriteGenres, g]
    }))
  }

  const handleSaveProfile = async () => {
    if (!profileForm.username.trim()) {
      showToast('사용자명을 입력해주세요', 'error')
      return
    }
    setProfileSaving(true)
    try {
      const data = await authService.updateProfile(profileForm)
      updateUser({ username: data.user.username, bio: data.user.bio, favoriteGenres: data.user.favoriteGenres })
      setProfileEditing(false)
      showToast('프로필이 저장되었습니다')
    } catch (err: any) {
      showToast(err?.response?.data?.message || '저장 실패', 'error')
    } finally {
      setProfileSaving(false)
    }
  }

  // ── 비밀번호 변경 ──
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      showToast('모든 항목을 입력해주세요', 'error'); return
    }
    if (pwForm.newPassword.length < 8) {
      showToast('새 비밀번호는 8자 이상이어야 합니다', 'error'); return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('새 비밀번호가 일치하지 않습니다', 'error'); return
    }
    setPwSaving(true)
    try {
      await authService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showToast('비밀번호가 변경되었습니다')
    } catch (err: any) {
      showToast(err?.response?.data?.message || '변경 실패', 'error')
    } finally {
      setPwSaving(false)
    }
  }

  // ── 계정 삭제 ──
  const [deleteModal, setDeleteModal] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteAccount = async () => {
    if (!deletePw) { showToast('비밀번호를 입력해주세요', 'error'); return }
    setDeleteLoading(true)
    try {
      await authService.deleteAccount({ password: deletePw })
      logout()
      router.replace('/')
    } catch (err: any) {
      showToast(err?.response?.data?.message || '삭제 실패', 'error')
      setDeleteLoading(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
    </div>
  )
  if (!isAuthenticated) return null

  const isCorporate = user?.memberType === 'corporate'

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile',   label: isCorporate ? '파트너 프로필' : '계정 정보', icon: isCorporate ? <Building2 className="w-4 h-4" /> : <Edit2 className="w-4 h-4" /> },
    { key: 'activity',  label: '활동 내역',               icon: <ActivityIcon className="w-4 h-4" /> },
    { key: 'activityPoints', label: '활동포인트',         icon: <Award className="w-4 h-4" /> },
    { key: 'qa',        label: `Q&A (${qaTotal})`,        icon: <HelpCircle className="w-4 h-4" /> },
    { key: 'inquiry',   label: '문의하기',                   icon: <MessageCircleQuestion className="w-4 h-4" /> },
    { key: 'security',  label: '보안 설정',                icon: <Lock className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* 프로필 헤더 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="absolute -top-20 -right-16 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-cyan-900/50 ring-2 ring-white/20 overflow-hidden">
                {user?.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.username?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                title="프로필 이미지 변경"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent hover:bg-accent-hover text-text-inverse flex items-center justify-center border-2 border-bg-secondary transition-colors disabled:opacity-50"
              >
                {avatarUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex-1">
              <h1 className="flex items-center gap-1.5 text-[22px] font-bold text-white">
                {user?.username}
                {user?.role === 'developer' && <OfficialBadge className="w-[19px] h-[19px]" />}
                {user?.role === 'admin' && <AdminBadge className="w-[19px] h-[19px]" />}
              </h1>
              <div className="mt-[7.8px]">
                <LevelBadge level={(user as any)?.level} size="md" />
              </div>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 + 콘텐츠 */}
        <div className="flex gap-6 items-start">
          {/* 좌측 사이드 탭 */}
          <div className="w-48 flex-shrink-0 space-y-1">
            {TABS.map((t) => {
              const disabled = t.key === 'inquiry' && user?.role === 'admin'
              return (
                <button
                  key={t.key}
                  onClick={() => !disabled && setTab(t.key)}
                  disabled={disabled}
                  title={disabled ? '관리자 계정은 문의하기를 이용할 수 없습니다' : undefined}
                  className={`w-full flex items-center gap-1.5 px-4 py-2.5 text-base font-medium border-l-2 whitespace-nowrap transition-colors ${
                    disabled
                      ? 'border-transparent text-text-muted opacity-40 cursor-not-allowed'
                      : tab === t.key
                      ? 'border-accent text-accent'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t.icon}{t.label}
                </button>
              )
            })}
          </div>

          {/* 우측 콘텐츠 */}
          <div className="flex-1 min-w-0 space-y-6">

        {/* ─── 활동 내역 탭 ─── */}
        {tab === 'activity' && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">플레이 <span className="text-cyan-400 font-semibold">{activityStats.playCount}</span></span>
              <span className="text-sm text-text-secondary">리뷰 <span className="text-purple-400 font-semibold">{activityStats.reviewCount}</span></span>
            </div>
            {loading ? <div className="text-center py-16 text-text-muted"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> :
            activities.length === 0 ? (
              <div className="text-center py-16 text-text-muted">
                <ActivityIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>활동 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => {
                const conf = ACTIVITY_CONFIG[act.type]
                const g = act.gameId
                return (
                  <div key={act._id} className="flex items-center gap-3 bg-bg-secondary border border-line rounded-xl p-4 hover:border-line transition-colors">
                    <span className="text-xl flex-shrink-0">{conf?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${conf?.color}`}>{conf?.label}</span>
                        {act.type === 'play' && act.sessionDuration && (
                          <span className="text-text-muted text-xs">({Math.round(act.sessionDuration / 60)}분)</span>
                        )}
                      </div>
                      {g && (
                        <Link href={`/games/${g._id}`} className="text-text-secondary text-xs hover:text-cyan-300 transition-colors truncate block">
                          {g.title}
                        </Link>
                      )}
                    </div>
                    <span className="text-text-muted text-xs flex-shrink-0">
                      {formatDate(act.createdAt)}
                    </span>
                  </div>
                )
              })}
              </div>
            )}
          </div>
        )}

        {/* ─── 활동포인트 탭 ─── */}
        {tab === 'activityPoints' && (
          <div className="space-y-4">
            {/* 레벨 / 점수 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-secondary border border-line rounded-xl p-4">
                <p className="text-text-secondary text-sm">레벨</p>
                <p className="text-text-primary text-xl font-bold mt-1">{`Lv.${(user as any)?.level ?? 1}`}</p>
              </div>
              <div className="bg-bg-secondary border border-line rounded-xl p-4">
                <p className="text-text-secondary text-sm">점수</p>
                <p className="text-text-primary text-xl font-bold mt-1">{((user as any)?.activityScore ?? 0).toLocaleString()}P</p>
              </div>
            </div>

            {/* 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={activityScoreFilter}
                onChange={(e) => {
                  setActivityScoreFilter(e.target.value)
                  activityScoreLoadedRef.current = false
                  loadActivityScores(1, e.target.value)
                }}
                className="bg-bg-secondary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan-500"
              >
                <option value="">전체 유형</option>
                {Object.entries(ACTIVITY_SCORE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
              <span className="text-sm text-text-muted">총 {activityScoreTotal}건</span>
            </div>

            {activityScoreLoading ? (
              <div className="text-center py-16 text-text-muted"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : activityScores.length === 0 ? (
              <div className="text-center py-16 text-text-muted">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>활동포인트 내역이 없습니다</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {activityScores.map((item) => {
                    const conf = ACTIVITY_SCORE_CONFIG[item.type]
                    const isPositive = item.amount > 0
                    return (
                      <div key={item._id} className="flex items-center gap-3 bg-bg-secondary border border-line rounded-xl p-4 hover:border-line transition-colors">
                        <span className="text-xl flex-shrink-0">{conf?.icon || '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">{conf?.label || item.type}</span>
                          </div>
                          <p className="text-xs text-text-muted truncate">{item.reason}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-sm font-bold ${isPositive ? 'text-accent' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{item.amount.toLocaleString()}P
                          </span>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 페이지네이션 */}
                {activityScoreTotal > 20 && (
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => { loadActivityScores(activityScorePage - 1, activityScoreFilter) }}
                      disabled={activityScorePage <= 1}
                      className="px-3 py-1.5 text-base border border-line rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    <span className="px-3 py-1.5 text-sm text-text-muted">
                      {activityScorePage} / {Math.ceil(activityScoreTotal / 20)}
                    </span>
                    <button
                      onClick={() => { loadActivityScores(activityScorePage + 1, activityScoreFilter) }}
                      disabled={activityScorePage >= Math.ceil(activityScoreTotal / 20)}
                      className="px-3 py-1.5 text-base border border-line rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Q&A 탭 ─── */}
        {tab === 'qa' && (
          qaLoading ? (
            <div className="text-center py-16 text-text-muted"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : myQAs.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>작성한 Q&A가 없습니다</p>
              <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-flex items-center gap-1">
                게임 둘러보기 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myQAs.map((qa) => {
                const gameTitle = typeof qa.gameId === 'object' ? qa.gameId.title : '알 수 없는 게임'
                const gameId = typeof qa.gameId === 'object' ? qa.gameId._id : qa.gameId
                return (
                  <div key={qa._id} className="bg-bg-secondary border border-line rounded-xl p-5 hover:border-line transition-colors">
                    {/* 상단: 게임명 + 상태 + 날짜 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/games/${gameId}`} className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                          {gameTitle}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          qa.answer
                            ? 'bg-accent-light text-accent border border-accent-muted'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                        }`}>
                          {qa.answer ? '답변완료' : '답변대기'}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">
                        {formatDate(qa.createdAt)}
                      </span>
                    </div>

                    {/* 내 질문 */}
                    <div className="bg-bg-tertiary/50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs text-cyan-400 font-medium">내 질문</span>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">{qa.question}</p>
                    </div>

                    {/* 개발사 답변 */}
                    {qa.answer ? (
                      <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-accent font-medium">개발사 답변</span>
                          {qa.answeredAt && (
                            <span className="text-xs text-text-muted">
                              {new Date(qa.answeredAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed">{qa.answer}</p>
                      </div>
                    ) : (
                      <div className="bg-bg-tertiary/30 border border-line/30 rounded-lg p-3">
                        <p className="text-sm text-text-muted italic">아직 답변이 없습니다. 개발사의 답변을 기다려주세요.</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ─── 프로필 편집 탭 ─── */}
        {tab === 'profile' && isCorporate && (
          <MiniHomeManagementPage />
        )}
        {tab === 'profile' && !isCorporate && (
          <div className="space-y-6">
            <div className="bg-bg-secondary border border-line rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-line">
                <h2 className="text-lg font-semibold">계정 정보</h2>
                {!profileEditing ? (
                  <button onClick={() => setProfileEditing(true)}
                    className="flex items-center gap-1.5 text-base text-accent hover:text-accent-hover transition-colors">
                    <Edit2 className="w-4 h-4" /> 편집
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setProfileEditing(false); setProfileForm({ username: user?.username || '', bio: (user as any)?.bio || '', favoriteGenres: (user as any)?.favoriteGenres || [] }) }}
                      className="text-base text-text-secondary hover:text-text-primary px-3 py-1.5 rounded border border-line hover:border-line transition-colors">
                      취소
                    </button>
                    <button onClick={handleSaveProfile} disabled={profileSaving}
                      className="flex items-center gap-1.5 text-base bg-accent hover:bg-accent-hover text-text-inverse px-3 py-1.5 rounded transition-colors disabled:opacity-50">
                      {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      저장
                    </button>
                  </div>
                )}
              </div>


              <div className="space-y-5">

                {/* 사용자명 */}
                <div className="grid grid-cols-4 gap-4 items-start">
                  <label className="text-text-secondary text-sm pt-2 col-span-1">사용자명</label>
                  <div className="col-span-3">
                    {profileEditing ? (
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
                        maxLength={20}
                        className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors"
                        placeholder="2~20자 사용자명"
                      />
                    ) : (
                      <p className="text-text-primary bg-bg-tertiary/50 border border-line rounded-lg px-3 py-2.5">{user?.username}</p>
                    )}
                  </div>
                </div>

                {/* 이메일 (읽기 전용) */}
                <div className="grid grid-cols-4 gap-4 items-start">
                  <label className="text-text-secondary text-sm pt-2 col-span-1">이메일</label>
                  <div className="col-span-3">
                    <input value={user?.email || ''} disabled readOnly className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                </div>

                {/* 가입일 (읽기 전용) */}
                <div className="grid grid-cols-4 gap-4 items-start">
                  <label className="text-text-secondary text-sm pt-2 col-span-1">가입일</label>
                  <div className="col-span-3">
                    <input value={accountMeta.createdAt ? formatDate(accountMeta.createdAt) : '-'} disabled readOnly className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                </div>

                {/* 최근 로그인 (읽기 전용) */}
                <div className="grid grid-cols-4 gap-4 items-start">
                  <label className="text-text-secondary text-sm pt-2 col-span-1">최근 로그인</label>
                  <div className="col-span-3">
                    <input value={accountMeta.lastLoginAt ? new Date(accountMeta.lastLoginAt).toLocaleString('ko-KR') : '-'} disabled readOnly className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                </div>

                {/* 관심 장르 */}
                <div className="grid grid-cols-4 gap-4 items-start">
                  <label className="text-text-secondary text-sm pt-2 col-span-1">관심 장르</label>
                  <div className="col-span-3">
                    <div className="flex flex-wrap gap-2">
                      {GENRE_LIST.map((g) => {
                        const selected = profileForm.favoriteGenres.includes(g)
                        return (
                          <button
                            key={g}
                            onClick={() => profileEditing && toggleGenre(g)}
                            disabled={!profileEditing}
                            className={`px-3 py-1.5 rounded-full text-base font-medium transition-colors ${
                              selected
                                ? 'bg-accent text-text-primary'
                                : profileEditing
                                ? 'bg-bg-tertiary text-text-secondary hover:bg-line-light hover:text-text-primary border border-line'
                                : 'bg-bg-tertiary/50 text-text-primary border border-line cursor-default'
                            }`}
                          >
                            {g}
                          </button>
                        )
                      })}
                    </div>
                    {!profileEditing && profileForm.favoriteGenres.length === 0 && (
                      <p className="text-xs text-text-muted mt-1">선택된 장르가 없습니다</p>
                    )}
                  </div>
                </div>

                {/* 자기소개 */}
                <div className="grid grid-cols-4 gap-4 items-start">
                  <label className="text-text-secondary text-sm pt-2 col-span-1">자기소개</label>
                  <div className="col-span-3">
                    {profileEditing ? (
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                        maxLength={200}
                        rows={3}
                        className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors resize-none"
                        placeholder="자신을 소개해주세요"
                      />
                    ) : (
                      <p className="text-text-primary bg-bg-tertiary/50 border border-line rounded-lg px-3 py-2.5 whitespace-pre-wrap min-h-[2.75rem]">{profileForm.bio || '-'}</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ─── 문의하기 탭 ─── */}
        {tab === 'inquiry' && <MyInquiryTab />}

        {/* ─── 보안 설정 탭 ─── */}
        {tab === 'security' && (
          <div className="space-y-6 max-w-[470px] mx-auto">
            {/* 비밀번호 변경 */}
            <div className="bg-bg-secondary border border-line rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-line">
                <h2 className="text-lg font-semibold">비밀번호 변경</h2>
              </div>

              <div className="space-y-4 max-w-md">
                {([
                  { key: 'current', label: '현재 비밀번호', field: 'currentPassword' },
                  { key: 'newPw',   label: '새 비밀번호 (8자 이상)',  field: 'newPassword' },
                  { key: 'confirm', label: '새 비밀번호 확인', field: 'confirmPassword' },
                ] as const).map(({ key, label, field }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
                    <div className="relative">
                      <input
                        type={showPw[key] ? 'text' : 'password'}
                        value={pwForm[field]}
                        onChange={(e) => setPwForm((p) => ({ ...p, [field]: e.target.value }))}
                        className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 pr-10 text-text-primary focus:outline-none focus:border-accent transition-colors"
                        placeholder="비밀번호 입력"
                        onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                      />
                      <button onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                        {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                {/* 새 비밀번호 일치 여부 표시 */}
                {pwForm.newPassword && pwForm.confirmPassword && (
                  <p className={`text-xs flex items-center gap-1 ${pwForm.newPassword === pwForm.confirmPassword ? 'text-accent' : 'text-red-400'}`}>
                    {pwForm.newPassword === pwForm.confirmPassword
                      ? <><Check className="w-3 h-3" /> 비밀번호가 일치합니다</>
                      : <><X className="w-3 h-3" /> 비밀번호가 일치하지 않습니다</>}
                  </p>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-text-inverse px-5 py-2.5 rounded-lg text-base font-medium transition-colors disabled:opacity-50 mt-2"
                >
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  비밀번호 변경
                </button>
              </div>
            </div>

            {/* 2단계 인증 */}
            <TwoFactorSettings />

            {/* 계정 삭제 */}
            <div className="flex justify-end">
              <button
                onClick={() => setDeleteModal(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-base font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 계정 삭제
              </button>
            </div>
          </div>
        )}

          </div>
        </div>
      </div>

      {/* 계정 삭제 확인 모달 */}
      {deleteModal && (
        <div className="fixed inset-0 bg-bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-red-800/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-bold text-red-300">정말로 계정을 삭제하시겠습니까?</h3>
            </div>
            <p className="text-text-secondary text-sm mb-5">
              삭제된 계정은 복구할 수 없습니다. 계속하려면 현재 비밀번호를 입력해주세요.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">비밀번호 확인</label>
              <input
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-red-500"
                placeholder="현재 비밀번호 입력"
                onKeyDown={(e) => e.key === 'Enter' && handleDeleteAccount()}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteModal(false); setDeletePw('') }}
                className="px-4 py-2 text-base text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 text-base bg-red-700 hover:bg-red-800 text-text-primary rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                삭제 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
