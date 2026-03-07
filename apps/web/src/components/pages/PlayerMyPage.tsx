'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import playerService, { FavoriteGame, Activity } from '@/services/playerService'
import { authService } from '@/services/authService'
import {
  User, Heart, Activity as ActivityIcon, Star,
  Edit2, Lock, Trash2, Check, X, Loader2, ChevronRight, Eye, EyeOff
} from 'lucide-react'

const ACTIVITY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  play:      { label: '게임 플레이',  icon: '🎮', color: 'text-cyan-400'   },
  review:    { label: '리뷰 작성',   icon: '✍️', color: 'text-purple-400' },
  favorite:  { label: '즐겨찾기 추가', icon: '❤️', color: 'text-pink-400'  },
  unfavorite:{ label: '즐겨찾기 해제', icon: '💔', color: 'text-slate-400' },
  helpful:   { label: '도움됨 표시',  icon: '👍', color: 'text-green-400'  },
}

const GENRE_LIST = ['RPG', '액션', 'FPS', '전략', '퍼즐', '스포츠', '레이싱', '어드벤처', '시뮬레이션']
const PLACEHOLDER = 'https://images.unsplash.com/photo-1738071665033-7ba9885c2c20?w=400&q=80'

type Tab = 'favorites' | 'activity' | 'profile' | 'security'

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {msg}
    </div>
  )
}

export default function PlayerMyPage() {
  const { user, isAuthenticated, logout, updateUser } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('favorites')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  // ── 즐겨찾기 ──
  const [favorites, setFavorites] = useState<FavoriteGame[]>([])
  const [favTotal, setFavTotal] = useState(0)

  // ── 활동 ──
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityStats, setActivityStats] = useState({ playCount: 0, reviewCount: 0, favoriteCount: 0 })

  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [favData, actData] = await Promise.all([
        playerService.getMyFavorites({ limit: 12 }),
        playerService.getMyActivity({ limit: 20 })
      ])
      setFavorites(favData.favorites)
      setFavTotal(favData.total)
      setActivities(actData.activities)
      setActivityStats(actData.stats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleUnfavorite = async (gameId: string) => {
    try {
      await playerService.toggleFavorite(gameId)
      setFavorites((prev) => prev.filter((f) => f.gameId._id !== gameId))
      setFavTotal((prev) => prev - 1)
      setActivityStats((prev) => ({ ...prev, favoriteCount: prev.favoriteCount - 1 }))
      showToast('즐겨찾기에서 제거했습니다')
    } catch {
      showToast('오류가 발생했습니다', 'error')
    }
  }

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
  }, [user])

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

  if (!isAuthenticated) return null

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'favorites', label: `즐겨찾기 (${favTotal})`, icon: <Heart className="w-4 h-4" /> },
    { key: 'activity',  label: '활동 내역',               icon: <ActivityIcon className="w-4 h-4" /> },
    { key: 'profile',   label: '프로필 편집',              icon: <Edit2 className="w-4 h-4" /> },
    { key: 'security',  label: '보안 설정',                icon: <Lock className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* 프로필 헤더 */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{user?.username}</h1>
              <p className="text-slate-400 text-sm">{user?.email}</p>
              {(user as any)?.bio && (
                <p className="text-slate-300 text-sm mt-1">{(user as any).bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs px-2 py-0.5 rounded">베타 테스터</span>
                {((user as any)?.favoriteGenres || []).map((g: string) => (
                  <span key={g} className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">{g}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center w-full sm:w-auto">
              <div>
                <p className="text-2xl font-bold text-cyan-400">{activityStats.playCount}</p>
                <p className="text-slate-500 text-xs mt-0.5">플레이</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{activityStats.reviewCount}</p>
                <p className="text-slate-500 text-xs mt-0.5">리뷰</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-400">{activityStats.favoriteCount}</p>
                <p className="text-slate-500 text-xs mt-0.5">즐겨찾기</p>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ─── 즐겨찾기 탭 ─── */}
        {tab === 'favorites' && (
          loading ? <div className="text-center py-16 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> :
          favorites.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>즐겨찾기한 게임이 없습니다</p>
              <Link href="/games" className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-flex items-center gap-1">
                게임 둘러보기 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favorites.map((fav) => {
                const g = fav.gameId
                if (!g) return null
                const imgUrl = g.thumbnail ? `/uploads/${g.thumbnail.replace('uploads/', '')}` : PLACEHOLDER
                return (
                  <div key={fav._id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group hover:border-slate-600 transition-colors">
                    <div className="relative">
                      <img src={imgUrl} alt={g.title} className="w-full aspect-video object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }} />
                      <button onClick={() => handleUnfavorite(g._id)}
                        className="absolute top-2 right-2 bg-slate-900/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/80"
                        title="즐겨찾기 해제">
                        <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400" />
                      </button>
                    </div>
                    <div className="p-3">
                      <Link href={`/games/${g._id}`} className="text-white text-sm font-medium hover:text-cyan-300 transition-colors line-clamp-1">{g.title}</Link>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-slate-500 text-xs">{g.genre || '기타'}</span>
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-yellow-400 text-xs">{(g.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ─── 활동 내역 탭 ─── */}
        {tab === 'activity' && (
          loading ? <div className="text-center py-16 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> :
          activities.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <ActivityIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>활동 내역이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((act) => {
                const conf = ACTIVITY_CONFIG[act.type]
                const g = act.gameId
                return (
                  <div key={act._id} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                    <span className="text-xl flex-shrink-0">{conf?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${conf?.color}`}>{conf?.label}</span>
                        {act.type === 'play' && act.sessionDuration && (
                          <span className="text-slate-500 text-xs">({Math.round(act.sessionDuration / 60)}분)</span>
                        )}
                      </div>
                      {g && (
                        <Link href={`/games/${g._id}`} className="text-slate-400 text-xs hover:text-cyan-300 transition-colors truncate block">
                          {g.title}
                        </Link>
                      )}
                    </div>
                    <span className="text-slate-600 text-xs flex-shrink-0">
                      {new Date(act.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ─── 프로필 편집 탭 ─── */}
        {tab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-semibold">기본 정보</h2>
                </div>
                {!profileEditing ? (
                  <button onClick={() => setProfileEditing(true)}
                    className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                    <Edit2 className="w-4 h-4" /> 편집
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setProfileEditing(false); setProfileForm({ username: user?.username || '', bio: (user as any)?.bio || '', favoriteGenres: (user as any)?.favoriteGenres || [] }) }}
                      className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                      취소
                    </button>
                    <button onClick={handleSaveProfile} disabled={profileSaving}
                      className="flex items-center gap-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50">
                      {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      저장
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {/* 아바타 */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
                    {user?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">프로필 아이콘은 사용자명 첫 글자로 자동 생성됩니다</p>
                  </div>
                </div>

                {/* 사용자명 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">사용자명 <span className="text-red-400">*</span></label>
                  {profileEditing ? (
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
                      maxLength={20}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                      placeholder="2~20자 사용자명"
                    />
                  ) : (
                    <p className="text-white bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5">{user?.username}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">{profileForm.username.length}/20</p>
                </div>

                {/* 이메일 (읽기 전용) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">이메일</label>
                  <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5">
                    <p className="text-slate-400 flex-1">{user?.email}</p>
                    <span className="text-xs text-slate-600 bg-slate-700 px-2 py-0.5 rounded">변경 불가</span>
                  </div>
                </div>

                {/* 자기소개 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">자기소개</label>
                  {profileEditing ? (
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                      maxLength={200}
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                      placeholder="간단한 자기소개를 입력하세요 (최대 200자)"
                    />
                  ) : (
                    <p className={`bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 min-h-[80px] ${profileForm.bio ? 'text-white' : 'text-slate-500'}`}>
                      {profileForm.bio || '자기소개가 없습니다'}
                    </p>
                  )}
                  {profileEditing && <p className="text-xs text-slate-500 mt-1">{profileForm.bio.length}/200</p>}
                </div>

                {/* 관심 장르 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">관심 장르</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRE_LIST.map((g) => {
                      const selected = profileForm.favoriteGenres.includes(g)
                      return (
                        <button
                          key={g}
                          onClick={() => profileEditing && toggleGenre(g)}
                          disabled={!profileEditing}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selected
                              ? 'bg-cyan-600 text-white'
                              : profileEditing
                              ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                              : 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-default'
                          }`}
                        >
                          {g}
                        </button>
                      )
                    })}
                  </div>
                  {!profileEditing && profileForm.favoriteGenres.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">선택된 장르가 없습니다</p>
                  )}
                </div>

                {/* 가입일 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">가입일</label>
                  <p className="text-slate-400 text-sm">
                    {user ? new Date((user as any).createdAt || Date.now()).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' }) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 보안 설정 탭 ─── */}
        {tab === 'security' && (
          <div className="space-y-6">
            {/* 비밀번호 변경 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Lock className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-semibold">비밀번호 변경</h2>
              </div>

              <div className="space-y-4 max-w-md">
                {([
                  { key: 'current', label: '현재 비밀번호', field: 'currentPassword' },
                  { key: 'newPw',   label: '새 비밀번호 (8자 이상)',  field: 'newPassword' },
                  { key: 'confirm', label: '새 비밀번호 확인', field: 'confirmPassword' },
                ] as const).map(({ key, label, field }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
                    <div className="relative">
                      <input
                        type={showPw[key] ? 'text' : 'password'}
                        value={pwForm[field]}
                        onChange={(e) => setPwForm((p) => ({ ...p, [field]: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 pr-10 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                        placeholder="비밀번호 입력"
                        onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                      />
                      <button onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                {/* 새 비밀번호 일치 여부 표시 */}
                {pwForm.newPassword && pwForm.confirmPassword && (
                  <p className={`text-xs flex items-center gap-1 ${pwForm.newPassword === pwForm.confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                    {pwForm.newPassword === pwForm.confirmPassword
                      ? <><Check className="w-3 h-3" /> 비밀번호가 일치합니다</>
                      : <><X className="w-3 h-3" /> 비밀번호가 일치하지 않습니다</>}
                  </p>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 mt-2"
                >
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  비밀번호 변경
                </button>
              </div>
            </div>

            {/* 계정 삭제 */}
            <div className="bg-slate-900 border border-red-900/40 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-semibold text-red-300">계정 삭제</h2>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                계정을 삭제하면 즐겨찾기, 리뷰, 활동 내역 등 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <button
                onClick={() => setDeleteModal(true)}
                className="flex items-center gap-2 border border-red-600 text-red-400 hover:bg-red-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 계정 삭제
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 계정 삭제 확인 모달 */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-bold text-red-300">정말로 계정을 삭제하시겠습니까?</h3>
            </div>
            <p className="text-slate-400 text-sm mb-5">
              삭제된 계정은 복구할 수 없습니다. 계속하려면 현재 비밀번호를 입력해주세요.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">비밀번호 확인</label>
              <input
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-red-500"
                placeholder="현재 비밀번호 입력"
                onKeyDown={(e) => e.key === 'Enter' && handleDeleteAccount()}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteModal(false); setDeletePw('') }}
                className="px-4 py-2 text-sm text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors disabled:opacity-50"
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
