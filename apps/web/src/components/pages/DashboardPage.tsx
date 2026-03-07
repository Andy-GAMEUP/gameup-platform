'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import Badge from '@/components/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/Tabs'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { gameService } from '@/services/gameService'

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState('all')
  const { user: _user } = useAuth()
  const [apiStats, setApiStats] = useState<{
    totalGames: number; totalPlays: number; totalRevenue: number;
    publishedGames: number; draftGames: number
  } | null>(null)
  const [_apiGames, setApiGames] = useState<any[]>([])
  const [_apiLoading, setApiLoading] = useState(true)

  useEffect(() => {
    gameService.getDeveloperStats()
      .then((data) => {
        setApiStats(data.stats)
        setApiGames(data.recentGames || [])
      })
      .catch(() => {})
      .finally(() => setApiLoading(false))
  }, [])


  const stats = [
    {
      label: '등록된 게임',
      value: apiStats ? String(apiStats.totalGames) : '8',
      change: apiStats ? `총 ${apiStats.publishedGames}개 배포` : '+2',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      ),
      color: 'text-blue-400',
    },
    {
      label: '총 매출',
      value: '₩45,280,000',
      change: '+18.2%',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-green-400',
    },
    {
      label: '활성 유저',
      value: '12,450',
      change: '+1,250',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-purple-400',
    },
    {
      label: '평균 ARPPU',
      value: '₩28,400',
      change: '+5.3%',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'text-yellow-400',
    },
  ]

  const allGames = [
    {
      id: 1,
      title: 'Cyber Nexus',
      status: '진행중',
      serviceType: 'beta',
      monetization: 'free',
      testers: 2450,
      feedback: 892,
      rating: 4.8,
      revenue: 8450000,
      retention: { d1: 75, d7: 45, d14: 32, d30: 18 },
      arppu: 32400,
      conversion: 12.5,
    },
    {
      id: 2,
      title: 'Stellar Warfare',
      status: '모집중',
      serviceType: 'beta',
      monetization: 'ad',
      testers: 1820,
      feedback: 645,
      rating: 4.6,
      revenue: 3200000,
      retention: { d1: 68, d7: 38, d14: 25, d30: 12 },
      arppu: 0,
      conversion: 0,
    },
    {
      id: 3,
      title: 'Racing Legends',
      status: '운영중',
      serviceType: 'live',
      monetization: 'paid',
      testers: 8500,
      feedback: 2341,
      rating: 4.7,
      revenue: 28450000,
      retention: { d1: 82, d7: 58, d14: 42, d30: 28 },
      arppu: 45200,
      conversion: 25.3,
    },
    {
      id: 4,
      title: 'Mystic Realms',
      status: '곧 시작',
      serviceType: 'beta',
      monetization: 'free',
      testers: 980,
      feedback: 234,
      rating: 4.5,
      revenue: 1850000,
      retention: { d1: 72, d7: 42, d14: 28, d30: 15 },
      arppu: 18900,
      conversion: 8.2,
    },
    {
      id: 5,
      title: 'Battle Arena Pro',
      status: '운영중',
      serviceType: 'live',
      monetization: 'free',
      testers: 15200,
      feedback: 4521,
      rating: 4.8,
      revenue: 52300000,
      retention: { d1: 88, d7: 65, d14: 52, d30: 38 },
      arppu: 38500,
      conversion: 18.7,
    },
  ]

  const betaGames = allGames.filter((game) => game.serviceType === 'beta')
  const liveGames = allGames.filter((game) => game.serviceType === 'live')

  const getFilteredGames = () => {
    switch (activeTab) {
      case 'beta':
        return betaGames
      case 'live':
        return liveGames
      default:
        return allGames
    }
  }

  const filteredGames = getFilteredGames()

  // 매출 통계 계산
  const totalRevenue = filteredGames.reduce((sum, game) => sum + game.revenue, 0)
  const paidRevenue = filteredGames
    .filter((g) => g.monetization === 'paid' || g.monetization === 'free')
    .reduce((sum, game) => sum + game.revenue, 0)
  const adRevenue = filteredGames
    .filter((g) => g.monetization === 'ad')
    .reduce((sum, game) => sum + game.revenue, 0)

  // 평균 리텐션 계산
  const avgRetention = {
    d1: Math.round(filteredGames.reduce((sum, game) => sum + game.retention.d1, 0) / filteredGames.length),
    d7: Math.round(filteredGames.reduce((sum, game) => sum + game.retention.d7, 0) / filteredGames.length),
    d14: Math.round(filteredGames.reduce((sum, game) => sum + game.retention.d14, 0) / filteredGames.length),
    d30: Math.round(filteredGames.reduce((sum, game) => sum + game.retention.d30, 0) / filteredGames.length),
  }

  const recentFeedback = [
    {
      id: 1,
      game: 'Cyber Nexus',
      user: '김게이머',
      type: '버그',
      message: '레벨 15에서 캐릭터가 벽을 통과하는 버그 발견',
      time: '30분 전',
      priority: 'high',
    },
    {
      id: 2,
      game: 'Stellar Warfare',
      user: '이플레이어',
      type: '제안',
      message: '무기 밸런스 조정이 필요합니다',
      time: '1시간 전',
      priority: 'medium',
    },
    {
      id: 3,
      game: 'Mystic Realms',
      user: '박유저',
      type: '긍정',
      message: '스토리라인이 정말 흥미진진합니다!',
      time: '2시간 전',
      priority: 'low',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold mb-2">대시보드</h1>
        <p className="text-slate-400">게임 성과를 한눈에 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-slate-900 border border-slate-800">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={stat.color}>{stat.icon}</div>
                <Badge
                  className={`${
                    stat.trend === 'up'
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : 'bg-red-500/20 text-red-400 border-red-500/50'
                  }`}
                >
                  {stat.change}
                </Badge>
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* 게임 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="all">
            전체 게임 ({allGames.length})
          </TabsTrigger>
          <TabsTrigger value="beta">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            베타 테스트 ({betaGames.length})
          </TabsTrigger>
          <TabsTrigger value="live">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
            라이브 게임 ({liveGames.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {/* 매출 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900 border border-slate-800">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm">총 매출</div>
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-green-400 mb-1">
                  ₩{totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">이번 달</div>
              </div>
            </Card>

            <Card className="bg-slate-900 border border-slate-800">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm">유료 판매</div>
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold mb-1">
                  ₩{paidRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">
                  전체의 {totalRevenue > 0 ? ((paidRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900 border border-slate-800">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-slate-400 text-sm">광고 매출</div>
                  <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold mb-1">
                  ₩{adRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">
                  전체의 {totalRevenue > 0 ? ((adRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </Card>
          </div>

          {/* 리텐션 & 전환율 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 평균 리텐션 */}
            <Card className="bg-slate-900 border border-slate-800">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">평균 리텐션</h2>
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">D+1 리텐션</span>
                      <span className="font-semibold text-lg">{avgRetention.d1}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                        style={{ width: `${avgRetention.d1}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">D+7 리텐션</span>
                      <span className="font-semibold text-lg">{avgRetention.d7}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full"
                        style={{ width: `${avgRetention.d7}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">D+14 리텐션</span>
                      <span className="font-semibold text-lg">{avgRetention.d14}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full"
                        style={{ width: `${avgRetention.d14}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">D+30 리텐션</span>
                      <span className="font-semibold text-lg">{avgRetention.d30}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full"
                        style={{ width: `${avgRetention.d30}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* ARPPU 및 전환율 */}
            <Card className="bg-slate-900 border border-slate-800">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6">수익화 지표</h2>
                <div className="space-y-6">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-slate-400">평균 ARPPU</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        +5.3%
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold text-green-400">
                      ₩{Math.round(
                        filteredGames.reduce((sum, game) => sum + game.arppu, 0) /
                          (filteredGames.filter((g) => g.arppu > 0).length || 1)
                      ).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      결제 유저당 평균 매출
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-slate-400">평균 결제전환율</span>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                        +2.1%
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold text-blue-400">
                      {(
                        filteredGames.reduce((sum, game) => sum + game.conversion, 0) /
                        (filteredGames.filter((g) => g.conversion > 0).length || 1)
                      ).toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      무료 유저 대비 결제 유저 비율
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-sm text-slate-400">총 활성 유저</span>
                    </div>
                    <div className="text-3xl font-bold">
                      {filteredGames.reduce((sum, game) => sum + game.testers, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      결제 유저: {Math.round(
                        filteredGames.reduce((sum, game) => sum + (game.testers * game.conversion / 100), 0)
                      ).toLocaleString()}명
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 게임 성과 */}
          <Card className="bg-slate-900 border border-slate-800">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">게임별 성과</h2>
              <div className="space-y-4">
                {filteredGames.map((game) => (
                  <Link
                    key={game.id}
                    href={`/developer/games/${game.id}`}
                    className="block p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{game.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-xs ${
                                game.serviceType === 'beta'
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                  : 'bg-green-500/20 text-green-400 border-green-500/50'
                              }`}
                            >
                              {game.serviceType === 'beta' ? '베타' : '라이브'}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-slate-700">
                              {game.monetization === 'free'
                                ? '무료'
                                : game.monetization === 'ad'
                                ? '광고'
                                : '유료'}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm">
                              <svg className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                              <span>{game.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-400">
                          ₩{game.revenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">매출</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-slate-400 text-xs mb-1">활성 유저</p>
                        <p className="font-semibold">{game.testers.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-slate-400 text-xs mb-1">D+1 리텐션</p>
                        <p className="font-semibold text-green-400">{game.retention.d1}%</p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-slate-400 text-xs mb-1">D+30 리텐션</p>
                        <p className="font-semibold text-blue-400">{game.retention.d30}%</p>
                      </div>
                      {game.arppu > 0 && (
                        <>
                          <div className="p-2 bg-slate-800/50 rounded">
                            <p className="text-slate-400 text-xs mb-1">ARPPU</p>
                            <p className="font-semibold">₩{game.arppu.toLocaleString()}</p>
                          </div>
                          <div className="p-2 bg-slate-800/50 rounded">
                            <p className="text-slate-400 text-xs mb-1">전환율</p>
                            <p className="font-semibold text-purple-400">{game.conversion}%</p>
                          </div>
                        </>
                      )}
                      {game.arppu === 0 && (
                        <div className="col-span-2 p-2 bg-slate-800/50 rounded">
                          <p className="text-slate-400 text-xs mb-1">수익 모델</p>
                          <p className="font-semibold">광고 기반</p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Feedback */}
      <Card className="bg-slate-900 border border-slate-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">최근 피드백</h2>
            <Link href="/feedback" className="text-sm text-green-400 hover:text-green-300">
              모두 보기 →
            </Link>
          </div>
          <div className="space-y-4">
            {recentFeedback.map((feedback) => (
              <div
                key={feedback.id}
                className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    feedback.priority === 'high'
                      ? 'bg-red-500/20'
                      : feedback.priority === 'medium'
                      ? 'bg-yellow-500/20'
                      : 'bg-blue-500/20'
                  }`}
                >
                  <svg
                    className={`w-5 h-5 ${
                      feedback.priority === 'high'
                        ? 'text-red-400'
                        : feedback.priority === 'medium'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{feedback.user}</span>
                    <span className="text-sm text-slate-500">•</span>
                    <Badge variant="outline" className="text-xs">
                      {feedback.game}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        feedback.type === '버그'
                          ? 'border-red-500/50 text-red-400'
                          : feedback.type === '제안'
                          ? 'border-yellow-500/50 text-yellow-400'
                          : 'border-green-500/50 text-green-400'
                      }`}
                    >
                      {feedback.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{feedback.message}</p>
                  <span className="text-xs text-slate-500">{feedback.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
