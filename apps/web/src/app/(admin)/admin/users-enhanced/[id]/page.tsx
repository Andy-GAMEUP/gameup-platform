'use client'
import { use } from 'react'
import AdminUserDetailPage from '@/components/pages/AdminUserDetailPage'

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <AdminUserDetailPage id={id} />
}
