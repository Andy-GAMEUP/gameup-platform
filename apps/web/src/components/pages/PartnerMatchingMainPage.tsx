'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import partnerMatchingService from '@/services/partnerMatchingService'
import partnerService from '@/services/partnerService'
import { X } from 'lucide-react'

export default function PartnerMatchingMainPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()

  const isCorporateApproved = user?.memberType === 'corporate' && user?.companyInfo?.approvalStatus === 'approved'

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['partnerActivity'],
    queryFn: () => partnerMatchingService.getPartnerActivity(),
    enabled: isAuthenticated && isCorporateApproved,
  })

  useEffect(() => {
    if (activityData?.hasActivity) {
      router.replace('/partner/projects')
    }
  }, [activityData, router])

  const { data: projectsData } = useQuery({
    queryKey: ['partnerMatchingRecentProjects'],
    queryFn: () => partnerMatchingService.getProjects({ limit: 3 }),
    enabled: !activityData?.hasActivity,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ slogan: '', introduction: '', activityPlan: '', externalUrl: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated && isCorporateApproved && (activityLoading || activityData?.hasActivity)) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  const features = [
    { icon: '🏢', title: '개발사 매칭', description: '검증된 게임개발사를 직접 매칭하여 프로젝트를 성공적으로 완성하세요' },
    { icon: '🤝', title: '다양한 파트너', description: '웹퍼블리싱, 서버/인프라, 디자인, QA, 컨설팅, 번역 등 전문 파트너를 한번에 찾을 수 있습니다' },
    { icon: '📋', title: '프로젝트 관리', description: '체계적인 프로젝트 관리 시스템으로 효율적인 협업을 지원합니다' },
    { icon: '🔍', title: '맞춤 검색', description: '원하는 조건으로 최적의 파트너를 빠르게 찾아보세요' },
  ]

  const steps = [
    { number: '01', title: '회원가입', description: '개발사 또는 파트너로 가입' },
    { number: '02', title: '프로필 작성', description: '포트폴리오 및 전문 분야 입력' },
    { number: '03', title: '프로젝트 탐색', description: '적합한 프로젝트 찾기' },
    { number: '04', title: '매칭 완료', description: '상호 합의 및 프로젝트 시작' },
  ]

  const recentProjects = projectsData?.projects || []

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await partnerService.apply({
        slogan: form.slogan,
        introduction: form.introduction,
        activityPlan: form.activityPlan,
        externalUrl: form.externalUrl,
      })
      setModalOpen(false)
      router.push('/partner/projects')
    } catch (err: any) {
      setError(err?.response?.data?.message || '등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <div className="min-h-screen bg-bg-secondary">
      <Navbar />

      <div className="px-6 py-8 space-y-6">

          {/* 메인 카드 */}
          <div className="bg-bg-card border border-line rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-accent/10 to-bg-card px-8 py-12 text-center space-y-6">
              <span className="inline-block bg-accent-light text-accent border border-accent-muted px-4 py-1.5 rounded-full text-sm font-medium">
                비즈니스 매칭 플랫폼
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-text-primary leading-tight">
                최적의 프로젝트와<br />
                <span className="text-accent">파트너를 연결하는</span> 스마트 매칭 서비스
              </h1>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                개발, 디자인, 마케팅, QA까지 프로젝트에 필요한 모든 전문가를 한곳에서 만나보세요.
              </p>
              <div className="flex flex-col items-center gap-3 pt-2">
                {isAuthenticated && isCorporateApproved && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="bg-bg-card border-2 border-accent text-accent hover:bg-accent hover:text-text-primary px-8 py-3 rounded-lg font-semibold transition-colors w-64"
                  >
                    ✏️ 파트너 프로필 등록
                  </button>
                )}
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link href="/partner/projects" className="bg-accent hover:bg-accent-hover text-text-primary px-8 py-3 rounded-lg font-medium transition-colors">
                    프로젝트 둘러보기 →
                  </Link>
                  <Link href="/partner/directory" className="border border-line hover:border-accent-muted text-text-secondary hover:text-text-primary px-8 py-3 rounded-lg font-medium transition-colors">
                    파트너 찾기
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 매칭 이유 카드 */}
          <div className="bg-bg-card border border-line rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-text-primary mb-2">왜 비즈니스 매칭을 사용해야 할까요?</h2>
              <p className="text-text-secondary">검증된 전문가들과 체계적인 시스템으로 성공적인 프로젝트를 지원합니다</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="bg-bg-tertiary/50 border border-line-light rounded-xl p-5 hover:border-accent-muted transition-colors">
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h3 className="text-base font-semibold text-text-primary mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-text-secondary">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 이용 방법 카드 */}
          <div className="bg-bg-card border border-line rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-text-primary mb-2">이용 방법</h2>
              <p className="text-text-secondary">간단한 4단계로 프로젝트를 시작하세요</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div key={index} className="relative text-center">
                  <div className="w-14 h-14 bg-accent text-text-primary rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                    {step.number}
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-1">{step.title}</h3>
                  <p className="text-sm text-text-secondary">{step.description}</p>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-3/4 w-full h-0.5 bg-accent-light" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 최근 프로젝트 카드 */}
          {recentProjects.length > 0 && (
            <div className="bg-bg-card border border-line rounded-2xl p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">최근 등록된 프로젝트</h2>
                  <p className="text-text-secondary text-sm">지금 바로 참여 가능한 프로젝트를 확인하세요</p>
                </div>
                <Link href="/partner/projects" className="border border-line hover:border-accent-muted text-text-secondary px-4 py-2 rounded-lg text-sm transition-colors">
                  전체 보기
                </Link>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {recentProjects.map((project: any) => (
                  <Link key={project._id} href={`/partner/projects/${project._id}`} className="block bg-bg-tertiary/50 border border-line-light rounded-xl p-5 hover:border-accent-muted transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <span className="bg-accent-light text-accent px-2.5 py-0.5 rounded text-xs font-medium">{project.category}</span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${project.status === 'recruiting' ? 'bg-green-500/20 text-green-400' : 'bg-bg-muted/20 text-text-secondary'}`}>
                        {project.status === 'recruiting' ? '모집중' : '진행중'}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-text-primary mb-1.5">{project.title}</h3>
                    <p className="text-sm text-text-secondary mb-3">{project.ownerId?.companyInfo?.companyName || project.ownerId?.username}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">예산</span>
                      <span className="text-text-primary font-medium">{project.budget}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-text-muted">기간</span>
                      <span className="text-text-primary font-medium">{project.duration}</span>
                    </div>
                    {project.requiredSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-line-light">
                        {project.requiredSkills.slice(0, 3).map((skill: string, i: number) => (
                          <span key={i} className="bg-bg-tertiary/50 text-text-secondary px-2 py-0.5 rounded text-xs">{skill}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA 카드 */}
          <div className="bg-accent rounded-2xl p-10 text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-3">지금 바로 시작하세요</h2>
            <p className="text-lg mb-8 text-blue-100">무료로 회원가입하고 최적의 파트너를 찾아보세요</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/register" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-medium transition-colors">
                게임개발사로 시작하기
              </Link>
              <Link href="/register" className="border border-white text-text-primary hover:bg-white/10 px-8 py-3 rounded-lg font-medium transition-colors">
                파트너로 시작하기
              </Link>
            </div>
          </div>

      </div>
    </div>

    {/* 프로필 등록 모달 */}
    {modalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-bg-card border border-line rounded-2xl w-full max-w-lg shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <h2 className="text-lg font-bold text-text-primary">파트너 프로필 등록</h2>
            <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleProfileSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">한줄 소개 <span className="text-text-muted text-xs">(선택)</span></label>
              <input
                type="text"
                value={form.slogan}
                onChange={e => setForm(f => ({ ...f, slogan: e.target.value }))}
                placeholder="ex) 게임 UI/UX 전문 디자이너"
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">자기소개 <span className="text-danger text-xs">*</span></label>
              <textarea
                value={form.introduction}
                onChange={e => setForm(f => ({ ...f, introduction: e.target.value }))}
                rows={3}
                placeholder="보유 역량, 경력, 전문 분야를 소개해 주세요"
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">활동 계획 <span className="text-danger text-xs">*</span></label>
              <textarea
                value={form.activityPlan}
                onChange={e => setForm(f => ({ ...f, activityPlan: e.target.value }))}
                rows={3}
                placeholder="파트너로서 어떤 활동을 계획하고 있는지 알려주세요"
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">홈페이지 / 포트폴리오 URL <span className="text-text-muted text-xs">(선택)</span></label>
              <input
                type="url"
                value={form.externalUrl}
                onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-line rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover text-text-primary rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '프로필 등록'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
