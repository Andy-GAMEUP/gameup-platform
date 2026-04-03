'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import partnerMatchingService, { PartnerMatchingProfile, PartnerReviewItem } from '@/services/partnerMatchingService'

const availabilityLabel: Record<string, { text: string; color: string }> = {
  available: { text: '즉시 가능', color: 'text-green-400' },
  busy: { text: '협의 필요', color: 'text-yellow-400' },
  unavailable: { text: '불가', color: 'text-red-400' },
}

export default function PartnerMatchingProfilePage() {
  const params = useParams()
  const id = params?.id as string
  const [activeTab, setActiveTab] = useState('portfolio')

  const { data, isLoading } = useQuery({
    queryKey: ['partnerMatchingProfile', id],
    queryFn: () => partnerMatchingService.getPartnerProfileById(id),
    enabled: !!id,
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['partnerMatchingReviews', id],
    queryFn: () => partnerMatchingService.getPartnerReviews(id),
    enabled: !!id,
  })

  const profile: PartnerMatchingProfile | null = data?.profile || null
  const reviews: PartnerReviewItem[] = reviewsData?.reviews || []

  if (isLoading) {
    return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">불러오는 중...</div></div>
  }

  if (!profile) {
    return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">파트너를 찾을 수 없습니다.</div></div>
  }

  const companyInfo = profile.userId?.companyInfo
  const tabs = [
    { key: 'portfolio', label: '포트폴리오' },
    { key: 'reviews', label: '리뷰' },
    { key: 'experience', label: '경력' },
    { key: 'certifications', label: '자격증' },
  ]

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      {/* Header */}
      <div className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/partner/directory" className="inline-flex items-center gap-2 text-accent hover:text-accent mb-4 text-sm">
            ← 파트너 디렉토리로 돌아가기
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 sticky top-8 space-y-6">
              {/* Avatar + Name */}
              <div className="text-center">
                <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center text-text-primary text-3xl font-bold mx-auto mb-4">
                  {profile.companyName?.charAt(0) || '?'}
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-text-primary">{profile.companyName}</h1>
                  {profile.isVerified && (
                    <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-text-secondary">{companyInfo?.companyName}</p>
                <div className="flex justify-center gap-2 mt-3">
                  {profile.expertiseArea?.map((area, i) => (
                    <span key={i} className="bg-accent-light text-accent px-2.5 py-0.5 rounded text-xs font-medium">{area}</span>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="text-center pb-6 border-b border-line-light">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-yellow-500 text-2xl">★</span>
                  <span className="text-3xl font-bold text-text-primary">{profile.rating || 0}</span>
                </div>
                <p className="text-sm text-text-secondary">{profile.reviewCount || 0}개의 리뷰</p>
              </div>

              {/* Stats */}
              <div className="space-y-4 pb-6 border-b border-line-light">
                {[
                  { label: '완료 프로젝트', value: `${profile.completedProjectCount || 0}건` },
                  { label: '위치', value: profile.location || '-' },
                  { label: '설립일', value: companyInfo?.description || '-' },
                  { label: '직원 수', value: companyInfo?.employeeCount ? `${companyInfo.employeeCount}명` : '-' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">{item.label}</span>
                    <span className="font-medium text-text-primary">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div className="space-y-3 pb-6 border-b border-line-light">
                <h3 className="font-semibold text-text-primary mb-3">연락처</h3>
                {profile.contactEmail && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span>📧</span> {profile.contactEmail}
                  </div>
                )}
                {profile.contactPhone && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span>📞</span> {profile.contactPhone}
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>🌐</span>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate">{profile.website}</a>
                  </div>
                )}
              </div>

              {/* Availability + Rate */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-text-secondary">단가 기준</span>
                  <span className="font-medium text-text-primary">{profile.hourlyRate || '협의'}</span>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm text-text-secondary">작업 가능</span>
                  <span className={`font-medium ${availabilityLabel[profile.availability]?.color || 'text-text-secondary'}`}>
                    {availabilityLabel[profile.availability]?.text || '-'}
                  </span>
                </div>
                <button className="w-full bg-accent hover:bg-accent-hover text-text-primary py-3 rounded-lg font-medium transition-colors mb-3">
                  연락하기
                </button>
                <button className="w-full border border-line hover:border-line text-text-secondary py-3 rounded-lg font-medium transition-colors">
                  견적 요청
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">회사 소개</h2>
              <p className="text-text-secondary leading-relaxed mb-6">{profile.introduction}</p>
              {(profile.userId?.contactPerson || companyInfo?.businessNumber) && (
                <div className="grid sm:grid-cols-2 gap-4 p-4 bg-bg-secondary/50 rounded-lg">
                  {profile.userId?.contactPerson?.name && (
                    <div>
                      <div className="text-sm text-text-muted mb-1">대표자</div>
                      <div className="font-medium text-text-primary">{profile.userId.contactPerson.name}</div>
                    </div>
                  )}
                  {companyInfo?.businessNumber && (
                    <div>
                      <div className="text-sm text-text-muted mb-1">사업자번호</div>
                      <div className="font-medium text-text-primary">{companyInfo.businessNumber}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">주요 스킬</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <span key={i} className="bg-accent-light text-accent px-4 py-2 rounded-lg text-sm font-medium">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div>
              <div className="flex gap-2 mb-6 border-b border-line pb-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.key ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Portfolio Tab */}
              {activeTab === 'portfolio' && (
                <div className="space-y-6">
                  {profile.portfolio?.length > 0 ? profile.portfolio.map((item) => (
                    <div key={item._id} className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
                      <div className="grid md:grid-cols-3 gap-6">
                        {item.imageUrl && (
                          <div className="md:col-span-1">
                            <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-lg" />
                          </div>
                        )}
                        <div className={item.imageUrl ? 'md:col-span-2' : 'md:col-span-3'}>
                          <h3 className="text-xl font-semibold text-text-primary mb-2">{item.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
                            {item.clientName && <span>{item.clientName}</span>}
                            {item.duration && <span>{item.duration}</span>}
                          </div>
                          <p className="text-text-secondary mb-4">{item.description}</p>
                          {item.technologies?.length > 0 && (
                            <div className="mb-4">
                              <div className="text-sm font-medium text-text-secondary mb-2">사용 기술</div>
                              <div className="flex flex-wrap gap-1.5">
                                {item.technologies.map((tech, i) => (
                                  <span key={i} className="bg-bg-tertiary/50 text-text-secondary px-2 py-0.5 rounded text-xs">{tech}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.results?.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-text-secondary mb-2">주요 성과</div>
                              <ul className="space-y-1">
                                {item.results.map((result, i) => (
                                  <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span> {result}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-text-muted">등록된 포트폴리오가 없습니다.</div>
                  )}
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  {reviews.length > 0 ? reviews.map((review) => (
                    <div key={review._id} className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-text-primary">{review.reviewerId?.username}</div>
                          <div className="text-sm text-text-secondary">{review.reviewerId?.companyInfo?.companyName}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-yellow-500">★</span>
                            <span className="font-semibold text-text-primary">{review.rating}</span>
                          </div>
                          <div className="text-xs text-text-muted">{new Date(review.createdAt).toLocaleDateString('ko-KR')}</div>
                        </div>
                      </div>
                      {review.projectTitle && (
                        <span className="inline-block bg-bg-tertiary/50 text-text-secondary px-2 py-0.5 rounded text-xs mb-3">{review.projectTitle}</span>
                      )}
                      <p className="text-text-secondary">{review.content}</p>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-text-muted">등록된 리뷰가 없습니다.</div>
                  )}
                </div>
              )}

              {/* Experience Tab */}
              {activeTab === 'experience' && (
                <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
                  {profile.workExperience?.length > 0 ? (
                    <div className="space-y-6">
                      {profile.workExperience.map((exp) => (
                        <div key={exp._id} className="flex gap-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-accent-light rounded-lg flex items-center justify-center">
                            <span className="text-accent">💼</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-text-primary">{exp.title}</h3>
                              <span className="bg-bg-tertiary/50 text-text-secondary px-2 py-0.5 rounded text-xs">{exp.period}</span>
                            </div>
                            <p className="text-text-secondary">{exp.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-text-muted">등록된 경력이 없습니다.</div>
                  )}
                </div>
              )}

              {/* Certifications Tab */}
              {activeTab === 'certifications' && (
                <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
                  {profile.certifications?.length > 0 ? (
                    <div className="space-y-4">
                      {profile.certifications.map((cert) => (
                        <div key={cert._id} className="flex items-center justify-between p-4 bg-bg-secondary/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-accent text-xl">🏆</span>
                            <span className="font-medium text-text-primary">{cert.name}</span>
                          </div>
                          <span className="text-sm text-text-secondary">{cert.issuedAt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-text-muted">등록된 자격증이 없습니다.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
