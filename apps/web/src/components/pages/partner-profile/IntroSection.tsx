'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit3, Loader2, Save, FileEdit } from 'lucide-react'
import { partnerService } from '@/services/partnerService'
import { authService } from '@/services/authService'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import { COMPANY_TYPE_OPTIONS } from './constants'
import { isEmptyRichText } from '@/lib/richText'
import Editor from '@/components/Editor'

const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''

function currentCompanyTypes(partner: { userId: any }) {
  const raw: string[] = partner.userId?.companyInfo?.companyType || []
  return raw.filter(t => t !== 'developer')
}

export default function IntroSection() {
  const { id, partner, canEdit, isOwnProfile } = usePartnerProfileCtx()
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(partner.introduction || '')
  const [companyTypes, setCompanyTypes] = useState<string[]>(() => currentCompanyTypes(partner))

  useEffect(() => {
    if (searchParams.get('edit') !== 'intro' || !canEdit) return
    setValue(partner.introduction || '')
    setCompanyTypes(currentCompanyTypes(partner))
    setIsEditing(true)
    document.getElementById('intro-section')?.scrollIntoView({ behavior: 'smooth' })
    router.replace(`/partner/${id}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canEdit])

  const updateMutation = useMutation({
    mutationFn: (data: { introduction: string }) => partnerService.updateMyProfile(data),
  })

  const companyTypeMutation = useMutation({
    mutationFn: (companyType: string[]) => authService.updateCompanyType(companyType),
  })

  const isSaving = updateMutation.isPending || companyTypeMutation.isPending

  const toggleCompanyType = (v: string) => {
    setCompanyTypes(prev => prev.includes(v) ? prev.filter(t => t !== v) : [...prev, v])
  }

  const startEditing = () => {
    setValue(partner.introduction || '')
    setCompanyTypes(currentCompanyTypes(partner))
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      await Promise.all([
        updateMutation.mutateAsync({ introduction: value }),
        ...(isOwnProfile ? [companyTypeMutation.mutateAsync(companyTypes)] : []),
      ])
      queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] })
      setIsEditing(false)
    } catch {
      // 에러는 각 mutation의 상태로 노출되며, 사용자는 저장을 다시 시도할 수 있다
    }
  }

  return (
    <div id="intro-section" className="bg-bg-card border border-line rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-text-primary font-semibold text-lg">소개</h2>
        {canEdit && !isEditing && (
          <button onClick={startEditing} className="flex items-center gap-1.5 text-base text-accent hover:text-accent-hover">
            <Edit3 className="w-4 h-4" /> 수정
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          {isOwnProfile && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">
                기업 형태 <span className="text-text-muted font-normal">(복수 선택 가능)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {COMPANY_TYPE_OPTIONS.map(({ value: v, label }) => {
                  const selected = companyTypes.includes(v)
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleCompanyType(v)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        selected ? 'border-accent bg-accent-light text-accent' : 'border-line text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <Editor
            content={value}
            onChange={setValue}
            placeholder="회사/파트너 소개를 작성해주세요"
            onImageUpload={async (file) => {
              const result = await partnerService.uploadImages([file])
              const raw = result.images[0]
              return raw.startsWith('http') ? raw : `${UPLOADS_URL}${raw}`
            }}
          />
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-line text-text-secondary rounded-lg text-base hover:bg-bg-tertiary">취소</button>
            <button onClick={handleSave} disabled={isSaving}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary rounded-lg text-base font-medium inline-flex items-center gap-1.5">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 저장
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!isEmptyRichText(partner.introduction) ? (
        <div
          className="text-text-secondary text-sm leading-relaxed break-words
            [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
            [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5
            [&_p]:mb-3 [&_p:last-child]:mb-0
            [&_ul]:list-none [&_ul]:pl-0 [&_ul]:mb-3 [&_ul]:space-y-1
            [&_li>p]:pl-[1.4em] [&_li>p]:[text-indent:-1.4em]
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
            [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-4 [&_blockquote]:text-text-secondary [&_blockquote]:italic [&_blockquote]:my-3
            [&_code]:bg-bg-tertiary [&_code]:text-cyan-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
            [&_pre]:bg-bg-tertiary [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0
            [&_a]:text-cyan-400 [&_a]:underline [&_a:hover]:text-cyan-300
            [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-3 [&_img]:border [&_img]:border-line
            [&_strong]:text-text-primary [&_strong]:font-semibold
            [&_em]:italic"
          dangerouslySetInnerHTML={{ __html: partner.introduction }}
        />
          ) : (
            <div className="flex flex-col items-center justify-center text-center min-h-[220px] py-10">
              <FileEdit className="w-9 h-9 text-text-muted opacity-30 mb-3" />
              <p className="text-text-muted text-sm">아직 작성된 소개가 없습니다.</p>
              {canEdit && (
                <button
                  onClick={() => { setValue(''); setCompanyTypes(currentCompanyTypes(partner)); setIsEditing(true) }}
                  className="mt-3 text-sm font-medium text-accent hover:text-accent-hover"
                >
                  소개 작성하기
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
