import type { Metadata } from 'next'
import SolutionsPage from '@/components/pages/SolutionsPage'

export const metadata: Metadata = {
  title: '솔루션 마켓플레이스',
  description: '게임 개발 솔루션을 찾아보세요',
}

export default function Page() {
  return <SolutionsPage />
}
