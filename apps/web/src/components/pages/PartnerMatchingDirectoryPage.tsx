'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import partnerMatchingService, { PartnerMatchingProfile } from '@/services/partnerMatchingService'

const expertiseOptions = [
  { value: 'all', label: '전체 전문 분야' },
  { value: 'developer', label: '게임 개발' },
  { value: 'publisher', label: '퍼블리싱' },
  { value: 'game_solution', label: '게임 솔루션' },
  { value: 'game_service', label: '게임 서비스' },
  { value: 'operations', label: '운영' },
  { value: 'qa', label: 'QA/테스트' },
  { value: 'marketing', label: '마케팅' },
  { value: 'other', label: '기타' },
]

const availabilityLabel: Record<string, { text: string; color: string }> = {
  available: { text: '즉시 가능', color: 'text-green-400' },
  busy: { text: '협의 필요', color: 'text-yellow-400' },
  unavailable: { text: '불가', color: 'text-red-400' },
}

export default function PartnerMatchingDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expertiseFilter, setExpertiseFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['partnerMatchingProfiles', page, searchQuery, expertiseFilter, activeTab],
    queryFn: () =>
      partnerMatchingService.getPartnerProfiles({
        page,
        limit: 12,
        search: searchQuery || undefined,
        expertise: expertiseFilter !== 'all' ? expertiseFilter : undefined,
        tab: activeTab !== 'all' ? activeTab : undefined,
      }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['partnerMatchingStats'],
    queryFn: () => partnerMatchingService.getPartnerStats(),
  })

  const profiles: PartnerMatchingProfile[] = data?.profiles || []
  const pagination = data?.pagination
  const stats = statsData?.stats

  const tabs = [
    { key: 'all', label: '전체' },
    { key: 'developer', label: '개발사' },
    { key: 'partner', label: '파트너사' },
    { key: 'verified', label: '인증 파트너' },
  ]

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      {/* Header */}
      <div className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">파트너라운지</h1>
            <p className="text-text-secondary">검증된 전문가와 개발사를 찾아보세요</p>
          </div>
          <div className="flex gap-6 -mb-px">
            <Link
              href="/partner/projects"
              className="pb-3 px-1 text-sm font-medium border-b-2 border-transparent text-text-secondary hover:text-text-primary transition-colors"
            >
              프로젝트
            </Link>
            <Link
              href="/partner/directory"
              className="pb-3 px-1 text-sm font-medium border-b-2 border-accent text-accent transition-colors"
            >
              파트너 디렉토리
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="파트너명, 회사명, 스킬로 검색..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={expertiseFilter}
              onChange={(e) => { setExpertiseFilter(e.target.value); setPage(1) }}
              className="bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
            >
              {expertiseOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { value: stats.total, label: '전체 파트너', color: 'text-accent' },
              { value: stats.verified, label: '인증 파트너', color: 'text-green-400' },
              { value: stats.developers, label: '개발사', color: 'text-purple-400' },
              { value: stats.avgRating, label: '평균 평점', color: 'text-orange-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 text-center">
                <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-sm text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-line pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-accent text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Partner Cards */}
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">불러오는 중...</div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-12 text-text-muted">검색 결과가 없습니다.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {profiles.map((profile) => (
              <div key={profile._id} className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 hover:border-accent-muted transition-colors">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-text-primary text-xl font-bold flex-shrink-0">
                    {profile.companyName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold text-text-primary truncate">{profile.companyName}</h3>
                      {profile.isVerified && (
                        <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{profile.userId?.companyInfo?.companyName || ''}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.expertiseArea?.slice(0, 2).map((area, i) => (
                        <span key={i} className="bg-accent-light text-accent px-2 py-0.5 rounded text-xs">{area}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-text-secondary mb-4 line-clamp-2">{profile.introduction}</p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-line-light">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold text-text-primary">{profile.rating || 0}</span>
                    </div>
                    <div className="text-xs text-text-muted">{profile.reviewCount || 0} 리뷰</div>
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">{profile.completedProjectCount || 0}</div>
                    <div className="text-xs text-text-muted">완료 프로젝트</div>
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary text-sm">{profile.location || '-'}</div>
                    <div className="text-xs text-text-muted">위치</div>
                  </div>
                </div>

                {/* Skills */}
                {profile.skills?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-text-muted mb-2">주요 스킬</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.slice(0, 5).map((skill, i) => (
                        <span key={i} className="bg-bg-tertiary/50 text-text-secondary px-2 py-0.5 rounded text-xs">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rate + Availability */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-text-muted mb-1">단가 기준</div>
                    <div className="font-medium text-text-primary">{profile.hourlyRate || '협의'}</div>
                  </div>
                  <div>
                    <div className="text-text-muted mb-1">작업 가능</div>
                    <div className={`font-medium ${availabilityLabel[profile.availability]?.color || 'text-text-secondary'}`}>
                      {availabilityLabel[profile.availability]?.text || '-'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 bg-accent hover:bg-accent-hover text-text-primary py-2.5 rounded-lg text-sm font-medium transition-colors">
                    연락하기
                  </button>
                  <Link href={`/partner/${profile._id}`} className="flex-1 border border-line hover:border-line text-text-secondary py-2.5 rounded-lg text-sm font-medium text-center transition-colors">
                    프로필 보기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  p === page ? 'bg-accent text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
