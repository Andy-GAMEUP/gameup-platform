'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import partnerMatchingService, { PartnerProjectItem, ProjectApplicationItem } from '@/services/partnerMatchingService'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'

const statusLabel: Record<string, { text: string; color: string }> = {
  recruiting: { text: '모집중', color: 'bg-green-500/20 text-green-400' },
  ongoing: { text: '진행중', color: 'bg-accent-light text-accent' },
  completed: { text: '완료', color: 'bg-bg-muted/20 text-text-secondary' },
}

const appStatusLabel: Record<string, { text: string; color: string }> = {
  pending: { text: '검토중', color: 'bg-yellow-500/20 text-yellow-400' },
  approved: { text: '승인', color: 'bg-green-500/20 text-green-400' },
  'on-hold': { text: '보류', color: 'bg-orange-500/20 text-orange-400' },
  rejected: { text: '거절', color: 'bg-red-500/20 text-red-400' },
}

export default function PartnerMatchingProjectDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    applicantName: '',
    email: '',
    phone: '',
    experience: '',
    proposedBudget: '',
    portfolioUrl: '',
    proposal: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['partnerProject', id],
    queryFn: () => partnerMatchingService.getProjectById(id),
    enabled: !!id,
  })

  const project: PartnerProjectItem | null = data?.project || null
  const isOwner = user && project && project.ownerId?._id === (user as any).id

  const { data: applicantsData } = useQuery({
    queryKey: ['partnerProjectApplicants', id],
    queryFn: () => partnerMatchingService.getProjectApplicants(id),
    enabled: !!id && !!isOwner,
  })

  const applicants: ProjectApplicationItem[] = applicantsData?.applicants || []

  const applyMutation = useMutation({
    mutationFn: () => partnerMatchingService.applyToProject(id, formData),
    onSuccess: () => {
      setShowModal(false)
      queryClient.invalidateQueries({ queryKey: ['partnerProject', id] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) =>
      partnerMatchingService.updateApplicationStatus(id, appId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerProjectApplicants', id] })
    },
  })

  if (isLoading) {
    return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">불러오는 중...</div></div>
  }

  if (!project) {
    return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">프로젝트를 찾을 수 없습니다.</div></div>
  }

  const status = statusLabel[project.status] || statusLabel.recruiting
  const companyInfo = project.ownerId?.companyInfo

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      {/* Header */}
      <div className="border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/partner/projects" className="inline-flex items-center gap-2 text-accent hover:text-accent mb-4 text-sm">
            ← 프로젝트 목록으로
          </Link>
          <div className="flex flex-wrap justify-between items-start gap-4 mt-4">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${status.color}`}>{status.text}</span>
                <span className="bg-bg-tertiary/50 text-text-secondary px-2.5 py-0.5 rounded text-xs">{project.category}</span>
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">{project.title}</h1>
              <p className="text-text-secondary flex items-center gap-2 text-lg">
                🏢 {companyInfo?.companyName || project.ownerId?.username}
              </p>
            </div>
            {!isOwner && project.status === 'recruiting' && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-accent hover:bg-accent-hover text-text-primary px-6 py-3 rounded-lg font-medium transition-colors"
              >
                지원하기
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">프로젝트 개요</h2>
              <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                {project.detailedDescription || project.description}
              </p>
            </div>

            {/* Requirements */}
            {project.requirements?.length > 0 && (
              <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">필수 요구사항</h2>
                <ul className="space-y-3">
                  {project.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span className="text-text-secondary">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {project.requiredSkills?.length > 0 && (
              <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">필요 스킬</h2>
                <div className="flex flex-wrap gap-2">
                  {project.requiredSkills.map((skill, i) => (
                    <span key={i} className="bg-accent-light text-accent px-4 py-2 rounded-lg text-sm font-medium">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones */}
            {project.milestones?.length > 0 && (
              <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">프로젝트 마일스톤</h2>
                <div className="space-y-4">
                  {project.milestones.map((milestone, i) => (
                    <div key={i} className="flex gap-4 pb-4 border-b border-line-light last:border-0 last:pb-0">
                      <div className="flex-shrink-0 w-12 h-12 bg-accent-light rounded-full flex items-center justify-center font-bold text-accent">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-text-primary mb-1">{milestone.phase}</div>
                        <div className="text-sm text-text-secondary mb-2">{milestone.period}</div>
                        <div className="text-text-secondary">{milestone.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applicants (Owner only) */}
            {isOwner && applicants.length > 0 && (
              <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">지원자 목록 ({applicants.length}명)</h2>
                <div className="space-y-4">
                  {applicants.map((app) => {
                    const appStatus = appStatusLabel[app.status] || appStatusLabel.pending
                    return (
                      <div key={app._id} className="bg-bg-secondary/50 rounded-xl p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="font-semibold text-text-primary text-lg mb-1">{app.applicantName}</div>
                            <span className="bg-bg-tertiary/50 text-text-secondary px-2 py-0.5 rounded text-xs">
                              {app.applicantId?.companyInfo?.companyName || app.applicantId?.memberType}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-text-muted mb-1">지원일: {new Date(app.createdAt).toLocaleDateString('ko-KR')}</div>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${appStatus.color}`}>{appStatus.text}</span>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                          <div className="text-text-secondary">📧 {app.email}</div>
                          {app.phone && <div className="text-text-secondary">📞 {app.phone}</div>}
                          {app.proposedBudget && <div className="text-text-secondary">💰 제안 금액: {app.proposedBudget}</div>}
                          {app.experience && <div className="text-text-secondary">💼 경력: {app.experience}</div>}
                        </div>

                        {app.proposal && (
                          <div className="mb-4">
                            <div className="text-sm font-medium text-text-secondary mb-2">제안서</div>
                            <p className="text-sm text-text-secondary">{app.proposal}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => statusMutation.mutate({ appId: app._id, status: 'approved' })}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-text-primary py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => statusMutation.mutate({ appId: app._id, status: 'on-hold' })}
                            className="flex-1 border border-line hover:border-line text-text-secondary py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            보류
                          </button>
                          <button
                            onClick={() => statusMutation.mutate({ appId: app._id, status: 'rejected' })}
                            className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-semibold text-text-primary">프로젝트 정보</h2>
              {[
                { icon: '💰', label: '예산 범위', value: project.budgetMin && project.budgetMax ? `${project.budgetMin} - ${project.budgetMax}` : project.budget },
                { icon: '📅', label: '프로젝트 기간', value: project.duration },
                { icon: '🗓️', label: '시작 예정일', value: project.startDate ? new Date(project.startDate).toLocaleDateString('ko-KR') : '-' },
                { icon: '⏰', label: '지원 마감일', value: project.applicationDeadline ? new Date(project.applicationDeadline).toLocaleDateString('ko-KR') : '-', highlight: true },
                { icon: '📍', label: '근무 위치', value: project.location },
                { icon: '👥', label: '지원자', value: `${project.applicantCount}명` },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5">{item.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm text-text-muted mb-1">{item.label}</div>
                    <div className={`font-medium ${item.highlight ? 'text-red-400' : 'text-text-primary'}`}>{item.value || '-'}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Company Info */}
            {companyInfo && (
              <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 space-y-3">
                <h2 className="text-xl font-semibold text-text-primary">발주사 정보</h2>
                <div>
                  <div className="text-sm text-text-muted mb-1">회사명</div>
                  <div className="font-medium text-text-primary">{companyInfo.companyName}</div>
                </div>
                {companyInfo.companyType?.length > 0 && (
                  <div>
                    <div className="text-sm text-text-muted mb-1">업종</div>
                    <div className="font-medium text-text-primary">{companyInfo.companyType.join(', ')}</div>
                  </div>
                )}
                {companyInfo.employeeCount && (
                  <div>
                    <div className="text-sm text-text-muted mb-1">규모</div>
                    <div className="font-medium text-text-primary">{companyInfo.employeeCount}명</div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {!isOwner && project.status === 'recruiting' && (
              <div className="bg-bg-tertiary/50 border border-line-light rounded-xl p-6 space-y-3">
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full bg-accent hover:bg-accent-hover text-text-primary py-3 rounded-lg font-medium transition-colors"
                >
                  지원하기
                </button>
                <button className="w-full border border-line hover:border-line text-text-secondary py-3 rounded-lg font-medium transition-colors">
                  북마크
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-bg-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-bg-tertiary border border-line rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <div>
                <h2 className="text-xl font-semibold text-text-primary">프로젝트 지원하기</h2>
                <p className="text-sm text-text-secondary mt-1">{project.title}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-text-secondary hover:text-text-primary text-2xl">×</button>
            </div>
            <div className="p-6">
              <form
                onSubmit={(e) => { e.preventDefault(); applyMutation.mutate() }}
                className="space-y-6"
              >
                <div>
                  <h3 className="font-semibold text-text-primary text-lg mb-4">지원자 정보</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">이름 / 회사명</label>
                      <input
                        required
                        value={formData.applicantName}
                        onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                        className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                        placeholder="이름 또는 회사명"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">이메일</label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">연락처</label>
                      <input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                        placeholder="010-0000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">경력</label>
                      <input
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                        placeholder="예: 5년"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary text-lg mb-4">제안 내용</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">제안 금액</label>
                      <input
                        value={formData.proposedBudget}
                        onChange={(e) => setFormData({ ...formData, proposedBudget: e.target.value })}
                        className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                        placeholder="예: 7,500만원"
                      />
                      {project.budgetMin && project.budgetMax && (
                        <p className="text-xs text-text-muted mt-1">예산 범위: {project.budgetMin} - {project.budgetMax}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">포트폴리오 URL</label>
                      <input
                        value={formData.portfolioUrl}
                        onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                        className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                        placeholder="https://your-portfolio.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">제안서</label>
                      <textarea
                        rows={6}
                        value={formData.proposal}
                        onChange={(e) => setFormData({ ...formData, proposal: e.target.value })}
                        className="w-full bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent resize-none"
                        placeholder="프로젝트에 대한 이해도, 수행 계획, 관련 경험을 작성해주세요."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-line text-text-secondary py-3 rounded-lg font-medium transition-colors hover:border-line"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={applyMutation.isPending}
                    className="flex-1 bg-accent hover:bg-accent-hover text-text-primary py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {applyMutation.isPending ? '제출 중...' : '지원서 제출'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
