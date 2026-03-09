import type { Metadata } from 'next'
import { DashboardPage } from '@/components/pages/DashboardPage'

export const metadata: Metadata = {
  title: '개발자 대시보드',
  description: '게임 개발자 대시보드',
}

export default function Page() {
  return <DashboardPage />
}
