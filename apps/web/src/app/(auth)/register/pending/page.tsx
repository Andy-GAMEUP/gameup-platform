'use client'
import Link from 'next/link'
import { Gamepad2, Clock, CheckCircle2, Home } from 'lucide-react'

export default function RegisterPendingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <Gamepad2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold">
            <span className="text-green-400">GAME</span>
            <span className="text-white">UP</span>
          </span>
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">가입 신청 완료</h1>
          <p className="text-slate-400 mb-6 leading-relaxed">
            기업회원 가입 신청이 완료되었습니다.<br />
            관리자 승인 후 기업 전용 기능을<br />
            이용하실 수 있습니다.
          </p>

          <div className="bg-slate-800 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-slate-300 mb-3">승인 절차 안내</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-white">가입 신청</p>
                  <p className="text-xs text-slate-500">완료</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-white">관리자 검토</p>
                  <p className="text-xs text-slate-500">검토 중 (영업일 기준 1~2일 소요)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-slate-400">승인 완료</p>
                  <p className="text-xs text-slate-500">기업 기능 이용 가능</p>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
