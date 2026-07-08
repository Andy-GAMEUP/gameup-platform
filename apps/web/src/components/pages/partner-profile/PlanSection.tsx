'use client'

import { usePartnerProfileCtx } from './PartnerProfileContext'

export default function PlanSection() {
  const { partner } = usePartnerProfileCtx()
  return (
    <div className="bg-bg-card border border-line rounded-xl p-6">
      <h2 className="text-text-primary font-semibold text-lg mb-4">활동 계획</h2>
      {partner.activityPlan
        ? <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{partner.activityPlan}</p>
        : <p className="text-text-muted text-sm">등록된 활동 계획이 없습니다.</p>}
    </div>
  )
}
