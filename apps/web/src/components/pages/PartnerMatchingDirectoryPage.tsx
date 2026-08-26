'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import partnerMatchingService, { PartnerMatchingProfile } from '@/services/partnerMatchingService'
import MiniHomeCreateModal from '@/components/MiniHomeCreateModal'
import { COMPANY_TYPE_LABELS } from '@/components/pages/partner-profile/constants'
import { isEmptyRichText, stripRichText } from '@/lib/richText'

const companyTypeOptions = Object.entries(COMPANY_TYPE_LABELS)
  .filter(([value]) => value !== 'developer')
  .map(([value, label]) => ({ value, label }))

const categoryOptions = [
  { value: 'all', label: '전체' },
  { value: 'developer', label: '개발사' },
  { value: 'partner', label: '파트너사' },
]

export default function PartnerMatchingDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string[]>([])
  const [companyTypeDropdownOpen, setCompanyTypeDropdownOpen] = useState(false)
  const companyTypeDropdownRef = useRef<HTMLDivElement>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyTypeDropdownRef.current && !companyTypeDropdownRef.current.contains(e.target as Node)) {
        setCompanyTypeDropdownOpen(false)
      }
    }
    if (companyTypeDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [companyTypeDropdownOpen])

  const toggleCompanyType = (value: string) => {
    setCompanyTypeFilter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value])
    setPage(1)
  }

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['partnerMatchingProfiles', page, searchQuery, companyTypeFilter, categoryFilter, sortBy],
    queryFn: () =>
      partnerMatchingService.getPartnerProfiles({
        page,
        limit: 12,
        search: searchQuery || undefined,
        companyType: companyTypeFilter.length > 0 ? companyTypeFilter.join(',') : undefined,
        tab: categoryFilter !== 'all' ? categoryFilter : undefined,
        sort: sortBy !== 'default' ? sortBy : undefined,
      }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['partnerMatchingStats'],
    queryFn: () => partnerMatchingService.getPartnerStats(),
  })

  const profiles: PartnerMatchingProfile[] = data?.profiles || []
  const pagination = data?.pagination
  const stats = statsData?.stats

  const sortOptions = [
    { key: 'default', label: '기본 정렬순' },
    { key: 'rating', label: '평점 높은 순' },
    { key: 'portfolio', label: '포트폴리오 많은 순' },
    { key: 'recent', label: '최근 업데이트 순' },
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
        {/* Search + Filter + Tabs — 하나의 카드로 통합 */}
        <div className="bg-bg-tertiary/50 border border-line-light rounded-2xl p-6 mb-8 shadow-sm shadow-black/[0.02]">
          {stats && (
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-6.13a4 4 0 100 8 4 4 0 000-8zm7 4a4 4 0 00-4-4" />
              </svg>
              <span className="text-2xl font-bold text-accent">{stats.total}</span>
              <span className="text-sm text-text-secondary">명의 파트너가 활동하고 있어요</span>
            </div>
          )}
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="파트너명, 회사명으로 검색..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full bg-bg-secondary border border-line text-text-primary rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="bg-bg-secondary border border-line text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="relative" ref={companyTypeDropdownRef}>
              <button
                type="button"
                onClick={() => setCompanyTypeDropdownOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 bg-bg-secondary border border-line text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow"
              >
                <span className="truncate">
                  {companyTypeFilter.length === 0
                    ? '전체 기업 형태'
                    : companyTypeFilter.length === 1
                      ? COMPANY_TYPE_LABELS[companyTypeFilter[0]] || companyTypeFilter[0]
                      : `기업 형태 ${companyTypeFilter.length}개 선택`}
                </span>
                <svg className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${companyTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {companyTypeDropdownOpen && (
                <div className="absolute z-20 top-full mt-1.5 w-full min-w-[12rem] bg-bg-card border border-line rounded-xl shadow-lg py-1.5 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setCompanyTypeFilter([]); setPage(1) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${companyTypeFilter.length === 0 ? 'bg-accent border-accent' : 'border-line'}`}>
                      {companyTypeFilter.length === 0 && (
                        <svg className="w-3 h-3 text-text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      )}
                    </span>
                    전체 기업 형태
                  </button>
                  <div className="my-1 border-t border-line-light/60" />
                  {companyTypeOptions.map((opt) => {
                    const checked = companyTypeFilter.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleCompanyType(opt.value)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-accent border-accent' : 'border-line'}`}>
                          {checked && (
                            <svg className="w-3 h-3 text-text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          )}
                        </span>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center flex-wrap gap-3 mb-6 pb-4 border-b border-line text-sm">
          {sortOptions.map((opt, i) => (
            <div key={opt.key} className="flex items-center gap-3">
              {i > 0 && <span className="text-line-light select-none">|</span>}
              <button
                onClick={() => { setSortBy(opt.key); setPage(1) }}
                className={`flex items-center gap-1 transition-colors ${sortBy === opt.key ? 'text-text-primary font-semibold' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {sortBy === opt.key && (
                  <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {opt.label}
              </button>
            </div>
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
              const companyCategory = profile.userId?.companyInfo?.companyCategory
              const companyTypeArr = profile.userId?.companyInfo?.companyType || []
              const isDeveloperCompany = companyCategory === 'developer' || (!companyCategory && companyTypeArr.includes('developer'))
              const portfolioCount = profile.portfolio?.length ?? 0
              const filledStars = Math.round(profile.rating || 0)
              return (
              <Link
                key={profile._id}
                href={`/partner/${profile._id}`}
                className="group relative flex items-center gap-5 bg-bg-tertiary/50 border border-line-light rounded-2xl p-5 overflow-hidden transition-colors hover:border-accent cursor-pointer"
              >
                {/* 아바타 */}
                {profile.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profileImage}
                    alt={displayName}
                    className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-accent text-text-inverse text-3xl font-bold flex-shrink-0">
                    {displayName.charAt(0) || '?'}
                  </div>
                )}

                {/* 이름 + 소개 + 태그 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-text-primary truncate group-hover:text-accent transition-colors">{displayName}</h3>
                    {profile.isVerified && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 bg-accent-light text-accent">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        인증
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted mb-1.5">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1h3a1 1 0 011 1v3M14 21H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 21v-6a1 1 0 00-1-1h-2a1 1 0 00-1 1v6" /></svg>
                      {isDeveloperCompany ? '개발' : '파트너'}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /></svg>
                      {profile.userId?.companyInfo?.businessType === 'individual' ? '개인사업자' : '법인'}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary truncate mb-2.5">{hasIntro ? stripRichText(profile.introduction) : '등록된 소개가 없습니다'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.userId?.companyInfo?.companyType?.filter(t => t !== 'developer').slice(0, 4).map((type, i) => (
                      <span key={i} className="bg-accent-light text-accent px-2 py-0.5 rounded-full text-xs">{COMPANY_TYPE_LABELS[type] || type}</span>
                    ))}
                  </div>
                  {profile.isVerified && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 border border-teal-600/30 dark:border-teal-400/30 rounded-full px-2 py-0.5">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        신원 인증
                      </span>
                    </div>
                  )}
                </div>

                {/* 스탯 */}
                <div className="flex-shrink-0 hidden sm:flex flex-col gap-2 pl-6 border-l border-line-light/60 min-w-[10rem]">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg key={i} className={`w-4 h-4 ${i < filledStars ? 'text-yellow-500' : 'text-line-light'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.538 1.118l-3.367-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.196-1.538-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.563 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.958z" />
                      </svg>
                    ))}
                    <span className="ml-1 font-bold text-text-primary">{(profile.rating || 0).toFixed(2)}</span>
                    <span className="text-xs text-text-muted">/ 평가 {profile.reviewCount || 0}개</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">계약한 프로젝트</span>
                    <span className="font-bold text-text-primary">{profile.completedProjectCount || 0} 건</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">포트폴리오</span>
                    <span className="font-bold text-text-primary">{portfolioCount} 개</span>
                  </div>
                </div>

                {/* 화살표 */}
                <svg className="w-5 h-5 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
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
    </>
  )
}
