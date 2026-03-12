'use client'
import { Joystick } from 'lucide-react'

export default function PartnerLiveGamesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">라이브 서비스 게임</h2>
        <p className="text-slate-400">라이브 서비스 중인 게임 목록을 확인하세요</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <Joystick className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">등록된 라이브 서비스 게임이 없습니다</p>
        <p className="text-sm text-slate-500 mt-1">라이브 서비스 게임이 등록되면 여기에 표시됩니다</p>
      </div>
    </div>
  )
}
