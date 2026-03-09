'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, Search, Activity } from 'lucide-react'

interface ActivityScoreRow {
  _id: string
  nickname: string
  userId: string
  amount: number
  description: string
  createdAt: string
}

const PERIOD_SHORTCUTS = [
  { label: '어제', offset: 1 },
  { label: '오늘', offset: 0 },
  { label: '1주', offset: 7 },
  { label: '1달', offset: 30 },
  { label: '전체', offset: -1 },
]
const LIMIT_OPTIONS = [10, 20, 50]

export default function AdminActivityScorePage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(monthAgo)
  const [endDate, setEndDate] = useState(today)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState('createdAt')
  const [limit, setLimit] = useState(20)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ActivityScoreRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    adminService.getActivityScores({
      page, limit,
      search: search || undefined,
      startDate, endDate,
      sortBy, sortOrder,
    })
      .then(res => {
        setData((res?.data ?? res?.items ?? []) as ActivityScoreRow[])
        setTotal(res?.total ?? 0)
      })
      .catch(() => { setData([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page, limit, search, startDate, endDate, sortBy, sortOrder])

  useEffect(() => { fetchData() }, [fetchData])

  const applyShortcut = (offset: number) => {
    const end = new Date()
    const start = new Date()
    if (offset === -1) {
      setStartDate('')
      setEndDate('')
      return
    }
    if (offset === 0) {
      setStartDate(end.toISOString().slice(0, 10))
    } else {
      start.setDate(start.getDate() - offset)
      setStartDate(start.toISOString().slice(0, 10))
    }
    setEndDate(end.toISOString().slice(0, 10))
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-red-400" />
          <h2 className="text-white text-xl font-bold">활동점수 내역</h2>
          <span className="text-slate-400 text-sm ml-auto">총 {total.toLocaleString()}건</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="닉네임 / 이메일 검색"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
            <span className="text-slate-400 text-sm">~</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
            <div className="flex gap-1">
              {PERIOD_SHORTCUTS.map(({ label, offset }) => (
                <button key={label} onClick={() => applyShortcut(offset)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700">
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
              <option value="createdAt">날짜순</option>
              <option value="amount">획득순</option>
            </select>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
              <option value="desc">역순</option>
              <option value="asc">정순</option>
            </select>
            <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
              {LIMIT_OPTIONS.map(l => <option key={l} value={l}>{l}개씩</option>)}
            </select>
            <button onClick={() => { setPage(1); fetchData() }}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
              검색
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-slate-400 font-medium px-4 py-3">번호</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">닉네임</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">아이디</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-3">획득/사용액</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">내용</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-3">날짜</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-slate-400 py-12">데이터가 없습니다</td></tr>
                  ) : data.map((row, i) => (
                    <tr key={row._id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="text-slate-400 px-4 py-3">{(page - 1) * limit + i + 1}</td>
                      <td className="text-white px-4 py-3 font-medium">{row.nickname}</td>
                      <td className="text-slate-300 px-4 py-3">{row.userId}</td>
                      <td className={`text-right px-4 py-3 font-medium ${row.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.amount >= 0 ? '+' : ''}{row.amount.toLocaleString()}
                      </td>
                      <td className="text-slate-300 px-4 py-3">{row.description}</td>
                      <td className="text-slate-400 px-4 py-3 text-xs">{new Date(row.createdAt).toLocaleString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors">
              이전
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${page === p ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  {p}
                </button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors">
              다음
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
