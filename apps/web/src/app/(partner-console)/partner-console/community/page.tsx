'use client'
import { Users } from 'lucide-react'

export default function PartnerCommunityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">커뮤니티</h2>
        <p className="text-slate-400">파트너 커뮤니티 활동을 관리하세요</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">커뮤니티 활동이 없습니다</p>
        <p className="text-sm text-slate-500 mt-1">커뮤니티 활동이 시작되면 여기에 표시됩니다</p>
      </div>
    </div>
  )
}
