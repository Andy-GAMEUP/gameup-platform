'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase, Plus, Trash2, Pencil, X, Loader2, Image as ImageIcon,
  Globe, Smartphone, Apple, Monitor, Gamepad2, LayoutGrid, ChevronRight,
} from 'lucide-react'
import { partnerService } from '@/services/partnerService'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import {
  PartnerPortfolioItem, PORTFOLIO_WORK_SCOPE_OPTIONS, PORTFOLIO_PLATFORM_OPTIONS, PORTFOLIO_TECHNOLOGY_MAX,
} from './constants'
import Editor from '@/components/Editor'

const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''
const emptyItem: PartnerPortfolioItem = {
  title: '', description: '', thumbnailUrl: '',
  workScopes: [], platforms: [], technologies: [], isPublic: true,
}

const PLATFORM_ICONS: Record<string, typeof Globe> = {
  web: Globe, android: Smartphone, ios: Apple, pc: Monitor, gameup: Gamepad2, other: LayoutGrid,
}

function toAbsoluteUrl(raw: string) {
  return raw.startsWith('http') ? raw : `${UPLOADS_URL}${raw}`
}

function labelsOf(options: { value: string; label: string }[], values: string[]) {
  return values.map(v => options.find(o => o.value === v)?.label || v)
}

function formatCompact(labels: string[]) {
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  return `${labels[0]} 외 ${labels.length - 1}개`
}

function PortfolioCard({ item, canEdit, onEdit, onRemove, onOpenDetail }: {
  item: PartnerPortfolioItem; canEdit: boolean; onEdit: () => void; onRemove: () => void; onOpenDetail: () => void
}) {
  const metaLine = [
    labelsOf(PORTFOLIO_WORK_SCOPE_OPTIONS, item.workScopes).join(' · '),
    formatCompact(labelsOf(PORTFOLIO_PLATFORM_OPTIONS, item.platforms)),
  ].filter(Boolean).join(' | ')
  const visibleTech = item.technologies.slice(0, 5)
  const hasMoreTech = item.technologies.length > 5

  return (
    <div
      className="group relative bg-bg-card border border-line rounded-xl overflow-hidden hover:border-accent-muted transition-colors cursor-pointer"
      onClick={onOpenDetail}
    >
      <div className="w-full aspect-square bg-bg-tertiary flex items-center justify-center">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-8 h-8 text-text-muted" />
        )}
      </div>

      {canEdit && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="bg-black/50 text-white hover:text-accent p-1.5 rounded-lg">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove() }} className="bg-black/50 text-white hover:text-danger p-1.5 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-text-primary font-semibold text-[23.52px] line-clamp-1">{item.title}</h3>
        {metaLine && <p className="text-text-secondary text-sm font-medium mt-1.5 truncate">{metaLine}</p>}
        {(visibleTech.length > 0 || hasMoreTech) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {visibleTech.map((t, i) => (
              <span key={i} className="text-xs bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-full border border-line">{t}</span>
            ))}
            {hasMoreTech && <span className="text-xs text-text-muted">…</span>}
          </div>
        )}
      </div>
    </div>
  )
}

const DESCRIPTION_PROSE_CLASS = `text-text-secondary text-sm leading-relaxed break-words
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
  [&_em]:italic`

function PortfolioDetailView({ item, onBack, onOpenLightbox, hasNext, onNext }: {
  item: PartnerPortfolioItem; onBack: () => void; onOpenLightbox: (url: string) => void
  hasNext: boolean; onNext: () => void
}) {
  const workScopeLabels = labelsOf(PORTFOLIO_WORK_SCOPE_OPTIONS, item.workScopes)
  const platformLabels = labelsOf(PORTFOLIO_PLATFORM_OPTIONS, item.platforms)
  const metaGroups = [
    workScopeLabels.length > 0 && { label: '업무 범위', value: workScopeLabels.join(', ') },
    platformLabels.length > 0 && { label: '카테고리', value: platformLabels.join(', ') },
    item.technologies.length > 0 && { label: '관련 기술', value: item.technologies.join(', ') },
  ].filter((g): g is { label: string; value: string } => !!g)

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
        <ChevronRight className="w-4 h-4 rotate-180" /> 목록으로
      </button>

      <div className="bg-bg-card border border-line rounded-2xl overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <h1 className="text-[31.2px] font-bold text-text-primary">{item.title}</h1>

          {metaGroups.length > 0 && (
            <p className="text-sm flex flex-wrap items-center gap-x-2">
              {metaGroups.map((g, i) => (
                <span key={i} className="flex items-center gap-x-2">
                  {i > 0 && <span className="text-text-muted">|</span>}
                  <span><span className="text-text-muted">{g.label}</span> · <span className="text-text-primary font-medium">{g.value}</span></span>
                </span>
              ))}
            </p>
          )}

          <hr className="border-line" />

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">프로젝트 설명</h3>
            <div className={DESCRIPTION_PROSE_CLASS} dangerouslySetInnerHTML={{ __html: item.description }} />
          </div>
        </div>
      </div>

      {hasNext && (
        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="flex items-center gap-1 bg-bg-card border border-line rounded-lg px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
          >
            다음 포트폴리오 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function PortfolioSection() {
  const { id, partner, canEdit } = usePartnerProfileCtx()
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<PartnerPortfolioItem[]>(partner.portfolio || [])
  const [editing, setEditing] = useState<PartnerPortfolioItem | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [detailIndex, setDetailIndex] = useState<number | null>(null)
  const [techInput, setTechInput] = useState('')

  useEffect(() => {
    const itemParam = searchParams.get('item')
    if (itemParam === null) return
    const index = parseInt(itemParam, 10)
    if (!Number.isNaN(index) && index >= 0 && index < items.length) {
      setDetailIndex(index)
    }
    router.replace(`/partner/${id}/portfolio`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const saveMutation = useMutation({
    mutationFn: (portfolio: PartnerPortfolioItem[]) => partnerService.updateMyProfile({ portfolio }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] }),
  })

  const openForm = () => {
    setEditingIndex(null)
    setEditing({ ...emptyItem })
  }

  const openEditForm = (index: number) => {
    setEditingIndex(index)
    setEditing({ ...items[index] })
  }

  const closeForm = () => {
    setEditing(null)
    setEditingIndex(null)
  }

  const toggleWorkScope = (value: string) => {
    setEditing(prev => prev ? { ...prev, workScopes: prev.workScopes.includes(value) ? prev.workScopes.filter(v => v !== value) : [...prev.workScopes, value] } : prev)
  }

  const togglePlatform = (value: string) => {
    setEditing(prev => prev ? { ...prev, platforms: prev.platforms.includes(value) ? prev.platforms.filter(v => v !== value) : [...prev.platforms, value] } : prev)
  }

  const clearThumbnail = () => {
    setEditing(prev => prev ? { ...prev, thumbnailUrl: '' } : prev)
  }

  const uploadThumbnail = async (file: File) => {
    if (!editing) return
    setUploading(true)
    try {
      const result = await partnerService.uploadImages([file])
      setEditing(prev => prev ? { ...prev, thumbnailUrl: toAbsoluteUrl(result.images[0]) } : prev)
    } finally {
      setUploading(false)
    }
  }

  const handleThumbnailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadThumbnail(file)
    e.target.value = ''
  }

  const handleThumbnailDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) uploadThumbnail(file)
  }

  const isValid = !!editing?.title && !!editing?.workScopes.length && !!editing?.platforms.length && !!editing?.description

  const submitItem = () => {
    if (!editing || !isValid) return
    const next = editingIndex !== null
      ? items.map((it, i) => i === editingIndex ? { ...editing } : it)
      : [...items, { ...editing }]
    setItems(next)
    saveMutation.mutate(next)
    closeForm()
  }

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    setItems(next)
    saveMutation.mutate(next)
  }

  const inputClass = 'w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent'

  if (detailIndex !== null && items[detailIndex]) {
    return (
      <div className="space-y-4">
        <PortfolioDetailView
          item={items[detailIndex]}
          onBack={() => setDetailIndex(null)}
          onOpenLightbox={setLightboxUrl}
          hasNext={items.length > 1}
          onNext={() => setDetailIndex((detailIndex + 1) % items.length)}
        />
        {lightboxUrl && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
            <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxUrl(null)}><X className="w-6 h-6" /></button>
            <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-lg" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <p className="text-text-primary font-semibold">{items.length}개의 포트폴리오</p>
      )}

      {canEdit && (
        editing ? (
          <div className="bg-bg-card border border-line rounded-xl p-6 space-y-6">
            <h2 className="text-text-primary font-bold text-lg">{editingIndex !== null ? '포트폴리오 수정' : '포트폴리오 등록'}</h2>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">포트폴리오 제목 <span className="text-danger">*</span></label>
              <input className={inputClass} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="예) 실시간 PvP 모바일 RPG 개발" />
            </div>

            <div className="flex flex-col md:flex-row gap-5 items-stretch">
              <div className="border border-line rounded-xl p-5 w-full md:w-60 flex-shrink-0">
                <h3 className="text-sm font-semibold text-text-primary mb-3">썸네일 등록</h3>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="portfolio-thumbnail-input"
                  onChange={handleThumbnailInputChange}
                />
                {editing.thumbnailUrl ? (
                  <div className="group relative rounded-2xl overflow-hidden border border-line w-[180px] h-[180px] mx-auto">
                    <img src={editing.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <label htmlFor="portfolio-thumbnail-input" className="px-3 py-1.5 bg-white text-text-primary rounded-lg text-xs font-medium cursor-pointer">변경</label>
                      <button onClick={clearThumbnail} className="px-3 py-1.5 bg-white text-danger rounded-lg text-xs font-medium">삭제</button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="portfolio-thumbnail-input"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleThumbnailDrop}
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line hover:border-accent hover:bg-accent/5 rounded-2xl w-[180px] h-[180px] mx-auto px-3 cursor-pointer transition-colors text-center"
                  >
                    {uploading ? <Loader2 className="w-6 h-6 text-accent animate-spin" /> : <ImageIcon className="w-6 h-6 text-text-muted" />}
                    {uploading && <p className="text-sm font-medium text-text-primary">업로드 중...</p>}
                    <p className="text-xs text-text-muted">클릭하거나 파일을 이 영역에 끌어다 놓으세요</p>
                  </label>
                )}
                <div className="mt-3 space-y-0.5">
                  <p className="text-text-muted text-[10.08px]">· 썸네일 규격: 480x480px</p>
                  <p className="text-text-muted text-[10.08px]">· 이미지 파일 등록 가능 (JPG, JEPG, PNG)</p>
                </div>
              </div>

              <div className="border border-line rounded-xl p-5 space-y-5 flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">업무 정보 <span className="text-danger">*</span></h3>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">업무 범위 <span className="text-danger">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {PORTFOLIO_WORK_SCOPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => toggleWorkScope(opt.value)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-colors ${editing.workScopes.includes(opt.value) ? 'bg-accent/10 border-accent text-accent' : 'border-line text-text-secondary hover:border-accent-muted'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">카테고리 <span className="text-danger">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {PORTFOLIO_PLATFORM_OPTIONS.map(opt => {
                      const Icon = PLATFORM_ICONS[opt.value]
                      const active = editing.platforms.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          onClick={() => togglePlatform(opt.value)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-accent/10 border-accent text-accent' : 'border-line text-text-secondary hover:border-accent-muted'}`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">관련 기술</label>
                  <input
                    className={inputClass}
                    value={techInput}
                    onChange={e => setTechInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && techInput.trim() && editing.technologies.length < PORTFOLIO_TECHNOLOGY_MAX) {
                        e.preventDefault()
                        setEditing({ ...editing, technologies: [...editing.technologies, techInput.trim()] })
                        setTechInput('')
                      }
                    }}
                    placeholder="예) React, Node.js, Figma"
                    disabled={editing.technologies.length >= PORTFOLIO_TECHNOLOGY_MAX}
                  />
                  <p className="text-text-muted text-xs mt-1.5">
                    {editing.technologies.length >= PORTFOLIO_TECHNOLOGY_MAX
                      ? `최대 ${PORTFOLIO_TECHNOLOGY_MAX}개까지 등록할 수 있습니다.`
                      : '기술명 입력 후 엔터키를 눌러 추가해 주세요.'} ({editing.technologies.length}/{PORTFOLIO_TECHNOLOGY_MAX})
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {editing.technologies.map((t, i) => (
                      <span key={i} className="bg-bg-tertiary text-text-secondary px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
                        {t}
                        <button onClick={() => setEditing({ ...editing, technologies: editing.technologies.filter((_, j) => j !== i) })} className="text-text-muted hover:text-danger"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">프로젝트 설명 <span className="text-danger">*</span></label>
              <Editor
                content={editing.description}
                onChange={val => setEditing({ ...editing, description: val })}
                placeholder="프로젝트 설명을 작성해 주세요"
                onImageUpload={async (file) => {
                  const result = await partnerService.uploadImages([file])
                  return toAbsoluteUrl(result.images[0])
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <div className="inline-flex rounded-lg border border-line overflow-hidden">
                <button onClick={() => setEditing({ ...editing, isPublic: true })} className={`px-4 py-2 text-sm font-medium transition-colors ${editing.isPublic ? 'bg-accent text-text-primary' : 'bg-bg-tertiary text-text-secondary'}`}>공개</button>
                <button onClick={() => setEditing({ ...editing, isPublic: false })} className={`px-4 py-2 text-sm font-medium transition-colors ${!editing.isPublic ? 'bg-accent text-text-primary' : 'bg-bg-tertiary text-text-secondary'}`}>나만 보기</button>
              </div>
              <div className="w-px h-6 bg-line" />
              <button onClick={closeForm} className="px-4 py-2 border border-line text-text-secondary rounded-lg text-base hover:bg-bg-tertiary">취소</button>
              <button onClick={submitItem} disabled={!isValid} className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary rounded-lg text-base font-medium inline-flex items-center gap-1">
                {editingIndex !== null ? '저장' : '등록'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button onClick={openForm} className="px-4 py-2 bg-accent hover:bg-accent-hover text-text-primary rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition-colors">
              <Plus className="w-4 h-4" /> 포트폴리오 등록
            </button>
          </div>
        )
      )}

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((item, index) => (
            <PortfolioCard key={item._id || index} item={item} canEdit={canEdit} onEdit={() => openEditForm(index)} onRemove={() => removeItem(index)} onOpenDetail={() => setDetailIndex(index)} />
          ))}
        </div>
      ) : (
        <div className="bg-bg-card border border-line rounded-xl py-12 text-center text-text-muted">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">등록된 포트폴리오가 없습니다</p>
        </div>
      )}
      {saveMutation.isPending && <div className="text-xs text-text-muted flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> 저장 중...</div>}

      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxUrl(null)}><X className="w-6 h-6" /></button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
