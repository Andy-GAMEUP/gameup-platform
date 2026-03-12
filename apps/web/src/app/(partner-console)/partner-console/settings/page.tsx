'use client'
import { useAuth } from '@/lib/useAuth'
import { Settings } from 'lucide-react'

export default function PartnerSettingsPage() {
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
        <h2 className="text-2xl font-bold mb-1">설정</h2>
        <p className="text-slate-400">파트너 계정 정보를 확인하세요</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          기업 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500">회사명</label>
            <p className="text-white">{companyInfo?.companyName || '-'}</p>
          </div>
          <div>
            <label className="text-xs text-slate-500">기업유형</label>
            <div className="flex gap-1 mt-0.5">
              {companyInfo?.companyType?.map((type: string) => (
                <span key={type} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  {COMPANY_TYPE_LABELS[type] || type}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">이메일</label>
            <p className="text-white">{user?.email || '-'}</p>
          </div>
          <div>
            <label className="text-xs text-slate-500">승인 상태</label>
            <p className="text-green-400">승인완료</p>
          </div>
        </div>
      </div>
    </div>
  )
}
