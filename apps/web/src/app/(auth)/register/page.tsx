import type { Metadata } from 'next'
import RegisterPage from '@/components/pages/RegisterPage'

export const metadata: Metadata = {
  title: '회원가입',
  description: 'GAMEUP 회원가입',
}

export default function Page() {
  return <RegisterPage />
}
