'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, Search, Activity, Settings, ToggleLeft, ToggleRight } from 'lucide-react'

interface PointPolicy {
  _id: string
  type: string
  label: string
  description: string
  amount: number
  multiplier?: number
  dailyLimit?: number | null
  isActive: boolean
}

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

function PolicyTab() {
  const [policies, setPolicies] = useState<PointPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<PointPolicy>>({})

  const fetchPolicies = useCallback(() => {
    setLoading(true)
    adminService.getPointPolicies()
      .then(res => setPolicies(res.policies || []))
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchPolicies() }, [fetchPolicies])

  const handleSeed = () => {
    if (!confirm('기본 포인트 정책을 초기화하시겠습니까?')) return
    adminService.seedPointPolicies()
      .then(res => setPolicies(res.policies || []))
      .catch(() => alert('초기화 실패'))
  }

  const startEdit = (p: PointPolicy) => {
    setEditingId(p._id)
    setEditForm({ amount: p.amount, multiplier: p.multiplier, dailyLimit: p.dailyLimit, isActive: p.isActive })
  }

  const saveEdit = (id: string) => {
    adminService.updatePointPolicy(id, editForm)
      .then(() => {
        setEditingId(null)
        fetchPolicies()
      })
      .catch(() => alert('수정 실패'))
  }

  const toggleActive = (p: PointPolicy) => {
    adminService.updatePointPolicy(p._id, { isActive: !p.isActive })
      .then(() => fetchPolicies())
      .catch(() => alert('상태 변경 실패'))
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-text-secondary" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-text-secondary text-sm">포인트 취득 유형별 정책을 설정합니다.</p>
        <button onClick={handleSeed} className="px-4 py-2 bg-bg-tertiary border border-line text-text-primary text-sm rounded-lg hover:bg-line-light transition-colors">
          기본값 초기화
        </button>
      </div>

      {policies.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          정책이 없습니다. &quot;기본값 초기화&quot; 버튼으로 기본 정책을 생성하세요.
        </div>
      ) : (
        <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left text-text-secondary font-medium px-4 py-3">유형</th>
                <th className="text-left text-text-secondary font-medium px-4 py-3">이름</th>
                <th className="text-left text-text-secondary font-medium px-4 py-3">설명</th>
                <th className="text-right text-text-secondary font-medium px-4 py-3">포인트</th>
                <th className="text-right text-text-secondary font-medium px-4 py-3">배율</th>
                <th className="text-right text-text-secondary font-medium px-4 py-3">일일한도</th>
                <th className="text-center text-text-secondary font-medium px-4 py-3">상태</th>
                <th className="text-center text-text-secondary font-medium px-4 py-3">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {policies.map(p => (
                <tr key={p._id} className="hover:bg-bg-tertiary/50 transition-colors">
                  <td className="text-text-secondary px-4 py-3 font-mono text-xs">{p.type}</td>
                  <td className="text-text-primary px-4 py-3 font-medium">{p.label}</td>
                  <td className="text-text-secondary px-4 py-3 text-xs">{p.description}</td>
                  {editingId === p._id ? (
                    <>
                      <td className="px-4 py-3">
                        <input type="number" value={editForm.amount ?? 0} onChange={e => setEditForm(f => ({ ...f, amount: Number(e.target.value) }))}
                          className="w-16 bg-bg-tertiary border border-line rounded px-2 py-1 text-right text-text-primary text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" step="0.01" value={editForm.multiplier ?? 1} onChange={e => setEditForm(f => ({ ...f, multiplier: Number(e.target.value) }))}
                          className="w-16 bg-bg-tertiary border border-line rounded px-2 py-1 text-right text-text-primary text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" value={editForm.dailyLimit ?? ''} onChange={e => setEditForm(f => ({ ...f, dailyLimit: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="-"
                          className="w-16 bg-bg-tertiary border border-line rounded px-2 py-1 text-right text-text-primary text-sm" />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="text-right text-text-primary px-4 py-3 font-medium">{p.amount}</td>
                      <td className="text-right text-text-secondary px-4 py-3">{p.multiplier ?? '-'}</td>
                      <td className="text-right text-text-secondary px-4 py-3">{p.dailyLimit ?? '-'}</td>
                    </>
                  )}
                  <td className="text-center px-4 py-3">
                    <button onClick={() => toggleActive(p)} className="inline-flex items-center gap-1">
                      {p.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-text-secondary" />
                      )}
                    </button>
                  </td>
                  <td className="text-center px-4 py-3">
                    {editingId === p._id ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => saveEdit(p._id)} className="px-2 py-1 bg-red-600 text-text-primary text-xs rounded hover:bg-red-700 transition-colors">저장</button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded hover:bg-line-light transition-colors">취소</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(p)} className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded hover:bg-line-light transition-colors">수정</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AdminActivityScorePage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [activeTab, setActiveTab] = useState<'history' | 'policy'>('history')
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
          <Activity className="w-5 h-5 text-accent-text" />
          <h2 className="text-text-primary text-xl font-bold">활동점수 관리</h2>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-bg-secondary border border-line rounded-xl p-1">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === 'history' ? 'bg-red-600 text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}>
            <Search className="w-4 h-4" />
            활동점수 내역
          </button>
          <button
            onClick={() => setActiveTab('policy')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === 'policy' ? 'bg-red-600 text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}>
            <Settings className="w-4 h-4" />
            포인트 정책 설정
          </button>
        </div>

        {activeTab === 'policy' && <PolicyTab />}

        {activeTab === 'history' && (
          <div className="flex items-center">
            <span className="text-text-secondary text-sm ml-auto">총 {total.toLocaleString()}건</span>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-bg-secondary border border-line rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="닉네임 / 이메일 검색"
                  className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              <span className="text-text-secondary text-sm">~</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              <div className="flex gap-1">
                {PERIOD_SHORTCUTS.map(({ label, offset }) => (
                  <button key={label} onClick={() => applyShortcut(offset)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-bg-tertiary text-text-secondary hover:bg-line-light hover:text-text-primary transition-colors border border-line">
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none">
                <option value="createdAt">날짜순</option>
                <option value="amount">획득순</option>
              </select>
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none">
                <option value="desc">역순</option>
                <option value="asc">정순</option>
              </select>
              <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none">
                {LIMIT_OPTIONS.map(l => <option key={l} value={l}>{l}개씩</option>)}
              </select>
              <button onClick={() => { setPage(1); fetchData() }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-text-primary text-sm rounded-lg transition-colors">
                검색
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left text-text-secondary font-medium px-4 py-3">번호</th>
                      <th className="text-left text-text-secondary font-medium px-4 py-3">닉네임</th>
                      <th className="text-left text-text-secondary font-medium px-4 py-3">아이디</th>
                      <th className="text-right text-text-secondary font-medium px-4 py-3">획득/사용액</th>
                      <th className="text-left text-text-secondary font-medium px-4 py-3">내용</th>
                      <th className="text-left text-text-secondary font-medium px-4 py-3">날짜</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-text-secondary py-12">데이터가 없습니다</td></tr>
                    ) : data.map((row, i) => (
                      <tr key={row._id} className="hover:bg-bg-tertiary/50 transition-colors">
                        <td className="text-text-secondary px-4 py-3">{(page - 1) * limit + i + 1}</td>
                        <td className="text-text-primary px-4 py-3 font-medium">{row.nickname}</td>
                        <td className="text-text-secondary px-4 py-3">{row.userId}</td>
                        <td className={`text-right px-4 py-3 font-medium ${row.amount >= 0 ? 'text-emerald-400' : 'text-accent-text'}`}>
                          {row.amount >= 0 ? '+' : ''}{row.amount.toLocaleString()}
                        </td>
                        <td className="text-text-secondary px-4 py-3">{row.description}</td>
                        <td className="text-text-secondary px-4 py-3 text-xs">{new Date(row.createdAt).toLocaleString('ko-KR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && totalPages > 1 && (
          <div className="flex justify-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40 transition-colors">
              이전
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${page === p ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'}`}>
                  {p}
                </button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40 transition-colors">
              다음
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
