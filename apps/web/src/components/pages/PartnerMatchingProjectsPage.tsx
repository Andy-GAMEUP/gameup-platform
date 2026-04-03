'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import partnerMatchingService, { PartnerProjectItem } from '@/services/partnerMatchingService'

const categoryOptions = [
  { value: 'all', label: '전체' },
  { value: '웹 개발', label: '웹 개발' },
  { value: '앱 개발', label: '앱 개발' },
  { value: '디자인', label: '디자인' },
  { value: '마케팅', label: '마케팅' },
  { value: 'QA/테스트', label: 'QA/테스트' },
  { value: '번역/현지화', label: '번역/현지화' },
  { value: '웹퍼블리싱', label: '웹퍼블리싱' },
  { value: '서버/인프라', label: '서버/인프라' },
  { value: '컨설팅', label: '컨설팅' },
]

const statusLabel: Record<string, { text: string; color: string }> = {
  recruiting: { text: '모집중', color: 'bg-green-500/20 text-green-400' },
  ongoing: { text: '진행중', color: 'bg-accent-light text-accent' },
  completed: { text: '완료', color: 'bg-bg-muted/20 text-text-secondary' },
}

export default function PartnerMatchingProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['partnerProjects', page, searchQuery, categoryFilter, activeTab],
    queryFn: () =>
      partnerMatchingService.getProjects({
        page,
        limit: 12,
        search: searchQuery || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        tab: activeTab !== 'all' ? activeTab : undefined,
      }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['partnerProjectStats'],
    queryFn: () => partnerMatchingService.getProjectStats(),
  })

  const projects: PartnerProjectItem[] = data?.projects || []
  const pagination = data?.pagination
  const stats = statsData?.stats

  const tabs = [
    { key: 'all', label: '전체' },
    { key: 'recruiting', label: '모집중' },
    { key: 'ongoing', label: '진행중' },
  ]

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      {/* Header */}
      <div className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">파트너라운지</h1>
            <p className="text-text-secondary">다양한 프로젝트를 탐색하고 지원하세요</p>
          </div>
          <div className="flex gap-6 -mb-px">
            <Link
              href="/partner/projects"
              className="pb-3 px-1 text-sm font-medium border-b-2 border-accent text-accent transition-colors"
            >
              프로젝트
            </Link>
            <Link
              href="/partner/directory"
              className="pb-3 px-1 text-sm font-medium border-b-2 border-transparent text-text-secondary hover:text-text-primary transition-colors"
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
                placeholder="프로젝트 또는 회사명으로 검색..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { value: stats.total, label: '전체 프로젝트', color: 'text-accent' },
              { value: stats.recruiting, label: '모집중', color: 'text-green-400' },
              { value: stats.totalApplicants, label: '총 지원자', color: 'text-purple-400' },
              { value: stats.newThisWeek, label: '신규 (주간)', color: 'text-orange-400' },
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
                activeTab === tab.key ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Project Cards */}
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-text-muted">검색 결과가 없습니다.</div>
        ) : (
          <div className="grid gap-6">
            {projects.map((project) => {
              const status = statusLabel[project.status] || statusLabel.recruiting
              return (
                <div key={project._id} className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 hover:border-accent-muted transition-colors">
                  {/* Header */}
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${status.color}`}>{status.text}</span>
                      <span className="bg-bg-tertiary/50 text-text-secondary px-2.5 py-0.5 rounded text-xs">{project.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>지원자 {project.applicantCount}명</span>
                    </div>
                  </div>

                  <h2 className="text-2xl font-semibold text-text-primary mb-2">{project.title}</h2>
                  <p className="text-text-secondary flex items-center gap-2 text-base mb-4">
                    🏢 {project.ownerId?.companyInfo?.companyName || project.ownerId?.username}
                  </p>
                  <p className="text-text-secondary mb-6">{project.description}</p>

                  {/* Meta */}
                  <div className="grid sm:grid-cols-4 gap-4 mb-6 pb-6 border-b border-line-light">
                    {[
                      { icon: '💰', label: '예산', value: project.budget || `${project.budgetMin} ~ ${project.budgetMax}` },
                      { icon: '📅', label: '기간', value: project.duration },
                      { icon: '📍', label: '위치', value: project.location },
                      { icon: '⏰', label: '마감일', value: project.applicationDeadline ? new Date(project.applicationDeadline).toLocaleDateString('ko-KR') : '-' },
                    ].map((meta, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <div>
                          <div className="text-xs text-text-muted">{meta.label}</div>
                          <div className="font-medium text-text-primary text-sm">{meta.value || '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Skills */}
                  {project.requiredSkills?.length > 0 && (
                    <div className="mb-6">
                      <div className="text-sm font-medium text-text-secondary mb-3">필요 스킬</div>
                      <div className="flex flex-wrap gap-2">
                        {project.requiredSkills.map((skill, i) => (
                          <span key={i} className="bg-accent-light text-accent px-2.5 py-1 rounded text-xs font-medium">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/partner/projects/${project._id}`} className="flex-1 min-w-[200px] bg-accent hover:bg-accent-hover text-text-primary py-2.5 rounded-lg text-sm font-medium text-center transition-colors">
                      지원하기
                    </Link>
                    <Link href={`/partner/projects/${project._id}`} className="flex-1 min-w-[200px] border border-line hover:border-line text-text-secondary py-2.5 rounded-lg text-sm font-medium text-center transition-colors">
                      상세보기
                    </Link>
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
