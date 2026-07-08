'use client'

import { usePartnerProfileCtx } from './PartnerProfileContext'

export default function IntroSection() {
  const { partner } = usePartnerProfileCtx()
  return (
    <div className="bg-bg-card border border-line rounded-xl p-6">
      <h2 className="text-text-primary font-semibold text-lg mb-4">소개</h2>
      {partner.introduction
        ? <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{partner.introduction}</p>
        : <p className="text-text-muted text-sm">등록된 소개가 없습니다.</p>}
    </div>
  )
}
