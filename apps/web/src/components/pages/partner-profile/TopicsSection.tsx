'use client'

import { usePartnerProfileCtx } from './PartnerProfileContext'

export default function TopicsSection() {
  const { partner } = usePartnerProfileCtx()
  return (
    <div className="bg-bg-card border border-line rounded-xl p-6">
      <h2 className="text-text-primary font-semibold text-lg mb-4">활동 분야</h2>
      {partner.selectedTopics?.length
        ? (
          <div className="flex flex-wrap gap-2">
            {partner.selectedTopics.map(t => (
              <span key={t} className="bg-accent/10 text-accent border border-accent/20 px-3 py-1.5 rounded-lg text-sm font-medium">{t}</span>
            ))}
          </div>
        )
        : <p className="text-text-muted text-sm">등록된 활동 분야가 없습니다.</p>}
    </div>
  )
}
