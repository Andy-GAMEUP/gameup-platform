'use client'
import { Home } from 'lucide-react'

export default function PartnerMinihomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">미니홈 관리</h2>
        <p className="text-slate-400">미니홈페이지를 생성하고 편집하세요</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <Home className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">미니홈이 아직 생성되지 않았습니다</p>
        <p className="text-sm text-slate-500 mt-1">미니홈을 생성하여 파트너 페이지를 꾸며보세요</p>
      </div>
    </div>
  )
}
