import type { Metadata } from 'next'
import GameListPage from '@/components/pages/GameListPage'

export const metadata: Metadata = {
  title: '게임 목록',
  description: '베타 테스트 게임을 찾아보세요',
}

export default function Page() {
  return <GameListPage />
}
