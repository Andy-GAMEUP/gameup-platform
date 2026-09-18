'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { paymentService } from '@/services/paymentService'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

type Status = 'loading' | 'success' | 'failed' | 'error'

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 15 // 최대 30초 대기

export default function PaymentNewPlayStatusPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const pollCount = useRef(0)

  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (!orderId) {
      setErrorMsg('결제 정보가 올바르지 않습니다.')
      setStatus('error')
      return
    }

    let cancelled = false

    const poll = async () => {
      try {
        const data = await paymentService.getOrderStatus(orderId)
        if (cancelled) return

        if (data.status === 'completed') {
          setAmount(data.amount)
          setStatus('success')
          return
        }
        if (data.status === 'failed') {
          setErrorMsg('결제가 완료되지 않았습니다.')
          setStatus('failed')
          return
        }

        // pending — 뉴플레이 웹훅 수신 대기 중
        pollCount.current += 1
        if (pollCount.current >= MAX_POLLS) {
          setErrorMsg('결제 확인이 지연되고 있습니다. 결제 내역에서 다시 확인해주세요.')
          setStatus('error')
          return
        }
        setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err: unknown) {
        if (cancelled) return
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setErrorMsg(msg || '결제 상태 확인 중 오류가 발생했습니다.')
        setStatus('error')
      }
    }

    poll()
    return () => { cancelled = true }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md p-8 text-center">

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-12 h-12 animate-spin text-blue-400" />
            <p className="text-text-secondary font-semibold">결제 확인 중...</p>
            <p className="text-text-muted text-sm">뉴플레이에서 결제 완료 알림을 기다리고 있습니다.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">결제 완료!</h1>
              <p className="text-text-secondary text-sm">구매해 주셔서 감사합니다.</p>
            </div>
            {amount !== null && (
              <div className="w-full p-4 bg-bg-tertiary/50 rounded-lg border border-line flex justify-between text-sm mt-2">
                <span className="text-text-secondary">결제 금액</span>
                <span className="text-accent font-bold">₩{amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex gap-3 w-full mt-2">
              <Link
                href="/"
                className="flex-1 py-2.5 border border-line hover:bg-bg-tertiary rounded-lg text-sm text-center transition-colors"
              >
                게임 목록
              </Link>
              <button
                onClick={() => router.back()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-base font-semibold transition-colors"
              >
                게임으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {(status === 'failed' || status === 'error') && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-danger" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">결제 실패</h1>
              <p className="text-text-secondary text-sm">{errorMsg}</p>
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
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-base font-semibold transition-colors"
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
