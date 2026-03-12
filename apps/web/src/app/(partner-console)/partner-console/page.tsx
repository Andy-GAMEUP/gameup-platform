'use client'
import { useAuth } from '@/lib/useAuth'
import { Building2, Gamepad2, Users, Bell } from 'lucide-react'

export default function PartnerDashboardPage() {
  const { user } = useAuth()
  const companyInfo = user?.companyInfo

  const COMPANY_TYPE_LABELS: Record<string, string> = {
    developer: '개발사',
    publisher: '퍼블리셔',
    game_solution: '게임솔루션',
    game_service: '게임서비스',
    operations: '운영',
    qa: 'QA',
    marketing: '마케팅',
    other: '기타',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">파트너 대시보드</h2>
        <p className="text-slate-400">파트너 현황을 한눈에 확인하세요</p>
      </div>

      {/* Company Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{companyInfo?.companyName || '-'}</h3>
            <div className="flex gap-2 mt-1">
              {companyInfo?.companyType?.map((type: string) => (
                <span key={type} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  {COMPANY_TYPE_LABELS[type] || type}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
            승인완료
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Gamepad2 className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-slate-400">베타테스트 게임</span>
          </div>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-green-400" />
            <span className="text-sm text-slate-400">커뮤니티 활동</span>
          </div>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Bell className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-slate-400">새 공지</span>
          </div>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>
    </div>
  )
}
