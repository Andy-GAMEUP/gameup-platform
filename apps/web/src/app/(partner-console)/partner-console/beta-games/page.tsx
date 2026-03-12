'use client'
import { FlaskConical } from 'lucide-react'

export default function PartnerBetaGamesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">베타테스트 게임</h2>
        <p className="text-slate-400">베타테스트 중인 게임 목록을 확인하고 관리하세요</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <FlaskConical className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">등록된 베타테스트 게임이 없습니다</p>
        <p className="text-sm text-slate-500 mt-1">베타테스트 게임이 등록되면 여기에 표시됩니다</p>
      </div>
    </div>
  )
}
