'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import Badge from '@/components/Badge'
import {
  Users,
  DollarSign,
  Eye,
  Download,
  Star,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d')

  // Mock data
  const overviewStats = [
    {
      label: '총 플레이 수',
      value: '128,450',
      change: '+12.5%',
      trend: 'up',
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-400',
    },
    {
      label: '신규 유저',
      value: '4,230',
      change: '+8.2%',
      trend: 'up',
      icon: <Download className="w-6 h-6" />,
      color: 'text-green-400',
    },
    {
      label: '매출',
      value: '₩45,280,000',
      change: '+18.7%',
      trend: 'up',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'text-yellow-400',
    },
    {
      label: '평균 평점',
      value: '4.6',
      change: '+0.3',
      trend: 'up',
      icon: <Star className="w-6 h-6" />,
      color: 'text-purple-400',
    },
  ]

  const topGames = [
    {
      id: 1,
      title: 'Racing Legends',
      plays: 45230,
      revenue: 28450000,
      rating: 4.7,
      change: 18.5,
    },
    {
      id: 2,
      title: 'Cyber Nexus',
      plays: 38450,
      revenue: 8450000,
      rating: 4.8,
      change: 12.3,
    },
    {
      id: 3,
      title: 'Battle Arena Pro',
      plays: 32100,
      revenue: 5230000,
      rating: 4.8,
      change: 22.1,
    },
    {
      id: 4,
      title: 'Stellar Warfare',
      plays: 28650,
      revenue: 3200000,
      rating: 4.6,
      change: 8.7,
    },
    {
      id: 5,
      title: 'Mystic Realms',
      plays: 18900,
      revenue: 1850000,
      rating: 4.5,
      change: 5.2,
    },
  ]

  const weeklyData = [
    { day: '월', plays: 15200, revenue: 4200000, users: 2100 },
    { day: '화', plays: 16800, revenue: 4800000, users: 2300 },
    { day: '수', plays: 19200, revenue: 5600000, users: 2800 },
    { day: '목', plays: 21500, revenue: 6200000, users: 3200 },
    { day: '금', plays: 23800, revenue: 7100000, users: 3600 },
    { day: '토', plays: 28400, revenue: 8900000, users: 4100 },
    { day: '일', plays: 32100, revenue: 10480000, users: 4500 },
  ]

  const retentionData = [
    { period: 'D+1', rate: 75, color: 'bg-green-500' },
    { period: 'D+3', rate: 58, color: 'bg-blue-500' },
    { period: 'D+7', rate: 45, color: 'bg-purple-500' },
    { period: 'D+14', rate: 32, color: 'bg-orange-500' },
    { period: 'D+30', rate: 18, color: 'bg-red-500' },
  ]

  const maxValue = Math.max(...weeklyData.map(d => d.plays))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">분석</h1>
          <p className="text-slate-400">게임 성과 및 사용자 행동을 분석하세요</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '7d'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            7일
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '30d'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            30일
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '90d'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            90일
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={stat.color}>{stat.icon}</div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 text-white">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>주간 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyData.map((data, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-400">{data.day}</span>
                    <span className="text-sm font-semibold text-white">{data.plays.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${(data.plays / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Retention Chart */}
        <Card>
          <CardHeader>
            <CardTitle>리텐션 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {retentionData.map((data, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-400">{data.period}</span>
                    <span className="text-sm font-semibold text-white">{data.rate}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`${data.color} h-2 rounded-full transition-all`}
                      style={{ width: `${data.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Games */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>인기 게임</CardTitle>
            <Badge variant="secondary">최근 7일</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topGames.map((game, index) => (
              <div
                key={game.id}
                className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-1">{game.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {game.plays.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {game.rating}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">
                    ₩{(game.revenue / 10000).toFixed(0)}만
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <ArrowUpRight className="w-3 h-3" />
                    {game.change}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">유료 판매</p>
                <p className="text-2xl font-bold text-white">₩38.2M</p>
              </div>
            </div>
            <div className="text-sm text-green-400">전체의 84.4%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">광고 수익</p>
                <p className="text-2xl font-bold text-white">₩7.1M</p>
              </div>
            </div>
            <div className="text-sm text-yellow-400">전체의 15.6%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">평균 ARPPU</p>
                <p className="text-2xl font-bold text-white">₩28.4K</p>
              </div>
            </div>
            <div className="text-sm text-blue-400">+5.3% 증가</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
