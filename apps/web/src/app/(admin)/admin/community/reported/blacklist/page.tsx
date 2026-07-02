'use client'
import { useCallback, useEffect, useState } from 'react'
import { Search, Loader2, AlertCircle, CheckCircle, History } from 'lucide-react'
import AdminLayout from '@/components/AdminLayout'
import adminService, { ReportedUser } from '@/services/adminService'

const HISTORY_META: Record<string, { label: string; cls: string }> = {
  report:  { label: '신고',     cls: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  appeal:  { label: '이의신청', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  ban:     { label: '차단',     cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  unban:   { label: '차단해제', cls: 'bg-green-500/10 text-green-400 border-green-500/30' },
}

function HistoryModal({ user, onClose }: { user: ReportedUser; onClose: () => void }) {
  const history = user.history ?? []
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-primary font-semibold text-sm flex items-center gap-2">
            <History className="w-4 h-4" /> {user.username} 히스토리
          </h3>
          <span className="text-xs text-text-muted">{history.length}건</span>
        </div>
        {history.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-8">기록이 없습니다</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {history.map((h, i) => {
              const meta = HISTORY_META[h.type] ?? { label: h.type, cls: 'bg-bg-tertiary text-text-secondary border-line' }
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-line last:border-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 mt-0.5 ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary break-words">{h.content}</p>
                    <p className="text-xs text-text-muted mt-0.5">{formatDate(h.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary">닫기</button>
        </div>
      </div>
    </div>
  )
}

function AppealViewModal({ appeal, username, onClose }: {
  appeal: { content: string; createdAt: string }
  username: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-text-primary font-semibold text-sm">{username}의 이의 신청</h3>
          <span className="text-xs text-text-muted">{appeal.createdAt}</span>
        </div>
        <p className="text-text-secondary text-sm whitespace-pre-wrap break-words leading-relaxed bg-bg-tertiary rounded-lg px-3 py-2.5">
          {appeal.content}
        </p>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${ok ? 'bg-accent' : 'bg-red-600'} text-white`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  )
}


function formatDate(date?: string) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function formatRemaining(bannedUntil?: string) {
  if (!bannedUntil) return '영구'
  const diff = new Date(bannedUntil).getTime() - Date.now()
  if (diff <= 0) return '만료'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}일 ${hours}시간`
  const mins = Math.floor((diff % 3600000) / 60000)
  return `${hours}시간 ${mins}분`
}

export function ReportedUsersTab() {
  const [users, setUsers] = useState<ReportedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'banned' | 'active'>('all')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [appealTarget, setAppealTarget] = useState<ReportedUser | null>(null)
  const [historyTarget, setHistoryTarget] = useState<ReportedUser | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getReportedUsers()
      setUsers(data.users)
    } catch {
      showToast('목록 불러오기 실패', false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    if (filter === 'banned' && u.isActive) return false
    if (filter === 'active' && !u.isActive) return false
    if (search) {
      const q = search.toLowerCase()
      return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <>
      {toast && <Toast {...toast} />}
      {historyTarget && <HistoryModal user={historyTarget} onClose={() => setHistoryTarget(null)} />}
      {appealTarget?.appeal && (
        <AppealViewModal
          appeal={{ content: appealTarget.appeal.content, createdAt: formatDate(appealTarget.appeal.createdAt) }}
          username={appealTarget.username}
          onClose={() => setAppealTarget(null)}
        />
      )}
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="유저명·이메일 검색..."
              className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
            className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
            <option value="all">전체</option>
            <option value="banned">차단됨</option>
            <option value="active">활동 중</option>
          </select>
          <span className="text-text-muted text-sm flex-shrink-0">
            총 <span className="text-text-primary font-semibold">{filtered.length}</span>명
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">신고된 유저가 없습니다</div>
        ) : (
          <div className="rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg-tertiary text-xs text-text-secondary font-semibold uppercase tracking-wide">
                  <th className="px-4 py-3 text-left border-r border-line/30">유저</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap border-r border-line/30">총 신고수</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap border-r border-line/30">게시글 신고</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap border-r border-line/30">댓글 신고</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap border-r border-line/30">상태</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap border-r border-line/30">차단 일자</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap border-r border-line/30">남은 기간</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap border-r border-line/30">이의 신청</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">히스토리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u._id} className="border-t border-line bg-bg-secondary hover:bg-bg-tertiary transition-colors">
                    <td className="px-4 py-3 border-r border-line/20">
                      <div className="font-medium text-text-primary">{u.username}</div>
                      <div className="text-xs text-text-muted">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-text-primary border-r border-line/20">
                      {u.totalReportCount}
                    </td>
                    <td className="px-4 py-3 text-center text-text-primary border-r border-line/20">
                      {u.postReportCount}
                    </td>
                    <td className="px-4 py-3 text-center text-text-primary border-r border-line/20">
                      {u.commentReportCount}
                    </td>
                    <td className="px-4 py-3 text-center text-text-primary border-r border-line/20">
                      {u.isActive ? '활동 중' : (() => {
                        const s = u.banScope ?? []
                        return s.includes('posts') && s.includes('comments') ? '전체 차단'
                          : s.includes('posts') ? '게시글 차단'
                          : s.includes('comments') ? '댓글 차단' : '차단'
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center text-xs whitespace-nowrap text-text-primary border-r border-line/20">
                      {u.isActive ? '-' : formatDate(u.bannedAt)}
                    </td>
                    <td className="px-4 py-3 text-center text-xs whitespace-nowrap text-text-primary border-r border-line/20">
                      {u.isActive ? '-' : formatRemaining(u.bannedUntil)}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-line/20">
                      {u.appeal ? (
                        <button onClick={() => setAppealTarget(u)}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-blue-700/20 text-blue-400 border-blue-600/40 hover:bg-blue-700/40 transition-colors whitespace-nowrap">
                          {formatDate(u.appeal.createdAt)}
                        </button>
                      ) : (
                        <span className="text-xs text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setHistoryTarget(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-bg-tertiary text-text-secondary border-line hover:text-text-primary hover:bg-bg-tertiary/80 transition-colors">
                        <History className="w-3 h-3" />
                        {(u.history?.length ?? 0) > 0 ? `${u.history!.length}건` : '보기'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export default function Page() {
  return (
    <AdminLayout>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-text-primary">신고된 사용자</h2>
        <p className="text-text-muted text-sm mt-1">커뮤니티에서 신고 이력이 있는 사용자 목록을 조회하고 차단 여부를 관리합니다</p>
      </div>
      <ReportedUsersTab />
    </AdminLayout>
  )
}
