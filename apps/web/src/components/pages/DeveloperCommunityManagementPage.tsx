'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { gameService } from '@/services/gameService'
import AnnouncementManager, { AnnouncementFormValue } from '@/components/community/AnnouncementManager'
import GameReviewManager from '@/components/GameReviewManager'
import ConfirmModal from '@/components/ConfirmModal'

interface GameOption { _id: string; title: string; thumbnail?: string }
interface Announcement { _id: string; title: string; createdAt: string; type: string; priority: string; content: string; isPublished?: boolean }

type Tab = 'announcements' | 'reviews'

const TAB_META: Record<Tab, { title: string; desc: string }> = {
  announcements: { title: '공지 작성', desc: '게임 이용자에게 보여줄 공지를 작성하고 관리하세요.' },
  reviews:       { title: '리뷰 관리', desc: '게임에 남겨진 리뷰를 확인하고 관리하세요.' },
}

const ANNOUNCEMENT_TYPE_OPTIONS = [
  { value: 'notice', label: '공지' },
  { value: 'update', label: '업데이트' },
  { value: 'maintenance', label: '점검' },
  { value: 'event', label: '이벤트' },
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: '긴급' },
  { value: 'normal', label: '일반' },
  { value: 'low', label: '낮음' },
]

export default function DeveloperCommunityManagementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawTab = searchParams.get('tab') || 'announcements'
  const activeTab = (rawTab in TAB_META ? rawTab : 'announcements') as Tab

  const [games, setGames] = useState<GameOption[]>([])
  const [gameId, setGameId] = useState<string>(
    searchParams.get('gameId') || (typeof window !== 'undefined' ? localStorage.getItem('community_mgmt_gameId') || '' : '')
  )
  const [gameDropdownOpen, setGameDropdownOpen] = useState(false)
  const gameDropdownRef = useRef<HTMLDivElement>(null)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)
  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState<string | null>(null)

  // gameId → URL sync + localStorage 저장
  useEffect(() => {
    if (!gameId) return
    localStorage.setItem('community_mgmt_gameId', gameId)
    const params = new URLSearchParams(searchParams.toString())
    params.set('gameId', gameId)
    router.replace(`/community-management?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  // 게임 목록 로드
  useEffect(() => {
    gameService.getMyGames()
      .then((res) => {
        const list = ((res.games || []) as unknown as GameOption[])
          .filter((g: any) => g.status === 'published')
          .map(g => ({ _id: g._id, title: g.title, thumbnail: g.thumbnail }))
        setGames(list)
        if (list.length === 0) return
        const ids = list.map(g => g._id)
        if (gameId && ids.includes(gameId)) return
        const saved = localStorage.getItem('community_mgmt_gameId')
        setGameId(saved && ids.includes(saved) ? saved : list[0]._id)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gameDropdownRef.current && !gameDropdownRef.current.contains(e.target as Node)) {
        setGameDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
    if (activeTab === 'announcements') loadAnnouncements()
  }, [activeTab, loadAnnouncements])

  const addAnnouncement = async (data: AnnouncementFormValue) => {
    if (!gameId) return
    await gameService.createGameAnnouncement(gameId, {
      title: data.title, content: data.content,
      type: data.type, priority: data.priority,
      images: data.images, thumbnailIndex: data.thumbnailIndex,
      isPublished: data.isPublished,
    })
    loadAnnouncements()
  }
  const updateAnnouncement = async (announcementId: string, data: AnnouncementFormValue) => {
    if (!gameId) return
    await gameService.updateGameAnnouncement(gameId, announcementId, {
      title: data.title, content: data.content,
      type: data.type, priority: data.priority,
      images: data.images, thumbnailIndex: data.thumbnailIndex,
      isPublished: data.isPublished,
    })
    loadAnnouncements()
  }
  const deleteAnnouncement = async (announcementId: string) => {
    try {
      await gameService.deleteGameAnnouncement(gameId, announcementId)
      loadAnnouncements()
    } catch { /* ignore */ }
  }

  const selected = games.find(g => g._id === gameId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">게임 운영 · {TAB_META[activeTab].title}</h1>
        <p className="text-text-secondary">{TAB_META[activeTab].desc}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative" ref={gameDropdownRef}>
            <button
              onClick={() => setGameDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-line rounded-md text-base text-text-primary hover:bg-bg-secondary transition-colors min-w-[200px] justify-between"
            >
              {games.length === 0 ? (
                <span className="text-text-secondary">게임 없음</span>
              ) : selected ? (
                <span className="flex items-center gap-2 min-w-0">
                  {selected.thumbnail ? (
                    <Image src={selected.thumbnail} alt={selected.title} width={20} height={20} className="w-5 h-5 rounded object-cover flex-shrink-0" unoptimized />
                  ) : (
                    <span className="w-5 h-5 rounded bg-bg-secondary flex-shrink-0" />
                  )}
                  <span className="truncate">{selected.title}</span>
                </span>
              ) : <span className="text-text-secondary">게임 선택</span>}
              <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${gameDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {gameDropdownOpen && games.length > 0 && (
              <div className="absolute left-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
                {games.map(g => (
                  <button
                    key={g._id}
                    onClick={() => { setGameId(g._id); setGameDropdownOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-base transition-colors ${
                      g._id === gameId ? 'bg-accent text-text-primary font-semibold' : 'text-text-secondary hover:bg-bg-tertiary'
                    }`}
                  >
                    {g.thumbnail ? (
                      <Image src={g.thumbnail} alt={g.title} width={20} height={20} className="w-5 h-5 rounded object-cover flex-shrink-0" unoptimized />
                    ) : (
                      <span className="w-5 h-5 rounded bg-bg-secondary flex-shrink-0" />
                    )}
                    <span className="truncate">{g.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!gameId ? (
        <div className="text-text-secondary text-center py-16">관리할 게임을 선택하세요.</div>
      ) : activeTab === 'announcements' ? (
        <AnnouncementManager
          items={announcements}
          loading={announcementsLoading}
          typeOptions={ANNOUNCEMENT_TYPE_OPTIONS}
          priorityOptions={PRIORITY_OPTIONS}
          onCreate={addAnnouncement}
          onUpdate={updateAnnouncement}
          onDelete={item => setDeleteAnnouncementId(item._id)}
          uploadImages={async (files) => {
            const result = await gameService.uploadAnnouncementImages(gameId, files)
            return result.images
          }}
        />
      ) : (
        <GameReviewManager gameId={gameId} />
      )}

      <ConfirmModal
        isOpen={!!deleteAnnouncementId}
        title="공지 삭제"
        message="삭제하시겠습니까?"
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          if (!deleteAnnouncementId) return
          deleteAnnouncement(deleteAnnouncementId)
          setDeleteAnnouncementId(null)
        }}
        onCancel={() => setDeleteAnnouncementId(null)}
      />
    </div>
  )
}
