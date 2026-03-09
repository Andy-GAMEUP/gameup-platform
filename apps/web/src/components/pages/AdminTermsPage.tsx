'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import { Loader2, Save, FileText } from 'lucide-react'

const Editor = dynamic(() => import('@/components/Editor'), { ssr: false })

type TermsType = 'privacy' | 'service'

const TABS: Array<{ key: TermsType; label: string }> = [
  { key: 'privacy', label: '개인정보 수집 및 이용' },
  { key: 'service', label: '서비스 이용약관' },
]

export default function AdminTermsPage() {
  const [activeTab, setActiveTab] = useState<TermsType>('privacy')
  const [contents, setContents] = useState<Record<TermsType, string>>({ privacy: '', service: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminService.getTerms('privacy').catch(() => ({ content: '' })),
      adminService.getTerms('service').catch(() => ({ content: '' })),
    ]).then(([p, s]) => {
      setContents({
        privacy: (p?.content ?? p?.data?.content ?? '') as string,
        service: (s?.content ?? s?.data?.content ?? '') as string,
      })
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!window.confirm('약관을 저장하시겠습니까?')) return
    setSaving(true)
    try {
      await adminService.updateTerms(activeTab, contents[activeTab])
      alert('저장되었습니다.')
    } catch {
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-red-400" />
          <h2 className="text-white text-xl font-bold">약관 관리</h2>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="ml-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-800">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'text-red-300 border-red-500'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              현재 편집 중: <span className="text-white font-medium">{TABS.find(t => t.key === activeTab)?.label}</span>
            </p>
            <Editor
              content={contents[activeTab]}
              onChange={(html) => setContents(prev => ({ ...prev, [activeTab]: html }))}
              placeholder="약관 내용을 입력하세요..."
            />
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
