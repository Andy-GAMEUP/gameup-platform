'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import partnerMatchingService, { PartnerMatchingProfile } from '@/services/partnerMatchingService'
import MiniHomeCreateModal from '@/components/MiniHomeCreateModal'
import ContactPartnerModal from '@/components/ContactPartnerModal'
import { COMPANY_TYPE_LABELS } from '@/components/pages/partner-profile/constants'
import { isEmptyRichText, stripRichText } from '@/lib/richText'

const companyTypeOptions = [
  { value: 'all', label: '전체 사업 형태' },
  ...Object.entries(COMPANY_TYPE_LABELS)
    .filter(([value]) => value !== 'developer')
    .map(([value, label]) => ({ value, label })),
]

export default function PartnerMatchingDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [companyTypeFilter, setCompanyTypeFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [contactTarget, setContactTarget] = useState<{ id: string; name: string } | null>(null)

  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['partnerMatchingProfiles', page, searchQuery, companyTypeFilter, activeTab],
    queryFn: () =>
      partnerMatchingService.getPartnerProfiles({
        page,
        limit: 12,
        search: searchQuery || undefined,
        companyType: companyTypeFilter !== 'all' ? companyTypeFilter : undefined,
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
    <>
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      {/* Header */}
      <div className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">파트너 찾기</h1>
              <p className="text-text-secondary">검증된 전문가와 개발사를 찾아보세요</p>
            </div>
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
                placeholder="파트너명, 회사명으로 검색..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={companyTypeFilter}
              onChange={(e) => { setCompanyTypeFilter(e.target.value); setPage(1) }}
              className="bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
            >
              {companyTypeOptions.map((opt) => (
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
              className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
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
          <div className="flex flex-col gap-4">
            {profiles.map((profile) => {
              const displayName = profile.displayNameOverride || profile.userId?.companyInfo?.companyName || profile.userId?.username || '이름 없음'
              const hasIntro = !isEmptyRichText(profile.introduction)
              const hasHistory = (profile.history?.length ?? 0) > 0
              const hasSkills = (profile.skills?.length ?? 0) > 0
              const isProfileComplete = hasIntro && hasHistory && hasSkills
              return (
              <div key={profile._id} className="bg-bg-tertiary/50 border border-line-light rounded-xl p-5 hover:border-accent-muted transition-colors flex items-center gap-6">
                {/* 아바타 */}
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-text-primary text-xl font-bold flex-shrink-0">
                  {displayName.charAt(0) || '?'}
                </div>

                {/* 이름 + 소개 + 태그 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-text-primary truncate">{displayName}</h3>
                    {profile.isVerified && (
                      <svg className="w-5 h-5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary truncate mb-2">{hasIntro ? stripRichText(profile.introduction) : '등록된 소개가 없습니다'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.userId?.companyInfo?.companyType?.filter(t => t !== 'developer').slice(0, 3).map((type, i) => (
                      <span key={i} className="bg-accent-light text-accent px-2 py-0.5 rounded text-xs">{COMPANY_TYPE_LABELS[type] || type}</span>
                    ))}
                  </div>
                </div>

                {/* 스탯 */}
                <div className="flex-shrink-0 flex gap-6 text-sm">
                  <div className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold text-text-primary">{profile.rating || 0}</span>
                    </div>
                    <div className="text-xs text-text-muted">{profile.reviewCount || 0} 리뷰</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-text-primary">{profile.completedProjectCount || 0}</div>
                    <div className="text-xs text-text-muted">완료 프로젝트</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-text-primary">{profile.hourlyRate || '협의'}</div>
                    <div className="text-xs text-text-muted">단가 기준</div>
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (!isAuthenticated) { alert('로그인이 필요합니다'); return }
                      if (user?.id === profile.userId?._id) { alert('본인 채널에는 메시지를 보낼 수 없습니다'); return }
                      setContactTarget({ id: profile._id, name: displayName })
                    }}
                    className="bg-accent hover:bg-accent-hover text-text-primary px-5 py-2 rounded-lg text-base font-medium transition-colors whitespace-nowrap"
                  >
                    연락하기
                  </button>
                  {isProfileComplete ? (
                    <Link href={`/partner/${profile._id}`} className="border border-line hover:border-accent text-text-secondary px-5 py-2 rounded-lg text-sm font-medium text-center transition-colors whitespace-nowrap">
                      프로필 보기
                    </Link>
                  ) : (
                    <span
                      title="소개, 회사 연혁, 보유 기술을 모두 등록해야 프로필을 볼 수 있습니다"
                      aria-disabled="true"
                      className="border border-line text-text-muted px-5 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap cursor-not-allowed opacity-50"
                    >
                      프로필 보기
                    </span>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded-lg text-base font-medium transition-colors ${
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

    <MiniHomeCreateModal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      onSuccess={() => {
        setShowCreateModal(false)
        queryClient.invalidateQueries({ queryKey: ['partnerMatchingProfiles'] })
        queryClient.invalidateQueries({ queryKey: ['partnerMatchingStats'] })
      }}
    />

    <ContactPartnerModal
      isOpen={!!contactTarget}
      partnerId={contactTarget?.id || ''}
      partnerName={contactTarget?.name || ''}
      onClose={() => setContactTarget(null)}
    />
    </>
  )
}
