import type { Metadata } from 'next'
import AdminDashboardPage from '@/components/pages/AdminDashboardPage'

export const metadata: Metadata = {
  title: '관리자 대시보드',
  description: 'GAMEUP 관리자 대시보드',
}

export default function Page() {
  return <AdminDashboardPage />
}
