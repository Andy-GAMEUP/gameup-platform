import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-red-500">404</h1>
        <h2 className="text-text-primary text-xl font-semibold">페이지를 찾을 수 없습니다</h2>
        <p className="text-text-secondary text-sm">요청하신 페이지가 존재하지 않거나 이동되었습니다</p>
        <Link href="/" className="inline-block px-6 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary text-sm rounded-lg transition-colors">홈으로 돌아가기</Link>
      </div>
    </div>
  )
}
