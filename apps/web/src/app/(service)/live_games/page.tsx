import type { Metadata } from 'next'
import LiveGamesPage from '@/components/pages/LiveGamesPage'

export const metadata: Metadata = {
  title: '라이브게임',
  description: '베타 테스트를 거쳐 정식 서비스 중인 게임을 만나보세요',
}

export default function Page() {
  return <LiveGamesPage />
}
