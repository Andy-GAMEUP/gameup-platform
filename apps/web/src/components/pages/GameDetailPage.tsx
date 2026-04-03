'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card } from '@/components/Card'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/Tabs'

export default function GameDetailPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')

  const game = {
    id: id || '1',
    title: 'Cyber Nexus',
    description: '사이버펑크 세계를 배경으로 한 액션 RPG 게임입니다. 미래 도시를 탐험하고 강력한 적들과 전투하세요.',
    genre: 'RPG',
    platform: ['PC', 'PlayStation', 'Xbox'],
    status: '진행중',
    releaseDate: '2024.06.15',
    testPeriod: '2024.02.01 - 2024.05.31',
    rating: 4.8,
    testers: 2450,
    downloads: 892,
    feedback: 342,
    views: 15420,
  }

  const stats = [
    {
      label: '테스터',
      value: game.testers.toLocaleString(),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-blue-400',
    },
    {
      label: '다운로드',
      value: game.downloads,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      color: 'text-accent',
    },
    {
      label: '피드백',
      value: game.feedback,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'text-purple-400',
    },
    {
      label: '조회수',
      value: game.views.toLocaleString(),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      color: 'text-orange-400',
    },
  ]

  const screenshots = [
    { id: 1, title: '메인 화면' },
    { id: 2, title: '전투 장면' },
    { id: 3, title: '도시 풍경' },
    { id: 4, title: '캐릭터' },
  ]

  const recentFeedback = [
    {
      id: 1,
      user: '김게이머',
      rating: 5,
      comment: '정말 재미있는 게임입니다! 그래픽도 훌륭하고 스토리도 흥미진진해요.',
      date: '2024.02.08',
      type: '긍정',
    },
    {
      id: 2,
      user: '이플레이어',
      rating: 4,
      comment: '전투 시스템은 좋은데 로딩 시간이 조금 길어요.',
      date: '2024.02.07',
      type: '제안',
    },
    {
      id: 3,
      user: '박유저',
      rating: 3,
      comment: '레벨 15에서 버그가 발견되었습니다. 캐릭터가 벽을 통과합니다.',
      date: '2024.02.06',
      type: '버그',
    },
  ]

  const testMilestones = [
    { date: '2024.02.01', event: '베타 테스트 시작', status: 'completed' },
    { date: '2024.03.01', event: '중간 피드백 분석', status: 'completed' },
    { date: '2024.04.01', event: '주요 업데이트 배포', status: 'upcoming' },
    { date: '2024.05.31', event: '베타 테스트 종료', status: 'upcoming' },
  ]

  const announcements = [
    {
      id: 1,
      title: '긴급 점검 안내',
      date: '2024.02.10',
      type: '점검',
      priority: 'high',
      content: '서버 안정화를 위한 긴급 점검이 예정되어 있습니다.',
      sent: true,
      recipients: 2450,
    },
    {
      id: 2,
      title: '신규 콘텐츠 업데이트',
      date: '2024.02.08',
      type: '업데이트',
      priority: 'normal',
      content: '새로운 던전과 아이템이 추가됩니다.',
      sent: true,
      recipients: 2450,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/games-management">
            <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              게임 목록
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-1">{game.title}</h1>
            <div className="flex items-center gap-3">
              <Badge
                className={`${
                  game.status === '진행중'
                    ? 'bg-accent-light text-accent border-accent-muted'
                    : 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                }`}
              >
                {game.status}
              </Badge>
              <div className="flex items-center gap-1 text-text-secondary">
                <svg className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <span className="font-semibold">{game.rating}</span>
                <span className="text-sm">({game.testers} 평가)</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/games-management/${game.id}/edit`}>
            <Button variant="outline" className="border-line hover:bg-bg-tertiary">
              편집
            </Button>
          </Link>
          <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            삭제
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-bg-secondary border border-line">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className={stat.color}>{stat.icon}</div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-text-secondary">{stat.label}</div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-bg-secondary border border-line">
          <TabsTrigger value="overview">기본 정보</TabsTrigger>
          <TabsTrigger value="media">미디어</TabsTrigger>
          <TabsTrigger value="feedback">피드백</TabsTrigger>
          <TabsTrigger value="announcements">공지사항</TabsTrigger>
        </TabsList>

        {/* 기본 정보 탭 */}
        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Game Information */}
                <Card className="bg-bg-secondary border border-line">
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-6">게임 정보</h2>

                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-text-secondary mb-2">게임 제목</div>
                        <p className="text-text-primary text-lg">{game.title}</p>
                      </div>

                      <div>
                        <div className="text-sm text-text-secondary mb-2">게임 설명</div>
                        <p className="text-text-secondary">{game.description}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-text-secondary mb-2">장르</div>
                          <p className="text-text-primary">{game.genre}</p>
                        </div>

                        <div>
                          <div className="text-sm text-text-secondary mb-2">플랫폼</div>
                          <div className="flex gap-2">
                            {game.platform.map((p) => (
                              <Badge key={p} variant="outline" className="border-line">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-text-secondary mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            출시 예정일
                          </div>
                          <p className="text-text-primary">{game.releaseDate}</p>
                        </div>

                        <div>
                          <div className="text-sm text-text-secondary mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            테스트 기간
                          </div>
                          <p className="text-text-primary">{game.testPeriod}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Test Timeline */}
                <Card className="bg-bg-secondary border border-line">
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-6">테스트 일정</h2>

                    <div className="space-y-4">
                      {testMilestones.map((milestone, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="relative">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                milestone.status === 'completed'
                                  ? 'bg-accent-light border-2 border-accent'
                                  : 'bg-bg-tertiary border-2 border-line'
                              }`}
                            >
                              {milestone.status === 'completed' && (
                                <div className="w-3 h-3 bg-accent rounded-full" />
                              )}
                            </div>
                            {index < testMilestones.length - 1 && (
                              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-bg-tertiary" />
                            )}
                          </div>
                          <div className="flex-1 pb-8">
                            <p className="text-sm text-text-secondary mb-1">{milestone.date}</p>
                            <p className="font-medium">{milestone.event}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-bg-secondary border border-line">
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-6">빠른 작업</h2>

                    <div className="space-y-3">
                      <Button className="w-full justify-start bg-bg-tertiary hover:bg-bg-tertiary">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        테스터 관리
                      </Button>
                      <Button className="w-full justify-start bg-bg-tertiary hover:bg-bg-tertiary">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        피드백 확인
                      </Button>
                      <Button className="w-full justify-start bg-bg-tertiary hover:bg-bg-tertiary">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        빌드 업로드
                      </Button>
                      <Button className="w-full justify-start bg-bg-tertiary hover:bg-bg-tertiary">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        베타존에서 보기
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Alerts */}
                <Card className="bg-bg-secondary border border-line">
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-6">알림</h2>

                    <div className="space-y-3">
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
                        <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="text-sm">
                          <p className="text-red-400 font-medium mb-1">긴급 버그 리포트</p>
                          <p className="text-text-secondary text-xs">3건의 긴급 버그가 보고되었습니다</p>
                        </div>
                      </div>

                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex gap-2">
                        <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="text-sm">
                          <p className="text-yellow-400 font-medium mb-1">업데이트 권장</p>
                          <p className="text-text-secondary text-xs">새 빌드 업로드가 필요합니다</p>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-2">
                        <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm">
                          <p className="text-blue-400 font-medium mb-1">테스터 증가</p>
                          <p className="text-text-secondary text-xs">이번 주 +150명의 신규 테스터</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* 미디어 탭 */}
          {activeTab === 'media' && (
            <Card className="bg-bg-secondary border border-line">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">스크린샷 및 미디어</h2>
                  <Button variant="outline" size="sm" className="border-line hover:bg-bg-tertiary">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    업로드
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {screenshots.map((screenshot) => (
                    <div
                      key={screenshot.id}
                      className="aspect-video bg-bg-tertiary/50 rounded-lg border-2 border-dashed border-line hover:border-line transition-colors flex items-center justify-center relative group"
                    >
                      <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="absolute bottom-2 left-2 right-2 text-xs text-text-secondary bg-bg-secondary/80 px-2 py-1 rounded">
                        {screenshot.title}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="my-6 h-px bg-line" />

                <div>
                  <h3 className="font-semibold mb-4">트레일러 동영상</h3>
                  <div className="aspect-video bg-bg-tertiary/50 rounded-lg border-2 border-dashed border-line flex items-center justify-center">
                    <div className="text-center text-text-muted">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">트레일러 영상 영역</p>
                      <Button variant="ghost" size="sm" className="mt-2">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        동영상 업로드
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 피드백 탭 */}
          {activeTab === 'feedback' && (
            <Card className="bg-bg-secondary border border-line">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">최근 피드백</h2>
                  <Link href={`/feedback?game=${game.id}`}>
                    <Button variant="ghost" size="sm" className="text-accent hover:text-accent">
                      모두 보기 →
                    </Button>
                  </Link>
                </div>

                <div className="space-y-4">
                  {recentFeedback.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="p-4 bg-bg-tertiary/30 rounded-lg border border-line hover:bg-bg-tertiary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-bg-tertiary rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold">{feedback.user[0]}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{feedback.user}</p>
                            <p className="text-xs text-text-muted">{feedback.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              feedback.type === '버그'
                                ? 'border-red-500/50 text-red-400'
                                : feedback.type === '제안'
                                ? 'border-yellow-500/50 text-yellow-400'
                                : 'border-accent-muted text-accent'
                            }`}
                          >
                            {feedback.type}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-3 h-3 ${
                                  i < feedback.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-text-secondary'
                                }`}
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary">{feedback.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* 공지사항 탭 */}
          {activeTab === 'announcements' && (
            <Card className="bg-bg-secondary border border-line">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">공지사항 및 푸시 알림</h2>
                    <p className="text-sm text-text-secondary mt-1">
                      테스터들에게 중요한 소식을 전달하세요
                    </p>
                  </div>
                  <Button className="bg-accent hover:bg-accent-hover">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    공지 작성
                  </Button>
                </div>

                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="p-4 bg-bg-tertiary/30 rounded-lg border border-line hover:bg-bg-tertiary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              announcement.priority === 'high'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{announcement.title}</h3>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  announcement.type === '점검'
                                    ? 'border-orange-500/50 text-orange-400'
                                    : announcement.type === '업데이트'
                                    ? 'border-blue-500/50 text-blue-400'
                                    : 'border-line/50 text-text-secondary'
                                }`}
                              >
                                {announcement.type}
                              </Badge>
                              {announcement.priority === 'high' && (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                                  긴급
                                </Badge>
                              )}
                              {announcement.sent && (
                                <Badge className="bg-accent-light text-accent border-accent-muted text-xs">
                                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  발송완료
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary mb-2">{announcement.content}</p>
                            <div className="flex items-center gap-4 text-xs text-text-secondary">
                              <span>{announcement.date}</span>
                              {announcement.sent && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <span>{announcement.recipients.toLocaleString()}명에게 발송</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 알림 통계 */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h3 className="font-semibold mb-3">알림 통계</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-text-secondary mb-1">총 공지</p>
                      <p className="text-2xl font-bold">{announcements.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary mb-1">푸시 발송</p>
                      <p className="text-2xl font-bold text-accent">
                        {announcements.filter((a) => a.sent).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary mb-1">도달률</p>
                      <p className="text-2xl font-bold text-blue-400">98.5%</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
