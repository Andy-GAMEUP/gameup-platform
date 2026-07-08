'use client'
import PartnerProfileShell from '@/components/pages/partner-profile/PartnerProfileShell'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PartnerProfileShell>{children}</PartnerProfileShell>
}
