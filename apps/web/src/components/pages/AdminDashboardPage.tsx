'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, Gamepad2, Play, Star, Clock, AlertTriangle,
  TrendingUp, CheckCircle, XCircle, Loader2,
  UserCircle, Building2, Handshake, Calendar, MessageSquare, Package,
} from 'lucide-react'

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-bg-secondary border border-line rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-secondary text-xs mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {sub && <p className="text-text-muted text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-').replace('-400', '-600/20').replace('-300', '-600/20')}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  )
}

function MiniBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-secondary text-xs w-16 text-right">{label}</span>
      <div className="flex-1 bg-bg-tertiary rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-text-primary text-xs w-8 text-right">{count}</span>
    </div>
  )
}

const PIE_COLORS = ['#3b82f6', '#a855f7', '#ef4444', '#64748b']

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [dashSummary, setDashSummary] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminService.getStats().catch(() => null),
      adminService.getAnalyticsDashboard().catch(() => null),
    ]).then(([s, d]) => {
      setStats(s as Record<string, unknown> | null)
      setDashSummary(d as Record<string, unknown> | null)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    </AdminLayout>
  )

  if (!stats) return (
    <AdminLayout>
      <p className="text-text-secondary text-center py-12">통계를 불러올 수 없습니다</p>
    </AdminLayout>
  )

  const { users, games, totalPlayCount, reviews, playTrend = [], topGames = [] } = stats as {
    users: { total: number; developers: number; players: number; banned: number; newToday?: number }
    games: { total: number; pending: number; beta?: number; published: number; rejected: number; archived: number }
    totalPlayCount: number
    reviews: { total: number; blocked: number }
    playTrend: Array<{ _id: string; count: number }>
    topGames: Array<{ _id: string; title: string; genre: string; playCount: number; rating: number }>
  }

  const summary = dashSummary as {
    individualMembers?: number
    corporateMembers?: number
    activePartners?: number
    activeSeasons?: number
    totalMessages?: number
    solutionSubscriptions?: number
    visitorTrend?: Array<{ date: string; total: number; newUsers: number }>
  } | null

  const visitorTrendData = summary?.visitorTrend ?? playTrend.map((d) => ({
    date: (d._id as string)?.slice(5) ?? '',
    total: d.count,
    newUsers: 0,
  }))

  const userPieData = [
    { name: '베타테스터', value: users.players ?? 0 },
    { name: '개발자', value: users.developers ?? 0 },
    { name: '정지됨', value: users.banned ?? 0 },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary text-xl font-bold">플랫폼 대시보드</h2>
          <span className="text-text-muted text-xs">{new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' })}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="전체 회원" value={users.total} sub={`오늘 +${users.newToday || 0}`} icon={Users} color="text-blue-400" />
          <StatCard label="등록 게임" value={games.total} sub={`승인대기 ${games.pending}건`} icon={Gamepad2} color="text-purple-400" />
          <StatCard label="총 플레이" value={totalPlayCount} icon={Play} color="text-cyan-400" />
          <StatCard label="리뷰 수" value={reviews.total} sub={`차단 ${reviews.blocked}건`} icon={Star} color="text-yellow-400" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="개인회원" value={summary?.individualMembers ?? '-'} icon={UserCircle} color="text-emerald-400" />
          <StatCard label="기업회원" value={summary?.corporateMembers ?? '-'} icon={Building2} color="text-orange-400" />
          <StatCard label="활성 파트너" value={summary?.activePartners ?? '-'} icon={Handshake} color="text-pink-400" />
          <StatCard label="진행중 시즌" value={summary?.activeSeasons ?? '-'} icon={Calendar} color="text-violet-400" />
          <StatCard label="총 메시지" value={summary?.totalMessages ?? '-'} icon={MessageSquare} color="text-sky-400" />
          <StatCard label="솔루션 구독" value={summary?.solutionSubscriptions ?? '-'} icon={Package} color="text-amber-400" />
        </div>

        {visitorTrendData.length > 0 && (
          <div className="bg-bg-secondary border border-line rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> 방문자 트렌드 (최근 7일)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={visitorTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Line type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2} dot={false} name="총 방문자" />
                <Line type="monotone" dataKey="newUsers" stroke="#a78bfa" strokeWidth={2} dot={false} name="신규 가입" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-secondary border border-line rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-purple-400" /> 게임 상태 현황
            </h3>
            <div className="space-y-2.5">
              <MiniBar label="승인대기" count={games.pending}    max={games.total} color="bg-yellow-500" />
              <MiniBar label="베타진행" count={games.beta ?? 0}  max={games.total} color="bg-accent" />
              <MiniBar label="정식출시" count={games.published}  max={games.total} color="bg-blue-500" />
              <MiniBar label="거부됨"   count={games.rejected}   max={games.total} color="bg-red-500" />
              <MiniBar label="아카이브" count={games.archived}   max={games.total} color="bg-bg-muted" />
            </div>
          </div>

          <div className="bg-bg-secondary border border-line rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> 회원 분포
            </h3>
            <div className="flex items-center gap-4">
              <PieChart width={120} height={120}>
                <Pie data={userPieData} cx={55} cy={55} innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
                  {userPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
              <div className="space-y-2 flex-1">
                {userPieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-text-secondary text-xs">{entry.name}</span>
                    </div>
                    <span className="text-text-primary text-xs font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-secondary border border-line rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" /> 인기 게임 TOP 5
            </h3>
            <div className="space-y-2">
              {(topGames as Array<{ _id: string; title: string; genre: string; playCount: number; rating: number }>).map((g, i) => (
                <div key={g._id} className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-5 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-text-secondary' : i === 2 ? 'text-amber-600' : 'text-text-muted'}`}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/metrics/${g._id}`} className="text-text-primary text-sm hover:text-cyan-300 truncate block">{g.title}</Link>
                    <span className="text-text-muted text-xs">{g.genre}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 text-sm font-medium">{(g.playCount||0).toLocaleString()}</p>
                    <p className="text-yellow-400 text-xs">★{(g.rating||0).toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-secondary border border-line rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-4">빠른 메뉴</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: '/admin/games?filter=pending', icon: Clock, label: '승인 대기', value: `${games.pending}건`, color: 'text-yellow-400', bg: 'bg-yellow-600/10 border-yellow-500/30 hover:bg-yellow-600/20' },
                { to: '/admin/community?filter=blocked', icon: AlertTriangle, label: '차단 리뷰', value: `${reviews.blocked}건`, color: 'text-accent-text', bg: 'bg-red-600/10 border-accent-muted hover:bg-accent-light' },
                { to: '/admin/users-enhanced/individual', icon: UserCircle, label: '개인회원 관리', value: '→', color: 'text-emerald-400', bg: 'bg-emerald-600/10 border-emerald-500/30 hover:bg-emerald-600/20' },
                { to: '/admin/users-enhanced/corporate', icon: Building2, label: '기업회원 관리', value: '→', color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-500/30 hover:bg-orange-600/20' },
                { to: '/admin/levels', icon: TrendingUp, label: '레벨 관리', value: '→', color: 'text-violet-400', bg: 'bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/20' },
                { to: '/admin/terms', icon: CheckCircle, label: '약관 관리', value: '→', color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20' },
                { to: '/admin/users?filter=banned', icon: XCircle, label: '정지 회원', value: `${users.banned}명`, color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-500/30 hover:bg-orange-600/20' },
                { to: '/admin/announcements', icon: CheckCircle, label: '공지 작성', value: '✏️', color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20' },
              ].map(({ to, icon: Icon, label, value, color, bg }) => (
                <Link key={`${to}-${label}`} href={to} className={`border rounded-lg p-3 transition-colors ${bg}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className={`text-xs font-medium ${color}`}>{label}</span>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
