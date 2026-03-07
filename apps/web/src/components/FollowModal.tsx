'use client'
import { useState, useEffect } from 'react'
import { X, Loader2, Shield, Wrench } from 'lucide-react'
import playerService, { FollowUser } from '@/services/playerService'

interface FollowModalProps {
  userId: string
  type: 'followers' | 'following'
  isOpen: boolean
  onClose: () => void
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') return <span className="flex items-center gap-0.5 text-purple-400 text-xs font-semibold"><Shield className="w-3 h-3" />관리자</span>
  if (role === 'developer') return <span className="flex items-center gap-0.5 text-cyan-400 text-xs font-semibold"><Wrench className="w-3 h-3" />개발사</span>
  return null
}

function UserAvatar({ user }: { user: FollowUser }) {
  const bg = user.role === 'admin' ? 'bg-purple-600' : user.role === 'developer' ? 'bg-cyan-600' : 'bg-slate-600'
  if (user.profileImage) {
    return <img src={user.profileImage} alt={user.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${bg}`}>
      {user.username[0]?.toUpperCase()}
    </div>
  )
}

export default function FollowModal({ userId, type, isOpen, onClose }: FollowModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setUsers([])
    setPage(1)
    setTotal(0)
    loadUsers(1, true)
  }, [isOpen, type, userId])

  const loadUsers = async (p: number, reset = false) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)
    try {
      if (type === 'followers') {
        const data = await playerService.getFollowers(userId, p)
        setUsers(reset ? data.followers : (prev) => [...prev, ...data.followers])
        setTotal(data.total)
      } else {
        const data = await playerService.getFollowing(userId, p)
        setUsers(reset ? data.following : (prev) => [...prev, ...data.following])
        setTotal(data.total)
      }
    } catch {
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    loadUsers(next)
  }

  if (!isOpen) return null

  const title = type === 'followers' ? '팔로워' : '팔로잉'
  const hasMore = users.length < total

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-white font-bold text-base">
            {title} <span className="text-slate-400 font-normal text-sm">{total}</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              {type === 'followers' ? '팔로워가 없습니다' : '팔로잉하는 사람이 없습니다'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {users.map((u) => (
                <li key={u._id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/50 transition-colors">
                  <UserAvatar user={u} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold truncate ${
                        u.role === 'admin' ? 'text-purple-300' : u.role === 'developer' ? 'text-cyan-300' : 'text-white'
                      }`}>
                        {u.username}
                      </span>
                      <RoleBadge role={u.role} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasMore && !loading && (
            <div className="px-5 py-3 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                더 보기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
