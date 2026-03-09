'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Loader2, BarChart3 } from 'lucide-react'

interface VisitorRow {
  date: string
  total: number
  newVisitors: number
  members: number
  guests: number
  newSignups: number
  avgPageviews: number
}

interface LineKey {
  key: keyof VisitorRow
  label: string
  color: string
}

const LINE_KEYS: LineKey[] = [
  { key: 'total',       label: '총 방문자',    color: '#22d3ee' },
  { key: 'newVisitors', label: '신규 방문자',  color: '#a78bfa' },
  { key: 'members',     label: '회원 접속',    color: '#34d399' },
  { key: 'guests',      label: '비회원 방문',  color: '#f97316' },
  { key: 'newSignups',  label: '신규 가입',    color: '#f43f5e' },
  { key: 'avgPageviews',label: '평균 페이지뷰',color: '#facc15' },
]

const PERIOD_BUTTONS = ['1일', '1주', '1달', '3개월']
const PLATFORMS = ['전체', 'PC', 'iOS', 'Android']

export default function AdminAnalyticsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)
  const [platform, setPlatform] = useState('전체')
  const [data, setData] = useState<VisitorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(LINE_KEYS.map(l => l.key))
  )

  const fetchData = useCallback(() => {
    setLoading(true)
    adminService.getVisitorStats({
      startDate,
      endDate,
      platform: platform === '전체' ? undefined : platform,
    })
      .then((res) => setData((res?.data ?? res ?? []) as VisitorRow[]))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [startDate, endDate, platform])

  useEffect(() => { fetchData() }, [fetchData])

  const applyPeriod = (p: string) => {
    const end = new Date()
    let start = new Date()
    if (p === '1일')  start = new Date(end.getTime() - 86400000)
    if (p === '1주')  start = new Date(end.getTime() - 7 * 86400000)
    if (p === '1달')  start = new Date(end); start.setMonth(start.getMonth() - 1)
    if (p === '3개월') start = new Date(end); start.setMonth(start.getMonth() - 3)
    setStartDate(start.toISOString().slice(0, 10))
    setEndDate(end.toISOString().slice(0, 10))
  }

  const toggleLine = (key: string) => {
    setActiveLines(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-red-400" />
          <h2 className="text-white text-xl font-bold">방문 통계</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-sm">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-sm">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex gap-1">
              {PERIOD_BUTTONS.map(p => (
                <button
                  key={p}
                  onClick={() => applyPeriod(p)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                    platform === p
                      ? 'bg-red-600/20 text-red-300 border-red-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              조회
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {LINE_KEYS.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => toggleLine(key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors ${
                  activeLines.has(key)
                    ? 'border-transparent text-white'
                    : 'border-slate-700 text-slate-500 bg-slate-800'
                }`}
                style={activeLines.has(key) ? { backgroundColor: color + '33', borderColor: color } : {}}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeLines.has(key) ? color : '#475569' }} />
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                {LINE_KEYS.filter(l => activeLines.has(l.key)).map(({ key, label, color }) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} name={label} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {data.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-slate-400 font-medium px-4 py-3">날짜</th>
                    {LINE_KEYS.map(({ key, label }) => (
                      <th key={key} className="text-right text-slate-400 font-medium px-4 py-3">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                      <td className="text-white px-4 py-3">{row.date}</td>
                      {LINE_KEYS.map(({ key }) => (
                        <td key={key} className="text-right text-slate-300 px-4 py-3">
                          {(row[key] ?? 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
