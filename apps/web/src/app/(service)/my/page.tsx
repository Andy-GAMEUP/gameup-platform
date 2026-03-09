import type { Metadata } from 'next'
import PlayerMyPage from '@/components/pages/PlayerMyPage'

export const metadata: Metadata = {
  title: '마이페이지',
  description: '내 정보 및 활동',
}

export default function Page() {
  return <PlayerMyPage />
}
