'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/AdminLayout'
import ConfirmModal from '@/components/ConfirmModal'
import AlertModal from '@/components/AlertModal'
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
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminService.getTerms('privacy').catch(() => ({ terms: [] })),
      adminService.getTerms('service').catch(() => ({ terms: [] })),
    ]).then(([p, s]) => {
      setContents({
        privacy: (p?.terms?.[0]?.content ?? '') as string,
        service: (s?.terms?.[0]?.content ?? '') as string,
      })
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminService.updateTerms(activeTab, contents[activeTab])
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-accent-text" />
            <h2 className="text-text-primary text-xl font-bold">약관 관리</h2>
          </div>
          <p className="text-text-muted text-sm mt-1">서비스 이용약관과 개인정보처리방침을 관리합니다</p>
        </div>

        <div className="flex items-center justify-between border-b border-line">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-base font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'text-accent-text border-red-500'
                    : 'text-text-secondary border-transparent hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSaveConfirm(true)}
            disabled={saving || loading}
            className="mb-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-base transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
          </div>
        ) : (
          <Editor
            key={activeTab}
            content={contents[activeTab]}
            onChange={(html) => setContents(prev => ({ ...prev, [activeTab]: html }))}
            placeholder="약관 내용을 입력하세요..."
          />
        )}
      </div>

      <ConfirmModal
        isOpen={showSaveConfirm}
        title="약관 저장"
        message="약관을 저장하시겠습니까?"
        confirmLabel="저장"
        onConfirm={() => {
          setShowSaveConfirm(false)
          handleSave()
        }}
        onCancel={() => setShowSaveConfirm(false)}
      />

      <AlertModal
        isOpen={!!alertMessage}
        message={alertMessage || ''}
        onConfirm={() => setAlertMessage(null)}
      />
    </AdminLayout>
  )
}
