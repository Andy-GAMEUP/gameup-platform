'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Send, RefreshCw, X, UserX } from 'lucide-react'
import { gameService, BetaTesterUser } from '@/services/gameService'
import notificationService from '@/services/notificationService'
import AdminLayout from '@/components/AdminLayout'
import AlertModal from '@/components/AlertModal'
import ConfirmModal from '@/components/ConfirmModal'

export default function AdminBetaTesterManagementPage() {
  const [users, setUsers] = useState<BetaTesterUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeTitle, setComposeTitle] = useState('')
  const [composeContent, setComposeContent] = useState('')
  const [sending, setSending] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  const [excludeConfirmOpen, setExcludeConfirmOpen] = useState(false)
  const [excluding, setExcluding] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setSelected(new Set()) }, [debouncedSearch])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await gameService.getBetaTesterUsers(debouncedSearch || undefined)
      setUsers(data.users || [])
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '베타 테스터 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => { load() }, [load])

  const allChecked = users.length > 0 && users.every(u => selected.has(u.applicationId))

  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(users.map(u => u.applicationId)))
  }

  const [sortBy, setSortBy] = useState<'username' | 'game'>('username')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (field: 'username' | 'game') => {
    if (sortBy === field) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(field); setSortOrder('asc') }
  }

  const SortableHeader = ({ field, children }: { field: 'username' | 'game'; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(field)} className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-text-secondary hover:text-accent transition-colors">
      <span>{children}</span>
      <span className="inline-flex flex-col leading-[7px] text-[8px]">
        <span className={sortBy === field && sortOrder === 'asc' ? 'text-text-primary' : 'text-text-muted/50'}>▲</span>
        <span className={sortBy === field && sortOrder === 'desc' ? 'text-text-primary' : 'text-text-muted/50'}>▼</span>
      </span>
    </button>
  )

  const sortedUsers = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1
    return [...users].sort((a, b) => {
      const av = sortBy === 'username' ? a.user.username : a.game.title
      const bv = sortBy === 'username' ? b.user.username : b.game.title
      return av.localeCompare(bv, 'ko') * dir
    })
  }, [users, sortBy, sortOrder])

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedRows = useMemo(() => users.filter(u => selected.has(u.applicationId)), [users, selected])
  const selectedUserIds = useMemo(() => Array.from(new Set(selectedRows.map(r => r.user._id))), [selectedRows])

  const handleSend = async () => {
    if (!composeTitle.trim() || !composeContent.trim() || selectedUserIds.length === 0) return
    setSending(true)
    try {
      await notificationService.admin.sendNotification({
        userIds: selectedUserIds,
        type: 'system',
        title: composeTitle,
        content: composeContent,
      })
      setAlertMessage(`${selectedUserIds.length}명에게 전송했습니다.`)
      setComposeOpen(false)
      setComposeTitle('')
      setComposeContent('')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setAlertMessage(msg || '전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  const handleExclude = async () => {
    if (selectedRows.length === 0 || excluding) return
    setExcluding(true)
    try {
      await Promise.all(selectedRows.map(row => gameService.removeBetaTester(row.game._id, row.applicationId)))
      setExcludeConfirmOpen(false)
      setSelected(new Set())
      await load()
      setAlertMessage(`${selectedRows.length}건의 테스터 등록을 제외했습니다.`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setAlertMessage(msg || '테스터 제외에 실패했습니다.')
    } finally {
      setExcluding(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-text-primary text-xl font-bold">베타 테스터 관리</h2>
          <p className="text-text-muted text-sm mt-1">베타존 테스터를 유저+게임 단위로 조회하고, 선택한 유저에게 편지를 보냅니다</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-[35%]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="게임명 · 닉네임 검색..."
              className="w-full bg-bg-secondary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExcludeConfirmOpen(true)}
              disabled={selected.size === 0}
              className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-line hover:bg-bg-tertiary/70 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-base text-text-primary font-semibold transition-colors"
            >
              <UserX className="w-4 h-4" />
              테스터 제외{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
            <button
              onClick={() => setComposeOpen(true)}
              disabled={selectedUserIds.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-base text-black font-semibold transition-colors"
            >
              <Send className="w-4 h-4" />
              편지 보내기{selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ''}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">{error}</div>
        )}

        <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-text-secondary">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-line bg-bg-tertiary/50">
                    <th className="px-4 py-3 w-10 text-center border-r border-line/20">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-accent" />
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap border-r border-line/20"><SortableHeader field="username">닉네임</SortableHeader></th>
                    <th className="px-4 py-3 text-left whitespace-nowrap"><SortableHeader field="game">테스터 등록 게임</SortableHeader></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((row, idx) => (
                    <tr key={row.applicationId} className={`border-b border-line hover:bg-bg-tertiary/30 transition-colors ${idx % 2 !== 0 ? 'bg-bg-tertiary/10' : ''}`}>
                      <td className="px-4 py-3 text-center border-r border-line/20">
                        <input type="checkbox" checked={selected.has(row.applicationId)} onChange={() => toggleOne(row.applicationId)} className="w-4 h-4 accent-accent" />
                      </td>
                      <td className="px-4 py-3 border-r border-line/20">
                        <p className="font-semibold text-text-primary">{row.user.username}</p>
                        <p className="text-xs text-text-muted">{row.user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-[360px] truncate">
                        {row.game.title}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-16 text-text-secondary">
                  {debouncedSearch ? '검색 결과가 없습니다.' : '베타 테스터가 없습니다.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setComposeOpen(false)}>
          <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="text-lg font-bold">선택 유저 {selectedUserIds.length}명에게 편지 보내기</h2>
              <button onClick={() => setComposeOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-text-secondary text-sm block mb-1">제목</label>
                <input
                  value={composeTitle}
                  onChange={e => setComposeTitle(e.target.value)}
                  placeholder="제목"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-muted"
                />
              </div>
              <div>
                <label className="text-text-secondary text-sm block mb-1">내용</label>
                <textarea
                  value={composeContent}
                  onChange={e => setComposeContent(e.target.value)}
                  rows={5}
                  placeholder="내용"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-muted resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setComposeOpen(false)} className="px-4 py-2 text-base text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary transition-colors">취소</button>
                <button
                  onClick={handleSend}
                  disabled={sending || !composeTitle.trim() || !composeContent.trim()}
                  className="px-4 py-2 text-base bg-accent hover:bg-accent-hover disabled:opacity-40 text-black font-semibold rounded-lg transition-colors"
                >
                  {sending ? '전송 중...' : '보내기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={excludeConfirmOpen}
        title="테스터 제외"
        message={`선택한 ${selected.size}건의 테스터 등록을 제외하시겠습니까?\n제외된 등록은 복구할 수 없습니다.`}
        confirmLabel={excluding ? '제외 중...' : '제외'}
        danger
        onConfirm={handleExclude}
        onCancel={() => setExcludeConfirmOpen(false)}
      />

      <AlertModal isOpen={!!alertMessage} message={alertMessage} onConfirm={() => setAlertMessage('')} />
    </AdminLayout>
  )
}
