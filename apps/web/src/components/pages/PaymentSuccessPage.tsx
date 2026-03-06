'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { paymentService } from '@/services/paymentService'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

type Status = 'loading' | 'success' | 'error'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [paymentInfo, setPaymentInfo] = useState<{
    orderName?: string
    amount?: number
    method?: string
    approvedAt?: string
  } | null>(null)

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = Number(searchParams.get('amount'))

    if (!paymentKey || !orderId || !amount) {
      setErrorMsg('결제 정보가 올바르지 않습니다.')
      setStatus('error')
      return
    }

    paymentService.confirmPayment(paymentKey, orderId, amount)
      .then((data) => {
        setPaymentInfo(data.tossPayment)
        setStatus('success')
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || '결제 승인 중 오류가 발생했습니다.')
        setStatus('error')
      })
  }, [searchParams])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-8 text-center">

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-12 h-12 animate-spin text-blue-400" />
            <p className="text-slate-300 font-semibold">결제 확인 중...</p>
            <p className="text-slate-500 text-sm">잠시만 기다려주세요.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">결제 완료!</h1>
              <p className="text-slate-400 text-sm">구매해 주셔서 감사합니다.</p>
            </div>

            {paymentInfo && (
              <div className="w-full p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-left space-y-2 mt-2">
                {paymentInfo.orderName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">상품</span>
                    <span className="text-white font-medium">{paymentInfo.orderName}</span>
                  </div>
                )}
                {paymentInfo.amount !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">결제 금액</span>
                    <span className="text-green-400 font-bold">₩{paymentInfo.amount.toLocaleString()}</span>
                  </div>
                )}
                {paymentInfo.method && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">결제 수단</span>
                    <span className="text-white">{paymentInfo.method}</span>
                  </div>
                )}
                {paymentInfo.approvedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">결제 일시</span>
                    <span className="text-white">
                      {new Date(paymentInfo.approvedAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 w-full mt-2">
              <Link
                href="/games"
                className="flex-1 py-2.5 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm text-center transition-colors"
              >
                게임 목록
              </Link>
              <button
                onClick={() => router.back()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors"
              >
                게임으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">결제 실패</h1>
              <p className="text-slate-400 text-sm">{errorMsg}</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <Link
                href="/games"
                className="flex-1 py-2.5 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm text-center transition-colors"
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
        )}

      </div>
    </div>
  )
}
