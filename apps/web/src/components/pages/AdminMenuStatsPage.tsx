'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Loader2, PieChart as PieChartIcon } from 'lucide-react'

const MENU_TABS = ['커뮤니티', '파트너 채널', '퍼블리싱', '미니홈', '지원 프로그램', '솔루션']
const PLATFORMS = ['전체', 'PC', 'iOS', 'Android']
const PERIOD_BUTTONS = ['1일', '1주', '1달', '3개월']
const BAR_COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#f97316', '#f43f5e', '#facc15']

interface MenuStatRow {
  menu: string
  views: number
  uniqueVisitors: number
  avgTime: number
}

export default function AdminMenuStatsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [activeTab, setActiveTab] = useState(MENU_TABS[0])
  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)
  const [platform, setPlatform] = useState('전체')
  const [data, setData] = useState<MenuStatRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    adminService.getMenuStats({
      menu: activeTab,
      startDate,
      endDate,
      platform: platform === '전체' ? undefined : platform,
    })
      .then((res) => setData((res?.data ?? res ?? []) as MenuStatRow[]))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [activeTab, startDate, endDate, platform])

  useEffect(() => { fetchData() }, [fetchData])

  const applyPeriod = (p: string) => {
    const end = new Date()
    const start = new Date()
    if (p === '1일')  start.setDate(start.getDate() - 1)
    if (p === '1주')  start.setDate(start.getDate() - 7)
    if (p === '1달')  start.setMonth(start.getMonth() - 1)
    if (p === '3개월') start.setMonth(start.getMonth() - 3)
    setStartDate(start.toISOString().slice(0, 10))
    setEndDate(end.toISOString().slice(0, 10))
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <PieChartIcon className="w-5 h-5 text-red-400" />
          <h2 className="text-white text-xl font-bold">메뉴별 통계</h2>
        </div>

        <div className="flex gap-1 border-b border-slate-800">
          {MENU_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-red-300 border-red-500'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
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

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              데이터가 없습니다
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="menu" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="views" name="조회수" radius={[4, 4, 0, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {data.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-slate-400 font-medium px-4 py-3">메뉴</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-3">조회수</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-3">순 방문자</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-3">평균 체류시간(초)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                      <td className="text-white px-4 py-3">{row.menu}</td>
                      <td className="text-right text-slate-300 px-4 py-3">{(row.views ?? 0).toLocaleString()}</td>
                      <td className="text-right text-slate-300 px-4 py-3">{(row.uniqueVisitors ?? 0).toLocaleString()}</td>
                      <td className="text-right text-slate-300 px-4 py-3">{(row.avgTime ?? 0).toLocaleString()}</td>
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
