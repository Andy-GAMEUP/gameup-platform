'use client'

import { usePartnerProfileCtx } from './PartnerProfileContext'
import { COMPANY_TYPE_LABELS } from './constants'

export default function HomeSection() {
  const { partner, posts } = usePartnerProfileCtx()
  const rawCompanyTypes: string[] = (partner.userId as any)?.companyInfo?.companyType || []
  const companyTypes = rawCompanyTypes.filter(t => t !== 'developer')

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {/* Topics stat */}
        <div className="bg-bg-card border border-line rounded-xl p-5">
          <p className="text-text-secondary text-sm mb-2">활동 분야</p>
          <p className="text-3xl font-bold text-text-primary">{partner.selectedTopics?.length || 0}개</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {partner.selectedTopics?.length
              ? partner.selectedTopics.slice(0, 4).map(t => (
                  <span key={t} className="text-xs bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full">{t}</span>
                ))
              : <span className="text-xs text-text-muted">등록된 활동 분야 없음</span>}
            {(partner.selectedTopics?.length || 0) > 4 && (
              <span className="text-xs text-text-muted">+{partner.selectedTopics!.length - 4}</span>
            )}
          </div>
        </div>

        {/* Posts stat */}
        <div className="bg-bg-card border border-line rounded-xl p-5">
          <p className="text-text-secondary text-sm mb-2">채널 게시글</p>
          <p className="text-3xl font-bold text-text-primary">{partner.postCount || 0}건</p>
          <div className="mt-3 space-y-1">
            {posts.length
              ? posts.slice(0, 2).map((p: any) => (
                  <p key={p._id} className="text-xs text-text-muted truncate">· {p.title}</p>
                ))
              : <span className="text-xs text-text-muted">작성된 게시글 없음</span>}
          </div>
        </div>
      </div>

      {/* Business types */}
      <div className="bg-bg-card border border-line rounded-xl p-5">
        <h2 className="text-text-primary font-semibold mb-3">사업 형태</h2>
        <div className="flex flex-wrap gap-2">
          {companyTypes.length > 0
            ? companyTypes.map(t => (
                <span key={t} className="text-sm bg-bg-tertiary text-text-secondary border border-line px-3 py-1 rounded-full">
                  {COMPANY_TYPE_LABELS[t] || t}
                </span>
              ))
            : <span className="text-sm text-text-muted">등록된 사업 형태 없음</span>
          }
        </div>
      </div>

      {/* Intro summary */}
      <div className="bg-bg-card border border-line rounded-xl p-5">
        <h2 className="text-text-primary font-semibold mb-3">소개</h2>
        {partner.introduction
          ? <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line line-clamp-4">{partner.introduction}</p>
          : <p className="text-text-muted text-sm">등록된 소개가 없습니다.</p>}
      </div>

      {/* Activity plan summary */}
      {partner.activityPlan && (
        <div className="bg-bg-card border border-line rounded-xl p-5">
          <h2 className="text-text-primary font-semibold mb-3">활동 계획</h2>
          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line line-clamp-3">{partner.activityPlan}</p>
        </div>
      )}

      {/* External link */}
      {partner.externalUrl && (
        <div className="bg-bg-card border border-line rounded-xl p-5">
          <h2 className="text-text-primary font-semibold mb-3">외부 링크</h2>
          <a href={partner.externalUrl} target="_blank" rel="noopener noreferrer"
            className="text-accent hover:underline text-sm break-all">{partner.externalUrl}</a>
        </div>
      )}
    </>
  )
}
