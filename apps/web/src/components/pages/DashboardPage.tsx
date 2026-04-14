'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import Badge from '@/components/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/Tabs'
import Link from 'next/link'
import {
  Gamepad2, DollarSign, Users, TrendingUp, BarChart3, RefreshCw, Plus,
  Calendar, Infinity as InfinityIcon,
} from 'lucide-react'
import { analyticsService, OverviewSummary, OverviewGameRow } from '@/services/analyticsService'

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [mode, setMode] = useState<'range' | 'lifetime'>('range')
  const [summary, setSummary] = useState<OverviewSummary | null>(null)
  const [games, setGames] = useState<OverviewGameRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await analyticsService.getDeveloperOverview({ mode })
      setSummary(data.summary)
      setGames(data.games)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '대시보드 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mode])

  const filteredGames = activeTab === 'all'
    ? games
    : games.filter(g => {
        if (activeTab === 'beta') return g.serviceType === 'beta' || g.status === 'beta'
        if (activeTab === 'live') return g.serviceType === 'live' || g.status === 'published'
        return true
      })

  const monetizationLabel = (m?: string) => ({ free: '무료', ad: '광고', paid: '유료', freemium: '프리미엄' }[m || 'free'] || '무료')

  const fmtChange = (v: number) => v > 0 ? `+${v}%` : `${v}%`
  const trendCls = (v: number) => v > 0 ? 'bg-accent-light text-accent border-accent-muted' : v < 0 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-bg-muted/20 text-text-secondary border-line/50'

  const stats = [
    {
      label: '등록된 게임',
      value: summary?.totalGames ?? 0,
      change: null,
      icon: <Gamepad2 className="w-6 h-6" />,
      color: 'text-blue-400',
    },
    {
      label: '총 매출',
      value: `₩${(summary?.totalRevenue ?? 0).toLocaleString()}`,
      change: summary?.revenueChange ?? 0,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'text-accent',
    },
    {
      label: '활성 유저',
      value: (summary?.totalActiveUsers ?? 0).toLocaleString(),
      change: summary?.activeChange ?? 0,
      icon: <Users className="w-6 h-6" />,
      color: 'text-purple-400',
    },
    {
      label: '평균 ARPPU',
      value: `₩${(summary?.avgARPPU ?? 0).toLocaleString()}`,
      change: summary?.arppuChange ?? 0,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-yellow-400',
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">대시보드</h1>
          <p className="text-text-secondary">
            {mode === 'lifetime' ? '게임 등록일부터 현재까지 누적' : '최근 30일 기준'} · 내 모든 게임의 성과를 확인하세요
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* 기간 모드 토글 */}
          <div className="flex border border-line rounded-md overflow-hidden">
            <button
              onClick={() => setMode('range')}
              className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${
                mode === 'range' ? 'bg-accent text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> 30일
            </button>
            <button
              onClick={() => setMode('lifetime')}
              className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors ${
                mode === 'lifetime' ? 'bg-accent text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              <InfinityIcon className="w-3.5 h-3.5" /> 누적
            </button>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-xs underline">다시 시도</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-bg-secondary border border-line">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={stat.color}>{stat.icon}</div>
                {stat.change !== null && mode === 'range' && (
                  <Badge className={trendCls(stat.change)}>{fmtChange(stat.change)}</Badge>
                )}
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-text-secondary">{stat.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* 게임 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-bg-secondary border border-line">
          <TabsTrigger value="all">전체 게임 ({games.length})</TabsTrigger>
          <TabsTrigger value="beta">베타 ({games.filter(g => g.serviceType === 'beta' || g.status === 'beta').length})</TabsTrigger>
          <TabsTrigger value="live">라이브 ({games.filter(g => g.serviceType === 'live' || g.status === 'published').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {/* 게임별 성과 */}
          <Card className="bg-bg-secondary border border-line">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">게임별 성과</h2>
                  <p className="text-xs text-text-secondary mt-1">게임 카드를 클릭하면 분석 페이지로 이동합니다</p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-text-secondary">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="text-center py-16 text-text-secondary">
                  <p className="mb-4">표시할 게임이 없습니다.</p>
                  <Link href="/upload">
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm font-semibold transition-colors">
                      <Plus className="w-4 h-4" /> 첫 게임 등록하기
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGames.map((game) => (
                    <Link
                      key={game.id}
                      href={`/analytics?gameId=${game.id}`}
                      className="block p-4 bg-bg-tertiary/50 rounded-lg hover:bg-bg-tertiary border border-transparent hover:border-accent/40 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1 truncate">{game.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-xs ${
                              game.serviceType === 'live' || game.status === 'published'
                                ? 'bg-accent-light text-accent border-accent-muted'
                                : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                            }`}>
                              {game.serviceType === 'live' || game.status === 'published' ? '라이브' : '베타'}
                            </Badge>
                            <Badge className="text-xs border border-line text-text-secondary">
                              {monetizationLabel(game.monetization)}
                            </Badge>
                            <span className="flex items-center gap-1 text-sm">
                              <svg className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                              <span>{game.rating?.toFixed?.(1) ?? '0.0'}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-accent">₩{game.revenue.toLocaleString()}</div>
                          <div className="text-xs text-text-muted">매출</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                        <Metric label="활성 유저" value={game.activeUsers.toLocaleString()} />
                        <Metric label="평균 DAU" value={game.avgDau.toLocaleString()} accent="text-blue-400" />
                        <Metric label="누적 회원" value={game.cumulativeMembers.toLocaleString()} />
                        <Metric label="ARPPU" value={`₩${game.arppu.toLocaleString()}`} accent="text-yellow-400" />
                        <Metric label="PUR" value={`${game.pur}%`} accent="text-purple-400" />
                      </div>

                      <div className="mt-3 flex items-center justify-end text-xs text-accent">
                        <BarChart3 className="w-3.5 h-3.5 mr-1" /> 세부 분석 보기 →
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-2 bg-bg-tertiary/50 rounded">
      <p className="text-text-secondary text-xs mb-1">{label}</p>
      <p className={`font-semibold ${accent || ''}`}>{value}</p>
    </div>
  )
}
