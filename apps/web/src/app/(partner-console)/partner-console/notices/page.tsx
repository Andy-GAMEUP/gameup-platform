'use client'
import { Megaphone } from 'lucide-react'

export default function PartnerNoticesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">공지/알림</h2>
        <p className="text-slate-400">관리자 공지사항과 알림을 확인하세요</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">새로운 공지사항이 없습니다</p>
        <p className="text-sm text-slate-500 mt-1">관리자 공지가 등록되면 여기에 표시됩니다</p>
      </div>
    </div>
  )
}
