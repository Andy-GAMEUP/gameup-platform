'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import partnerService, { PartnerApplication } from '@/services/partnerService'
import Image from 'next/image'
import { Loader2, Search, Building2, X, Check, XCircle, ExternalLink, Ban, Trash2, Edit3, Eye, EyeOff, FileText, ArrowUpDown, Save, Star, MapPin, Mail, Phone, Globe, ChevronLeft, ChevronRight, Users } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────
interface CorporateMember {
  _id: string
  memberNo: string
  nickname: string
  username: string
  email: string
  companyInfo?: {
    companyName?: string
    companyType?: string[]
    approvalStatus?: string
    rejectedReason?: string
  }
  contactPerson?: { name?: string; phone?: string; email?: string }
  points: number
  isActive: boolean
  lastLoginAt: string
  createdAt: string
}

// ─── Constants ──────────────────────────────────────────────────────
const COMPANY_TYPE_LABELS: Record<string, string> = {
  developer: '개발사', publisher: '퍼블리셔', game_solution: '게임솔루션',
  game_service: '게임서비스', operations: '운영', qa: 'QA', marketing: '마케팅', other: '기타',
}

const PARTNER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: '심사 중', cls: 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/40' },
  approved:  { label: '승인됨',  cls: 'bg-accent-light text-accent border border-green-500/40' },
  rejected:  { label: '거절됨',  cls: 'bg-accent-light text-accent-text border border-red-500/40' },
  suspended: { label: '정지됨',  cls: 'bg-bg-muted/40 text-text-secondary border border-line' },
}

type TabKey = 'developers' | 'partners' | 'partner-requests' | 'partner-management'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'developers', label: '개발사' },
  { key: 'partners', label: '파트너' },
  { key: 'partner-requests', label: '파트너 신청' },
  { key: 'partner-management', label: '파트너 정보관리' },
]

// ─── Confirm Modal ──────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel, confirmColor, onClose, onConfirm, loading, children,
}: {
  title: string; message: string; confirmLabel: string; confirmColor: string
  onClose: () => void; onConfirm: () => void; loading: boolean; children?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-text-secondary text-sm">{message}</p>
        {children}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm">취소</button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2.5 text-text-primary rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${confirmColor}`}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Partner Detail Modal (for requests) ────────────────────────────
function PartnerRequestDetailModal({
  partner, onClose, onApprove, onReject, loading,
}: {
  partner: PartnerApplication; onClose: () => void
  onApprove: () => void; onReject: (reason: string) => void; loading: boolean
}) {
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  return (
    <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h3 className="text-text-primary font-bold text-lg">{partner.userId?.username}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${PARTNER_STATUS_MAP[partner.status]?.cls}`}>
              {PARTNER_STATUS_MAP[partner.status]?.label}
            </span>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div><p className="text-text-secondary text-xs uppercase mb-1">이메일</p><p className="text-text-primary text-sm">{partner.userId?.email}</p></div>
          {partner.slogan && <div><p className="text-text-secondary text-xs uppercase mb-1">슬로건</p><p className="text-text-primary text-sm">{partner.slogan}</p></div>}
          <div><p className="text-text-secondary text-xs uppercase mb-1">자기소개</p><p className="text-text-primary text-sm whitespace-pre-wrap bg-bg-tertiary rounded-lg p-3">{partner.introduction}</p></div>
          <div><p className="text-text-secondary text-xs uppercase mb-1">활동 계획</p><p className="text-text-primary text-sm whitespace-pre-wrap bg-bg-tertiary rounded-lg p-3">{partner.activityPlan}</p></div>
          {partner.selectedTopics?.length > 0 && (
            <div>
              <p className="text-text-secondary text-xs uppercase mb-2">선택 주제</p>
              <div className="flex flex-wrap gap-2">
                {partner.selectedTopics.map(t => <span key={t} className="bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-xs">{t}</span>)}
              </div>
            </div>
          )}
          {partner.externalUrl && (
            <div><p className="text-text-secondary text-xs uppercase mb-1">외부 링크</p>
              <a href={partner.externalUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline text-sm break-all">{partner.externalUrl}</a>
            </div>
          )}
          <div><p className="text-text-secondary text-xs uppercase mb-1">신청일</p><p className="text-text-primary text-sm">{new Date(partner.createdAt).toLocaleDateString('ko-KR')}</p></div>
          {partner.status === 'rejected' && partner.rejectedReason && (
            <div><p className="text-text-secondary text-xs uppercase mb-1">거절 사유</p><p className="text-accent-text text-sm bg-accent-light rounded-lg p-3">{partner.rejectedReason}</p></div>
          )}
        </div>
        {partner.status === 'pending' && (
          <div className="p-6 border-t border-line space-y-3">
            {showRejectInput ? (
              <div className="space-y-2">
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="거절 사유를 입력하세요" rows={3}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setShowRejectInput(false)} className="flex-1 py-2 text-sm text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary">취소</button>
                  <button onClick={() => onReject(rejectReason)} disabled={loading}
                    className="flex-1 py-2 text-sm text-text-primary bg-red-700 hover:bg-red-800 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} 거절 확인
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setShowRejectInput(true)} disabled={loading}
                  className="flex-1 py-2 text-sm text-accent-text border border-red-500/40 rounded-lg hover:bg-accent-light flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> 거절
                </button>
                <button onClick={onApprove} disabled={loading}
                  className="flex-1 py-2 text-sm text-text-primary bg-green-700 hover:bg-green-800 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 승인
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Partner Profile Edit Modal (참조: PartnerMatchingProfilePage) ──
const AVAILABILITY_OPTIONS = [
  { value: 'available', label: '즉시 가능', color: 'text-green-400' },
  { value: 'busy', label: '협의 필요', color: 'text-yellow-400' },
  { value: 'unavailable', label: '불가', color: 'text-red-400' },
]

function PartnerProfileEditModal({
  partner, onClose, onSave, loading,
}: {
  partner: PartnerApplication; onClose: () => void
  onSave: (data: Record<string, unknown>) => void; loading: boolean
}) {
  const mh = partner.minihome
  const [editTab, setEditTab] = useState<'basic' | 'company' | 'contact'>('basic')

  // Partner 기본 정보
  const [slogan, setSlogan] = useState(partner.slogan || '')
  const [introduction, setIntroduction] = useState(partner.introduction || '')
  const [externalUrl, setExternalUrl] = useState(partner.externalUrl || '')
  const [topicInput, setTopicInput] = useState('')
  const [topics, setTopics] = useState<string[]>(partner.selectedTopics || [])

  // MiniHome 기업 프로필 정보
  const [companyName, setCompanyName] = useState(mh?.companyName || partner.userId?.companyInfo?.companyName || '')
  const [skillInput, setSkillInput] = useState('')
  const [skills, setSkills] = useState<string[]>(mh?.skills || [])
  const [areaInput, setAreaInput] = useState('')
  const [expertiseArea, setExpertiseArea] = useState<string[]>(mh?.expertiseArea || [])
  const [availability, setAvailability] = useState(mh?.availability || 'available')
  const [location, setLocation] = useState(mh?.location || '')
  const [hourlyRate, setHourlyRate] = useState(mh?.hourlyRate || '')

  // 연락처
  const [contactEmail, setContactEmail] = useState(mh?.contactEmail || partner.userId?.email || '')
  const [contactPhone, setContactPhone] = useState(mh?.contactPhone || '')
  const [website, setWebsite] = useState(mh?.website || '')

  const addTag = (input: string, setInput: (v: string) => void, list: string[], setList: (v: string[]) => void) => {
    const t = input.trim()
    if (t && !list.includes(t)) { setList([...list, t]); setInput('') }
  }

  const handleSave = () => {
    onSave({
      slogan, introduction, externalUrl, selectedTopics: topics,
      companyName, skills, expertiseArea, availability, location, hourlyRate,
      contactEmail, contactPhone, website,
    })
  }

  const inputCls = 'w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50'

  const editTabs = [
    { key: 'basic' as const, label: '기본 정보' },
    { key: 'company' as const, label: '기업 프로필' },
    { key: 'contact' as const, label: '연락처' },
  ]

  return (
    <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <Edit3 className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-text-primary font-bold text-lg">프로필 편집</h3>
              <p className="text-text-secondary text-xs">{partner.userId?.username} · {companyName || '기업명 미등록'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        {/* Edit Tabs */}
        <div className="flex gap-1 p-4 pb-0 border-b border-line">
          {editTabs.map(tab => (
            <button key={tab.key} onClick={() => setEditTab(tab.key)}
              className={`px-4 py-2 rounded-t-lg text-sm transition-colors ${editTab === tab.key ? 'bg-bg-tertiary text-text-primary border border-line border-b-transparent -mb-px' : 'text-text-secondary hover:text-text-primary'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* 기본 정보 탭 */}
          {editTab === 'basic' && (
            <>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">슬로건</label>
                <input value={slogan} onChange={e => setSlogan(e.target.value)} maxLength={200} placeholder="파트너 슬로건" className={inputCls} />
                <span className="text-text-muted text-xs mt-1 block text-right">{slogan.length}/200</span>
              </div>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">자기소개</label>
                <textarea value={introduction} onChange={e => setIntroduction(e.target.value)} maxLength={2000} rows={5} placeholder="파트너 소개" className={`${inputCls} resize-none`} />
                <span className="text-text-muted text-xs mt-1 block text-right">{introduction.length}/2000</span>
              </div>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">외부 링크</label>
                <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://" className={inputCls} />
              </div>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">주제 태그</label>
                <div className="flex gap-2 mb-2">
                  <input value={topicInput} onChange={e => setTopicInput(e.target.value)} placeholder="주제 입력 후 추가"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(topicInput, setTopicInput, topics, setTopics) } }}
                    className={`flex-1 ${inputCls}`} />
                  <button onClick={() => addTag(topicInput, setTopicInput, topics, setTopics)} className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg">추가</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topics.map(t => (
                    <span key={t} className="bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                      {t}<button onClick={() => setTopics(topics.filter(x => x !== t))} className="hover:text-white"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 기업 프로필 탭 */}
          {editTab === 'company' && (
            <>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">기업명 (프로필)</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="기업명" className={inputCls} />
              </div>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">전문 분야</label>
                <div className="flex gap-2 mb-2">
                  <input value={areaInput} onChange={e => setAreaInput(e.target.value)} placeholder="전문 분야 입력"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(areaInput, setAreaInput, expertiseArea, setExpertiseArea) } }}
                    className={`flex-1 ${inputCls}`} />
                  <button onClick={() => addTag(areaInput, setAreaInput, expertiseArea, setExpertiseArea)} className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg">추가</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {expertiseArea.map(a => (
                    <span key={a} className="bg-accent-light text-accent-text border border-accent-muted px-2 py-0.5 rounded text-xs flex items-center gap-1">
                      {a}<button onClick={() => setExpertiseArea(expertiseArea.filter(x => x !== a))} className="hover:text-white"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">주요 스킬</label>
                <div className="flex gap-2 mb-2">
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="스킬 입력"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(skillInput, setSkillInput, skills, setSkills) } }}
                    className={`flex-1 ${inputCls}`} />
                  <button onClick={() => addTag(skillInput, setSkillInput, skills, setSkills)} className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg">추가</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <span key={s} className="bg-bg-tertiary text-text-secondary border border-line px-2 py-0.5 rounded text-xs flex items-center gap-1">
                      {s}<button onClick={() => setSkills(skills.filter(x => x !== s))} className="hover:text-text-primary"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-text-secondary text-xs font-medium block mb-1.5">위치</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="서울특별시" className={inputCls} />
                </div>
                <div>
                  <label className="text-text-secondary text-xs font-medium block mb-1.5">단가 기준</label>
                  <input value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="협의" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">작업 가능 상태</label>
                <div className="flex gap-2">
                  {AVAILABILITY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setAvailability(opt.value as typeof availability)}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors ${availability === opt.value
                        ? 'border-cyan-500/50 bg-cyan-600/20 text-cyan-300'
                        : 'border-line text-text-secondary hover:border-line-light hover:text-text-primary'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 연락처 탭 */}
          {editTab === 'contact' && (
            <>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">이메일</label>
                <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@company.com" className={inputCls} />
              </div>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">연락처</label>
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="010-1234-5678" className={inputCls} />
              </div>
              <div>
                <label className="text-text-secondary text-xs font-medium block mb-1.5">웹사이트</label>
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://company.com" className={inputCls} />
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-line flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-xl text-sm">취소</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 저장
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Partner Management Detail Modal ─────────────────────────────────
function PartnerManageDetailModal({
  partner, onClose, onStatusChange, loading,
}: {
  partner: PartnerApplication; onClose: () => void
  onStatusChange: (status: 'approved' | 'suspended') => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h3 className="text-text-primary font-bold text-lg">{partner.userId?.username}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${PARTNER_STATUS_MAP[partner.status]?.cls}`}>
              {PARTNER_STATUS_MAP[partner.status]?.label}
            </span>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-text-secondary text-xs uppercase mb-1">이메일</p><p className="text-text-primary text-sm">{partner.userId?.email}</p></div>
            <div><p className="text-text-secondary text-xs uppercase mb-1">포스트</p><p className="text-text-primary text-sm">{partner.postCount}</p></div>
            {partner.approvedAt && <div><p className="text-text-secondary text-xs uppercase mb-1">승인일</p><p className="text-text-primary text-sm">{new Date(partner.approvedAt).toLocaleDateString('ko-KR')}</p></div>}
          </div>
          {partner.slogan && <div><p className="text-text-secondary text-xs uppercase mb-1">슬로건</p><p className="text-text-primary text-sm italic">&quot;{partner.slogan}&quot;</p></div>}
          {partner.selectedTopics?.length > 0 && (
            <div>
              <p className="text-text-secondary text-xs uppercase mb-2">주제</p>
              <div className="flex flex-wrap gap-2">
                {partner.selectedTopics.map(t => <span key={t} className="bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-xs">{t}</span>)}
              </div>
            </div>
          )}
          <div><p className="text-text-secondary text-xs uppercase mb-1">자기소개</p><p className="text-text-primary text-sm whitespace-pre-wrap bg-bg-tertiary rounded-lg p-3">{partner.introduction}</p></div>
          {partner.externalUrl && (
            <div><p className="text-text-secondary text-xs uppercase mb-1">외부 링크</p>
              <a href={partner.externalUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline text-sm flex items-center gap-1"><ExternalLink className="w-3 h-3" /> {partner.externalUrl}</a>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-line flex gap-3">
          {partner.status === 'approved' ? (
            <button onClick={() => onStatusChange('suspended')} disabled={loading}
              className="flex-1 py-2 text-sm text-accent-text border border-red-500/40 rounded-lg hover:bg-accent-light flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} 파트너 정지
            </button>
          ) : (
            <button onClick={() => onStatusChange('approved')} disabled={loading}
              className="flex-1 py-2 text-sm text-accent border border-green-500/40 rounded-lg hover:bg-green-900/20 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} 정지 해제
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────
export default function AdminCorporateManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('developers')

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-accent-text" />
          <h2 className="text-text-primary text-xl font-bold">기업회원관리</h2>
        </div>

        <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1 w-fit">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${activeTab === tab.key ? 'bg-accent-light text-accent-text border border-accent-muted' : 'text-text-secondary hover:text-text-primary'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {(activeTab === 'developers' || activeTab === 'partners') && (
          <CorporateTabContent activeTab={activeTab} />
        )}
        {activeTab === 'partner-requests' && <PartnerRequestsContent />}
        {activeTab === 'partner-management' && <PartnerManagementContent />}
      </div>
    </AdminLayout>
  )
}

// ─── Corporate Members Tab (개발사/파트너) ──────────────────────────
function CorporateTabContent({ activeTab }: { activeTab: 'developers' | 'partners' }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [data, setData] = useState<CorporateMember[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Management modals
  const [banModal, setBanModal] = useState<{ open: boolean; user: CorporateMember | null; reason: string; duration: string }>({
    open: false, user: null, reason: '', duration: '',
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: CorporateMember | null }>({ open: false, user: null })

  const fetchData = useCallback(() => {
    setLoading(true)
    const params: Record<string, unknown> = { page, limit, search: search || undefined, approvalStatus: 'approved' }
    if (activeTab === 'developers') params.companyType = 'developer'
    // 파트너 탭: publisher 타입 또는 다른 비개발사 기업 - 개발사 제외 필터는 별도로 처리
    // 파트너는 companyType에 developer가 없는 기업회원 → API에서 별도 로직 필요
    // 간단히 companyType 없이 전체 승인 기업 조회 후 프론트에서 필터 (또는 그대로 보여줌)

    adminService.getCorporateMembers(params as Parameters<typeof adminService.getCorporateMembers>[0])
      .then(res => { setData((res?.users ?? []) as CorporateMember[]); setTotal(res?.total ?? 0) })
      .catch(() => { setData([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page, limit, search, activeTab])

  useEffect(() => { setPage(1) }, [activeTab])
  useEffect(() => { fetchData() }, [fetchData])

  const handleBan = async () => {
    if (!banModal.user) return
    setSubmitting(true)
    try {
      await adminService.banUser(banModal.user._id, {
        isActive: false,
        banReason: banModal.reason || '관리자에 의해 정지됨',
        bannedUntil: banModal.duration || undefined,
      })
      setBanModal({ open: false, user: null, reason: '', duration: '' })
      fetchData()
    } catch { alert('정지 처리 실패') }
    finally { setSubmitting(false) }
  }

  const handleUnban = async (userId: string) => {
    setSubmitting(true)
    try {
      await adminService.banUser(userId, { isActive: true })
      fetchData()
    } catch { alert('해제 실패') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteModal.user) return
    setSubmitting(true)
    try {
      await adminService.deleteUser(deleteModal.user._id)
      setDeleteModal({ open: false, user: null })
      fetchData()
    } catch { alert('삭제 실패') }
    finally { setSubmitting(false) }
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <>
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="닉네임 / 이메일 / 회사명 검색"
            className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
        </div>
        <span className="text-text-secondary text-sm">{loading ? '로딩 중...' : `총 ${total.toLocaleString()}개사`}</span>
      </div>

      <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-text-secondary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left text-text-secondary font-medium px-4 py-3">번호</th>
                  <th className="text-left text-text-secondary font-medium px-4 py-3">닉네임</th>
                  <th className="text-left text-text-secondary font-medium px-4 py-3">이메일</th>
                  <th className="text-left text-text-secondary font-medium px-4 py-3">회사명</th>
                  <th className="text-left text-text-secondary font-medium px-4 py-3">기업유형</th>
                  <th className="text-left text-text-secondary font-medium px-4 py-3">상태</th>
                  <th className="text-left text-text-secondary font-medium px-4 py-3">등록일</th>
                  <th className="text-left text-text-secondary font-medium px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-text-secondary py-12">데이터가 없습니다</td></tr>
                ) : data.map((m, i) => (
                  <tr key={m._id} className="hover:bg-bg-tertiary/50 transition-colors">
                    <td className="text-text-secondary px-4 py-3">{(page - 1) * limit + i + 1}</td>
                    <td className="text-text-primary px-4 py-3 font-medium">{m.nickname || m.username}</td>
                    <td className="text-text-secondary px-4 py-3">{m.email}</td>
                    <td className="text-text-secondary px-4 py-3">{m.companyInfo?.companyName || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.companyInfo?.companyType?.map((t: string) => (
                          <span key={t} className="text-[10px] bg-bg-tertiary text-text-secondary px-1.5 py-0.5 rounded">{COMPANY_TYPE_LABELS[t] || t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.isActive ? (
                        <span className="text-xs text-accent bg-accent-light px-2 py-0.5 rounded-full">활성</span>
                      ) : (
                        <span className="text-xs text-accent-text bg-accent-light px-2 py-0.5 rounded-full">정지됨</span>
                      )}
                    </td>
                    <td className="text-text-secondary px-4 py-3 text-xs">{new Date(m.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/users-enhanced/${m._id}`}
                          className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> 변경
                        </Link>
                        {m.isActive ? (
                          <button onClick={() => setBanModal({ open: true, user: m, reason: '', duration: '' })}
                            className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 px-2 py-1 rounded flex items-center gap-1">
                            <Ban className="w-3 h-3" /> 중지
                          </button>
                        ) : (
                          <button onClick={() => handleUnban(m._id)} disabled={submitting}
                            className="text-xs text-accent hover:text-accent border border-green-500/30 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50">
                            <Check className="w-3 h-3" /> 해제
                          </button>
                        )}
                        <button onClick={() => setDeleteModal({ open: true, user: m })}
                          className="text-xs text-accent-text hover:text-accent-text border border-accent-muted px-2 py-1 rounded flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> 삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">이전</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
            return p <= totalPages ? (
              <button key={p} onClick={() => setPage(p)}
                className={`px-3 py-1.5 text-sm rounded-lg ${page === p ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'}`}>{p}</button>
            ) : null
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">다음</button>
        </div>
      )}

      {/* Ban Modal */}
      {banModal.open && banModal.user && (
        <ConfirmModal
          title="기업회원 중지"
          message={`${banModal.user.nickname || banModal.user.username} (${banModal.user.companyInfo?.companyName || ''})을 정지하시겠습니까?`}
          confirmLabel="정지"
          confirmColor="bg-red-600 hover:bg-red-700"
          onClose={() => setBanModal({ open: false, user: null, reason: '', duration: '' })}
          onConfirm={handleBan}
          loading={submitting}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-text-secondary text-xs mb-1">정지 사유</label>
              <textarea value={banModal.reason} onChange={e => setBanModal(prev => ({ ...prev, reason: e.target.value }))}
                rows={2} className="w-full bg-bg-tertiary border border-line text-text-primary rounded px-3 py-2 text-sm" placeholder="정지 사유..." />
            </div>
            <div>
              <label className="block text-text-secondary text-xs mb-1">정지 종료일 (선택)</label>
              <input type="date" value={banModal.duration} onChange={e => setBanModal(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full bg-bg-tertiary border border-line text-text-primary rounded px-3 py-2 text-sm" />
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* Delete Modal */}
      {deleteModal.open && deleteModal.user && (
        <ConfirmModal
          title="기업회원 삭제"
          message={`${deleteModal.user.nickname || deleteModal.user.username} (${deleteModal.user.companyInfo?.companyName || ''})을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          confirmColor="bg-red-600 hover:bg-red-700"
          onClose={() => setDeleteModal({ open: false, user: null })}
          onConfirm={handleDelete}
          loading={submitting}
        />
      )}
    </>
  )
}

// ─── Partner Requests Tab ───────────────────────────────────────────
function PartnerRequestsContent() {
  const [requests, setRequests] = useState<PartnerApplication[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selected, setSelected] = useState<PartnerApplication | null>(null)

  const FILTER_TABS = [
    { value: 'all', label: '전체' }, { value: 'pending', label: '심사 중' },
    { value: 'approved', label: '선정됨' }, { value: 'rejected', label: '거절됨' },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: 20 }
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await partnerService.admin.getRequests(params as Parameters<typeof partnerService.admin.getRequests>[0])
      setRequests(data.requests || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 1)
    } catch { /* noop */ } finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  const handleApprove = async () => {
    if (!selected) return; setActionLoading(true)
    try { await partnerService.admin.updateRequest(selected._id, { status: 'approved' }); setSelected(null); load() }
    catch { /* noop */ } finally { setActionLoading(false) }
  }
  const handleReject = async (reason: string) => {
    if (!selected) return; setActionLoading(true)
    try { await partnerService.admin.updateRequest(selected._id, { status: 'rejected', rejectedReason: reason }); setSelected(null); load() }
    catch { /* noop */ } finally { setActionLoading(false) }
  }

  return (
    <>
      <div className="flex gap-1 bg-bg-tertiary/50 border border-line rounded-lg p-1 w-fit">
        {FILTER_TABS.map(tab => (
          <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={`px-3 py-1 rounded text-xs transition-colors ${statusFilter === tab.value ? 'bg-accent-light text-accent-text border border-accent-muted' : 'text-text-secondary hover:text-text-primary'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-sm">총 {total}건</span>
      </div>

      <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">#</th>
              <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">사용자명</th>
              <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">이메일</th>
              <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">신청일</th>
              <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">상태</th>
              <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-text-secondary" /></td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-text-secondary text-sm">신청 내역이 없습니다</td></tr>
            ) : requests.map((r, idx) => (
              <tr key={r._id} className="border-b border-line/50 hover:bg-bg-tertiary/30">
                <td className="px-4 py-3 text-text-secondary text-sm">{(page - 1) * 20 + idx + 1}</td>
                <td className="px-4 py-3 text-text-primary text-sm font-medium">{r.userId?.username ?? '-'}</td>
                <td className="px-4 py-3 text-text-secondary text-sm">{r.userId?.email ?? '-'}</td>
                <td className="px-4 py-3 text-text-secondary text-sm">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${PARTNER_STATUS_MAP[r.status]?.cls}`}>{PARTNER_STATUS_MAP[r.status]?.label}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(r)} className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded">상세</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">이전</button>
          <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">다음</button>
        </div>
      )}

      {selected && <PartnerRequestDetailModal partner={selected} onClose={() => setSelected(null)} onApprove={handleApprove} onReject={handleReject} loading={actionLoading} />}
    </>
  )
}

// ─── Partner Info Management Tab (참조: PartnerDirectoryPage + PartnerMatchingProfilePage) ──
const SORT_OPTIONS = [
  { value: 'latest', label: '가입일 (최신순)' },
  { value: 'oldest', label: '가입일 (오래된순)' },
  { value: 'popular', label: '인기순 (게시글)' },
]

const AVAILABILITY_LABEL: Record<string, { text: string; color: string }> = {
  available: { text: '즉시 가능', color: 'text-green-400' },
  busy: { text: '협의 필요', color: 'text-yellow-400' },
  unavailable: { text: '불가', color: 'text-red-400' },
}

function PartnerManagementContent() {
  const [partners, setPartners] = useState<PartnerApplication[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sort, setSort] = useState('latest')
  const [selected, setSelected] = useState<PartnerApplication | null>(null)
  const [editTarget, setEditTarget] = useState<PartnerApplication | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await partnerService.admin.getPartners({ page, limit: 12, search, sort })
      setPartners(data.partners || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 1)
    } catch { /* noop */ } finally { setLoading(false) }
  }, [page, search, sort])

  useEffect(() => { load() }, [load])

  const handleSearch = () => { setSearch(searchInput); setPage(1) }

  const handleStatusChange = async (status: 'approved' | 'suspended') => {
    if (!selected) return; setActionLoading(true)
    try { await partnerService.admin.updatePartnerStatus(selected._id, status); setSelected(null); load() }
    catch { /* noop */ } finally { setActionLoading(false) }
  }

  const handleToggleVisibility = async (partner: PartnerApplication) => {
    try {
      await partnerService.admin.togglePartnerVisibility(partner._id)
      load()
    } catch { /* noop */ }
  }

  const handleSaveProfile = async (data: Record<string, unknown>) => {
    if (!editTarget) return; setActionLoading(true)
    try {
      await partnerService.admin.updatePartnerProfile(editTarget._id, data)
      setEditTarget(null); load()
    } catch { /* noop */ } finally { setActionLoading(false) }
  }

  return (
    <>
      {/* Header: 파트너 채널 스타일 */}
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-cyan-400" />
        <p className="text-text-secondary text-sm">기업회원 파트너 프로필 정보를 관리합니다 · 총 {total}명의 파트너</p>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder="파트너 이름 검색..."
              className="pl-9 pr-3 py-2 bg-bg-tertiary border border-line rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 w-64" />
          </div>
          <button onClick={handleSearch} className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg">검색</button>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}
            className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Partner Cards Grid — PartnerDirectoryPage 카드 스타일 + MiniHome 기업정보 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
        </div>
      ) : partners.length === 0 ? (
        <div className="bg-bg-secondary border border-line rounded-xl p-16 text-center">
          <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">등록된 파트너가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map(p => {
            const username = p.userId?.username ?? '?'
            const mh = p.minihome
            const isPublic = mh ? mh.isPublic !== false : p.isProfilePublic !== false
            const companyName = mh?.companyName || p.userId?.companyInfo?.companyName || ''
            const avail = AVAILABILITY_LABEL[mh?.availability || '']

            return (
              <div key={p._id} className="bg-bg-secondary border border-line rounded-xl p-5 hover:border-cyan-500/40 transition-all group">
                {/* Header: Avatar + Name (PartnerDirectoryPage 스타일) */}
                <div className="flex items-start gap-4 mb-3">
                  {p.profileImage ? (
                    <Image src={p.profileImage} alt={username} width={56} height={56}
                      className="w-14 h-14 rounded-full object-cover border border-line flex-shrink-0" unoptimized />
                  ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-cyan-600 text-white font-bold text-xl flex-shrink-0">
                      {username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-text-primary font-semibold text-sm group-hover:text-cyan-300 transition-colors truncate">{username}</p>
                      {mh?.isVerified && (
                        <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${PARTNER_STATUS_MAP[p.status]?.cls}`}>
                        {PARTNER_STATUS_MAP[p.status]?.label ?? p.status}
                      </span>
                    </div>
                    {companyName && <p className="text-text-muted text-xs truncate">{companyName}</p>}
                    <p className="text-text-secondary text-xs mt-0.5 line-clamp-2 leading-relaxed">
                      {p.slogan || '파트너 채널'}
                    </p>
                  </div>
                </div>

                {/* 전문 분야 (PartnerMatchingProfilePage 스타일) */}
                {mh?.expertiseArea && mh.expertiseArea.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {mh.expertiseArea.map(area => (
                      <span key={area} className="bg-accent-light text-accent-text px-2 py-0.5 rounded text-xs font-medium">{area}</span>
                    ))}
                  </div>
                )}

                {/* 주제 태그 */}
                {p.selectedTopics?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.selectedTopics.slice(0, 3).map(topic => (
                      <span key={topic} className="bg-cyan-600/20 text-cyan-400 text-xs px-1.5 py-0.5 rounded">{topic}</span>
                    ))}
                    {p.selectedTopics.length > 3 && (
                      <span className="text-text-muted text-xs">+{p.selectedTopics.length - 3}</span>
                    )}
                  </div>
                )}

                {/* 기업 프로필 요약 (PartnerMatchingProfilePage 사이드바 스타일) */}
                <div className="bg-bg-tertiary/30 border border-line/50 rounded-lg p-3 mb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted flex items-center gap-1"><FileText className="w-3 h-3" /> 게시글</span>
                    <span className="text-text-primary font-medium">{p.postCount}개</span>
                  </div>
                  {mh && (
                    <>
                      {(mh.rating > 0 || mh.reviewCount > 0) && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted flex items-center gap-1"><Star className="w-3 h-3" /> 평점</span>
                          <span className="text-text-primary font-medium">{mh.rating || 0} ({mh.reviewCount || 0}개 리뷰)</span>
                        </div>
                      )}
                      {mh.completedProjectCount > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">완료 프로젝트</span>
                          <span className="text-text-primary font-medium">{mh.completedProjectCount}건</span>
                        </div>
                      )}
                      {mh.location && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted flex items-center gap-1"><MapPin className="w-3 h-3" /> 위치</span>
                          <span className="text-text-primary">{mh.location}</span>
                        </div>
                      )}
                      {avail && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">작업 가능</span>
                          <span className={`font-medium ${avail.color}`}>{avail.text}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">가입일</span>
                    <span className="text-text-primary">{p.approvedAt ? new Date(p.approvedAt).toLocaleDateString('ko-KR') : p.createdAt ? new Date(p.createdAt).toLocaleDateString('ko-KR') : '-'}</span>
                  </div>
                </div>

                {/* 연락처 미니 표시 */}
                {mh && (mh.contactEmail || mh.contactPhone || mh.website) && (
                  <div className="flex items-center gap-3 text-text-muted text-xs mb-3">
                    {mh.contactEmail && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 flex-shrink-0" /> {mh.contactEmail}</span>}
                    {mh.contactPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 flex-shrink-0" /> {mh.contactPhone}</span>}
                    {mh.website && <a href={mh.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"><Globe className="w-3 h-3" /></a>}
                  </div>
                )}

                {/* 공개/비공개 토글 */}
                <div className="flex items-center justify-between mb-3 p-2 bg-bg-tertiary/50 rounded-lg">
                  <span className="text-text-secondary text-xs">프로필 공개</span>
                  <button onClick={() => handleToggleVisibility(p)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${
                      isPublic
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                        : 'bg-bg-muted/40 text-text-muted border border-line'
                    }`}>
                    {isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {isPublic ? '공개' : '비공개'}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelected(p)}
                    className="flex-1 text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-2 py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <Ban className="w-3 h-3" /> 상태
                  </button>
                  <button onClick={() => setEditTarget(p)}
                    className="flex-1 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 px-2 py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <Edit3 className="w-3 h-3" /> 편집
                  </button>
                  <Link href={`/admin/partner-posts/${p._id}`}
                    className="text-xs text-text-secondary hover:text-text-primary border border-line/50 px-2 py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <FileText className="w-3 h-3" /> 글
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination — PartnerDirectoryPage 스타일 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? 'bg-cyan-600 text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}>
                {p}
              </button>
            )
          })}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {selected && <PartnerManageDetailModal partner={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} loading={actionLoading} />}
      {editTarget && <PartnerProfileEditModal partner={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveProfile} loading={actionLoading} />}
    </>
  )
}
