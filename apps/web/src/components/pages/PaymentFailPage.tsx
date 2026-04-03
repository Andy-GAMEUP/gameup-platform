'use client'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'

export default function PaymentFailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const code = searchParams.get('code')
  const message = searchParams.get('message') || '결제가 취소되었거나 오류가 발생했습니다.'

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-danger" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">결제 실패</h1>
            <p className="text-text-secondary text-sm">{message}</p>
            {code && (
              <p className="text-text-muted text-xs mt-1">오류 코드: {code}</p>
            )}
          </div>
          <div className="flex gap-3 w-full mt-2">
            <Link
              href="/"
              className="flex-1 py-2.5 border border-line hover:bg-bg-tertiary rounded-lg text-sm text-center transition-colors"
            >
              게임 목록
            </Link>
            <button
              onClick={() => router.back()}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
