'use client'
import { useState } from 'react'
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk'
import { paymentService } from '@/services/paymentService'
import { X, CreditCard, Loader, AlertCircle } from 'lucide-react'

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY as string

interface TossPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  gameName: string
  itemName: string
  amount: number
}

export default function TossPaymentModal({
  isOpen,
  onClose,
  gameId,
  gameName,
  itemName,
  amount,
}: TossPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePayment = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. 서버에 주문 생성
      const { orderId } = await paymentService.createOrder({ gameId, amount, gameName, itemName })

      // 2. 토스페이먼츠 SDK 초기화
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY)
      const payment = tossPayments.payment({ customerKey: ANONYMOUS })

      // 3. 결제 요청 (토스 결제 페이지로 이동)
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName: itemName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      })
      // requestPayment 이후로는 브라우저가 리디렉트되므로 아래 코드는 실행되지 않음
    } catch (err: any) {
      // 사용자가 결제 취소한 경우 또는 에러
      if (err.code === 'USER_CANCEL') {
        setError('')
      } else {
        setError(err.message || '결제 초기화에 실패했습니다.')
      }
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">결제하기</h2>
              <p className="text-sm text-slate-400">{gameName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 상품 정보 */}
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{itemName}</p>
                <p className="text-sm text-slate-400 mt-0.5">{gameName}</p>
              </div>
              <p className="text-xl font-bold text-blue-400">₩{amount.toLocaleString()}</p>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* 안내 */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300">
              토스페이먼츠 결제창으로 이동합니다.<br />
              카드 / 계좌이체 / 카카오페이 / 네이버페이 등 다양한 결제 수단을 지원합니다.
            </p>
          </div>

          {/* 결제 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm transition-colors"
            >
              취소
            </button>
            <button
              onClick={handlePayment}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold text-sm transition-colors"
            >
              {loading ? (
                <><Loader className="w-4 h-4 animate-spin" /> 처리 중...</>
              ) : (
                <>결제하기 ₩{amount.toLocaleString()}</>
              )}
            </button>
          </div>

          <p className="text-xs text-center text-slate-500">
            토스페이먼츠 보안 결제
          </p>
        </div>
      </div>
    </div>
  )
}
