'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import partnerMatchingService, { PartnerProjectItem, ProjectInquiryItem } from '@/services/partnerMatchingService'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import {
  Pencil, Trash2, Wallet, CalendarDays, Users, Tag, Wrench,
  Clock, FileText, ListChecks, MessageCircle, Milestone, CheckCircle2, ArrowLeft,
} from 'lucide-react'

const statusLabel: Record<string, { text: string; color: string }> = {
  recruiting: { text: '모집중', color: 'bg-green-500/20 text-green-400' },
  ongoing: { text: '진행중', color: 'bg-accent-light text-accent' },
  completed: { text: '완료', color: 'bg-bg-muted/20 text-text-secondary' },
}

const formatUnit = (value: string | undefined, unit: string) => {
  if (!value) return value
  const n = Number(value)
  return Number.isFinite(n) ? `${n.toLocaleString()}${unit}` : value
}

export default function PartnerMatchingProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
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
  const [inquiryContent, setInquiryContent] = useState('')
  const [inquirySecret, setInquirySecret] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replySecret, setReplySecret] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['partnerProject', id],
    queryFn: () => partnerMatchingService.getProjectById(id),
    enabled: !!id,
  })

  const project: PartnerProjectItem | null = data?.project || null
  const partnerChannelId: string | null = data?.partnerChannelId || null
  const isOwner = user && project && project.ownerId?._id === (user as any).id

  const applyMutation = useMutation({
    mutationFn: () => partnerMatchingService.applyToProject(id, formData),
    onSuccess: () => {
      setShowModal(false)
      queryClient.invalidateQueries({ queryKey: ['partnerProject', id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => partnerMatchingService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerProjects'] })
      router.push('/partner/projects')
    },
  })

  const handleDelete = () => {
    if (confirm('프로젝트를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.')) deleteMutation.mutate()
  }

  const { data: inquiriesData } = useQuery({
    queryKey: ['partnerProjectInquiries', id],
    queryFn: () => partnerMatchingService.getProjectInquiries(id),
    enabled: !!id,
  })

  const inquiries: ProjectInquiryItem[] = inquiriesData?.inquiries || []

  const inquiryMutation = useMutation({
    mutationFn: ({ content, parentId, isSecret }: { content: string; parentId?: string; isSecret?: boolean }) =>
      partnerMatchingService.createProjectInquiry(id, content, parentId, isSecret),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partnerProjectInquiries', id] })
      if (variables.parentId) {
        setReplyContent('')
        setReplyingTo(null)
      } else {
        setInquiryContent('')
      }
    },
  })

  const deleteInquiryMutation = useMutation({
    mutationFn: (inquiryId: string) => partnerMatchingService.deleteProjectInquiry(id, inquiryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerProjectInquiries', id] })
    },
  })

  const hideInquiryMutation = useMutation({
    mutationFn: (inquiryId: string) => partnerMatchingService.hideProjectInquiry(id, inquiryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerProjectInquiries', id] })
    },
  })

  const flattenReplies = (parentId: string): { item: ProjectInquiryItem; parentAuthor?: ProjectInquiryItem['authorId'] }[] => {
    const parent = inquiries.find((x) => x._id === parentId)
    const result: { item: ProjectInquiryItem; parentAuthor?: ProjectInquiryItem['authorId'] }[] = []
    for (const child of inquiries.filter((r) => r.parentId === parentId)) {
      result.push({ item: child, parentAuthor: parent?.authorId })
      result.push(...flattenReplies(child._id))
    }
    return result
  }

  const renderInquiry = (q: ProjectInquiryItem, isReply: boolean, parentAuthor?: ProjectInquiryItem['authorId']) => {
    const canDelete = !!user && q.authorId?._id === (user as any).id
    return (
      <div
        key={q._id}
        className={isReply ? 'mt-3 ml-6 pl-4 border-l-2 border-line-light' : ''}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="font-medium text-text-primary text-sm flex items-center gap-1.5">
            <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-white text-xs font-bold">
              {q.authorId?.username?.charAt(0)?.toUpperCase() || '?'}
            </span>
            {q.authorId?.username}
            {q.isSecret && <span title="비밀글">🔒</span>}
            {q.isHidden && <span className="text-xs text-red-400 font-normal">(등록회사에 의해서 숨김 처리됨)</span>}
          </span>
          <span className="text-xs text-text-muted">{new Date(q.createdAt).toLocaleString('ko-KR')}</span>
        </div>
        <p className="text-text-secondary text-sm mb-2 ml-[30px]">
          {isReply && parentAuthor && (
            parentAuthor.partnerChannelId ? (
              <a
                href={`/partner/${parentAuthor.partnerChannelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent font-medium mr-1 hover:underline"
              >
                @{parentAuthor.username}
              </a>
            ) : (
              <span className="text-accent font-medium mr-1">@{parentAuthor.username}</span>
            )
          )}
          {q.content}
        </p>
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => { setReplyingTo(replyingTo === q._id ? null : q._id); setReplyContent('') }}
              className="text-xs text-accent hover:underline"
            >
              답글
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { if (confirm('삭제하시겠습니까?')) deleteInquiryMutation.mutate(q._id) }}
              className="text-xs text-text-muted hover:text-red-400"
            >
              삭제
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => hideInquiryMutation.mutate(q._id)}
              className="text-xs text-text-muted hover:text-accent"
            >
              {q.isHidden ? '숨김 해제' : '숨기기'}
            </button>
          )}
        </div>

        {replyingTo === q._id && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!replyContent.trim()) return
              inquiryMutation.mutate({ content: replyContent.trim(), parentId: q._id, isSecret: replySecret })
            }}
            className="mt-3"
          >
            <div className="flex gap-2">
              <input
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="답글을 입력하세요"
                className="flex-1 bg-bg-secondary border border-line text-text-primary rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={inquiryMutation.isPending}
                className="bg-accent hover:bg-accent-hover text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                등록
              </button>
            </div>
            <label className="flex items-center gap-1.5 mt-2 text-xs text-text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={replySecret}
                onChange={(e) => setReplySecret(e.target.checked)}
                className="accent-accent"
              />
              비밀글로 등록
            </label>
          </form>
        )}
      </div>
    )
  }

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
      <div className="border-b border-line bg-gradient-to-b from-accent-light/40 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/partner/projects" className="group inline-flex items-center gap-1.5 text-accent hover:text-accent-hover mb-4 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            프로젝트 목록으로
          </Link>
          <div className="flex flex-wrap justify-between items-end gap-4 mt-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  {project.status === 'recruiting' && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                    </span>
                  )}
                  {status.text}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2 tracking-tight">{project.title}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[23.56fr_6.44fr] gap-8 items-start">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Company Info */}
            {companyInfo && (
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-white text-base font-bold shadow-sm">
                  {companyInfo.companyName?.charAt(0) || '?'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    {partnerChannelId ? (
                      <a
                        href={`/partner/${partnerChannelId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-text-primary hover:text-accent transition-colors"
                      >
                        {companyInfo.companyName}
                      </a>
                    ) : (
                      <span className="font-medium text-text-primary">{companyInfo.companyName}</span>
                    )}
                    {companyInfo.companyType?.length > 0 && (
                      <span className="bg-accent-light text-accent px-2 py-0.5 rounded-full text-xs font-medium">
                        {companyInfo.companyType.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Overview */}
            <div className="bg-bg-tertiary/50 border border-line-light rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-text-primary mb-4">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-light text-accent">
                  <FileText className="w-4 h-4" />
                </span>
                프로젝트 개요
              </h2>
              <div className="text-text-secondary text-sm leading-relaxed break-words
                [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5
                [&_p]:mb-3 [&_p:last-child]:mb-0
                [&_ul]:list-none [&_ul]:pl-0 [&_ul]:mb-3 [&_ul]:space-y-1
                [&_li>p]:pl-[1.4em] [&_li>p]:[text-indent:-1.4em]
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
                [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-4 [&_blockquote]:text-text-secondary [&_blockquote]:italic [&_blockquote]:my-3
                [&_a]:text-accent [&_a]:underline [&_a:hover]:opacity-80
                [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-3 [&_img]:border [&_img]:border-line
                [&_strong]:text-text-primary [&_strong]:font-semibold
                [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: project.detailedDescription || project.description }}
              />
            </div>

            {/* Requirements */}
            {project.requirements?.length > 0 && (
              <div className="bg-bg-tertiary/50 border border-line-light rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-text-primary mb-4">
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-light text-accent">
                    <ListChecks className="w-4 h-4" />
                  </span>
                  필수 요구사항
                </h2>
                <ul className="space-y-3">
                  {project.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-text-secondary">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inquiries */}
            <div className="bg-bg-tertiary/50 border border-line-light rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-text-primary mb-4">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-light text-accent">
                  <MessageCircle className="w-4 h-4" />
                </span>
                문의하기 ({inquiries.filter(q => !q.parentId).length})
              </h2>

              {user ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!inquiryContent.trim()) return
                    inquiryMutation.mutate({ content: inquiryContent.trim(), isSecret: inquirySecret })
                  }}
                  className="mb-6"
                >
                  <div className="flex gap-2">
                    <input
                      value={inquiryContent}
                      onChange={(e) => setInquiryContent(e.target.value)}
                      placeholder="문의 내용을 입력하세요"
                      className="flex-1 bg-bg-secondary border border-line text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={inquiryMutation.isPending}
                      className="bg-accent hover:bg-accent-hover text-text-primary px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                    >
                      등록
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 mt-2 text-xs text-text-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inquirySecret}
                      onChange={(e) => setInquirySecret(e.target.checked)}
                      className="accent-accent"
                    />
                    비밀글로 등록
                  </label>
                </form>
              ) : (
                <p className="text-sm text-text-muted mb-6">문의를 남기려면 로그인이 필요합니다.</p>
              )}

              <div className="space-y-4">
                {inquiries.filter(q => !q.parentId).map((q) => (
                  <div key={q._id} className="border-b border-line-light pb-4 last:border-0 last:pb-0">
                    {renderInquiry(q, false)}
                    {flattenReplies(q._id).map(({ item, parentAuthor }) => renderInquiry(item, true, parentAuthor))}
                  </div>
                ))}
                {inquiries.filter(q => !q.parentId).length === 0 && (
                  <p className="text-sm text-text-muted">아직 문의가 없습니다.</p>
                )}
              </div>
            </div>

            {/* Milestones */}
            {project.milestones?.length > 0 && (
              <div className="bg-bg-tertiary/50 border border-line-light rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-text-primary mb-4">
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-light text-accent">
                    <Milestone className="w-4 h-4" />
                  </span>
                  프로젝트 마일스톤
                </h2>
                <div>
                  {project.milestones.map((milestone, i) => (
                    <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < project.milestones.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-px bg-line-light" />
                      )}
                      <div className="relative flex-shrink-0 w-12 h-12 bg-gradient-to-br from-accent to-accent-hover rounded-full flex items-center justify-center font-bold text-white shadow-sm">
                        {i + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="font-semibold text-text-primary mb-1">{milestone.phase}</div>
                        <div className="text-sm text-text-secondary mb-2">{milestone.period}</div>
                        <div className="text-text-secondary">{milestone.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-3 lg:sticky lg:top-24">
            {/* Project Info */}
            <div className="bg-bg-tertiary/50 border border-line-light rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {[
                { icon: Wallet, label: '예산 범위', value: project.budgetMin && project.budgetMax ? `${formatUnit(project.budgetMin, '원')} - ${formatUnit(project.budgetMax, '원')}` : formatUnit(project.budget, '원') },
                { icon: CalendarDays, label: '프로젝트 기간', value: formatUnit(project.duration, '일') },
                { icon: Tag, label: '카테고리', value: project.category },
              ].map((item, i) => (
                <div key={i} className="px-5 py-2 flex items-center gap-3">
                  <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-accent-light text-accent">
                    <item.icon className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs text-text-muted block mb-0.5 whitespace-nowrap">{item.label}</span>
                    <span className="font-semibold text-sm text-text-primary">{item.value || '-'}</span>
                  </div>
                </div>
              ))}
              {project.requiredSkills?.length > 0 && (
                <div className="px-5 py-2 flex items-center gap-3">
                  <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-accent-light text-accent">
                    <Wrench className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs text-text-muted block mb-0.5 whitespace-nowrap">필요 스킬</span>
                    <span className="font-semibold text-sm text-text-primary">{project.requiredSkills.join(', ')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Applicant & Deadline */}
            <div className="bg-bg-tertiary/50 border border-line-light rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="px-5 py-2 flex items-center gap-3">
                <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-accent-light text-accent">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs text-text-muted block mb-0.5 whitespace-nowrap">지원자</span>
                  <span className="font-semibold text-sm text-text-primary">{project.applicantCount}명</span>
                </div>
              </div>
              <div className="px-5 py-2 flex items-center gap-3">
                <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-accent-light text-accent">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs text-text-muted block mb-0.5 whitespace-nowrap">지원 마감일</span>
                  <span className="font-semibold text-sm text-red-400">
                    {project.applicationDeadline ? new Date(project.applicationDeadline).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </div>
              </div>
            </div>

            {!isOwner && project.status === 'recruiting' && (
              <button
                onClick={() => setShowModal(true)}
                className="w-full bg-gradient-to-r from-accent to-accent-hover text-text-primary py-3 rounded-2xl font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                지원하기
              </button>
            )}

            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
                <Link
                  href={`/partner/projects/${id}/edit`}
                  className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-accent-hover text-text-primary py-3 rounded-2xl font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <Pencil className="w-4 h-4" />
                  수정하기
                </Link>
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
