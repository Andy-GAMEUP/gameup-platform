'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  Users, Gamepad2, Play, Star, Clock, AlertTriangle,
  TrendingUp, CheckCircle, XCircle, Loader2
} from 'lucide-react'

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
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
      <span className="text-slate-400 text-xs w-16 text-right">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-white text-xs w-8 text-right">{count}</span>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminService.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    </AdminLayout>
  )

  if (!stats) return (
    <AdminLayout>
      <p className="text-slate-400 text-center py-12">통계를 불러올 수 없습니다</p>
    </AdminLayout>
  )

  const { users, games, totalPlayCount, reviews, playTrend = [], topGames = [] } = stats

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-bold">플랫폼 대시보드</h2>
          <span className="text-slate-500 text-xs">{new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'short' })}</span>
        </div>

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="전체 회원" value={users.total} sub={`오늘 +${users.newToday || 0}`} icon={Users} color="text-blue-400" />
          <StatCard label="등록 게임" value={games.total} sub={`승인대기 ${games.pending}건`} icon={Gamepad2} color="text-purple-400" />
          <StatCard label="총 플레이" value={totalPlayCount} icon={Play} color="text-cyan-400" />
          <StatCard label="리뷰 수" value={reviews.total} sub={`차단 ${reviews.blocked}건`} icon={Star} color="text-yellow-400" />
        </div>

        {/* 게임 상태 + 회원 분포 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 게임 상태 분포 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-purple-400" /> 게임 상태 현황
            </h3>
            <div className="space-y-2.5">
              <MiniBar label="승인대기" count={games.pending}    max={games.total} color="bg-yellow-500" />
              <MiniBar label="베타진행" count={games.beta}       max={games.total} color="bg-green-500" />
              <MiniBar label="정식출시" count={games.published}  max={games.total} color="bg-blue-500" />
              <MiniBar label="거부됨"   count={games.rejected}   max={games.total} color="bg-red-500" />
              <MiniBar label="아카이브" count={games.archived}   max={games.total} color="bg-slate-500" />
            </div>
          </div>

          {/* 회원 분포 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> 회원 분포
            </h3>
            <div className="space-y-2.5">
              <MiniBar label="베타테스터" count={users.players}    max={users.total} color="bg-blue-500" />
              <MiniBar label="개발자"     count={users.developers} max={users.total} color="bg-purple-500" />
              <MiniBar label="정지됨"     count={users.banned}     max={users.total} color="bg-red-500" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: '테스터', v: users.players, color: 'text-blue-400' },
                { label: '개발자', v: users.developers, color: 'text-purple-400' },
                { label: '정지',   v: users.banned, color: 'text-red-400' },
              ].map(({ label, v, color }) => (
                <div key={label} className="text-center bg-slate-800/50 rounded-lg p-2">
                  <p className={`text-lg font-bold ${color}`}>{v}</p>
                  <p className="text-slate-500 text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 플레이 트렌드 (최근 7일) */}
        {playTrend.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> 플레이 트렌드 (최근 7일)
            </h3>
            <div className="flex items-end gap-2 h-24">
              {playTrend.map((d: any) => {
                const maxCount = Math.max(...playTrend.map((x: any) => x.count), 1)
                const height = Math.round((d.count / maxCount) * 100)
                return (
                  <div key={d._id} className="flex-1 flex flex-col items-center gap-1" title={`${d._id}: ${d.count}회`}>
                    <span className="text-cyan-400 text-xs">{d.count}</span>
                    <div className="w-full bg-cyan-500/70 rounded-t" style={{ height: `${Math.max(height, 4)}%` }} />
                    <span className="text-slate-600 text-xs">{d._id?.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TOP 5 게임 + 빠른 메뉴 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TOP 5 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" /> 인기 게임 TOP 5
            </h3>
            <div className="space-y-2">
              {topGames.map((g: any, i: number) => (
                <div key={g._id} className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-5 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/metrics/${g._id}`} className="text-white text-sm hover:text-cyan-300 truncate block">{g.title}</Link>
                    <span className="text-slate-500 text-xs">{g.genre}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 text-sm font-medium">{(g.playCount||0).toLocaleString()}</p>
                    <p className="text-yellow-400 text-xs">★{(g.rating||0).toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 빠른 메뉴 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">빠른 메뉴</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: '/admin/games?filter=pending', icon: Clock, label: '승인 대기', value: `${games.pending}건`, color: 'text-yellow-400', bg: 'bg-yellow-600/10 border-yellow-500/30 hover:bg-yellow-600/20' },
                { to: '/admin/community?filter=blocked', icon: AlertTriangle, label: '차단 리뷰', value: `${reviews.blocked}건`, color: 'text-red-400', bg: 'bg-red-600/10 border-red-500/30 hover:bg-red-600/20' },
                { to: '/admin/users?filter=banned', icon: XCircle, label: '정지 회원', value: `${users.banned}명`, color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-500/30 hover:bg-orange-600/20' },
                { to: '/admin/announcements', icon: CheckCircle, label: '공지 작성', value: '✏️', color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20' },
              ].map(({ to, icon: Icon, label, value, color, bg }) => (
                <Link key={to} href={to} className={`border rounded-lg p-3 transition-colors ${bg}`}>
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
