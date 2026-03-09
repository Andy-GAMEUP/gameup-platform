import type { Metadata } from 'next'
import ScrapPage from '@/components/pages/ScrapPage'

export const metadata: Metadata = {
  title: '스크랩',
  description: '스크랩한 콘텐츠',
}

export default function Page() {
  return <ScrapPage />
}
