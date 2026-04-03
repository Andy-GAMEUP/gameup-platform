'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Home, Save, Plus, Edit3, Trash2, Loader2, ExternalLink, Globe, Tag, FileText,
  CheckCircle, Phone, Mail, MapPin, Clock, Briefcase, Award, X,
} from 'lucide-react'
import minihomeService from '@/services/minihomeService'
import type { MiniHome, MiniHomeGame, PortfolioItem, CertificationItem, WorkExperienceItem } from '@/services/minihomeService'

const EXPERTISE_OPTIONS = ['게임개발', '퍼블리싱', '게임솔루션', 'QA/테스팅', '마케팅', '로컬라이제이션', '사운드', '아트/그래픽']
const AVAILABILITY_OPTIONS: { value: 'available' | 'busy' | 'unavailable'; label: string; color: string }[] = [
  { value: 'available', label: '즉시 가능', color: 'bg-accent-light text-accent border-accent-muted' },
  { value: 'busy', label: '협의 필요', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  { value: 'unavailable', label: '불가', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
]

type ManageTab = 'basic' | 'portfolio' | 'experience' | 'contact' | 'games'

const emptyPortfolio: PortfolioItem = {
  title: '', description: '', imageUrl: '', technologies: [], results: [],
  clientName: '', duration: '',
}

export default function MiniHomeManagementPage() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<ManageTab>('basic')
  const [successMsg, setSuccessMsg] = useState('')

  // Basic info form
  const [formData, setFormData] = useState({
    companyName: '',
    introduction: '',
    website: '',
    tags: '',
    keywords: '',
    isPublic: true,
    expertiseArea: [] as string[],
    skills: '',
    hourlyRate: '',
    availability: 'available' as 'available' | 'busy' | 'unavailable',
    location: '',
    contactEmail: '',
    contactPhone: '',
  })

  // Portfolio
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioItem | null>(null)
  const [portfolioTech, setPortfolioTech] = useState('')
  const [portfolioResult, setPortfolioResult] = useState('')

  // Certifications
  const [certifications, setCertifications] = useState<CertificationItem[]>([])
  const [newCert, setNewCert] = useState({ name: '', issuedAt: '' })

  // Work Experience
  const [workExperience, setWorkExperience] = useState<WorkExperienceItem[]>([])
  const [newExp, setNewExp] = useState({ title: '', description: '', period: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['myMinihome'],
    queryFn: () => minihomeService.getMyMinihome(),
  })

  const minihome = data?.minihome
  const games = data?.games || []

  useEffect(() => {
    if (minihome) {
      setFormData({
        companyName: minihome.companyName || '',
        introduction: minihome.introduction || '',
        website: minihome.website || '',
        tags: (minihome.tags || []).join(', '),
        keywords: (minihome.keywords || []).join(', '),
        isPublic: minihome.isPublic ?? true,
        expertiseArea: minihome.expertiseArea || [],
        skills: (minihome.skills || []).join(', '),
        hourlyRate: minihome.hourlyRate || '',
        availability: minihome.availability || 'available',
        location: minihome.location || '',
        contactEmail: minihome.contactEmail || '',
        contactPhone: minihome.contactPhone || '',
      })
      setPortfolioItems(minihome.portfolio || [])
      setCertifications(minihome.certifications || [])
      setWorkExperience(minihome.workExperience || [])
    }
  }, [minihome])

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => minihomeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMinihome'] })
      setSuccessMsg('미니홈이 생성되었습니다!')
      setIsEditing(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => minihomeService.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMinihome'] })
      setSuccessMsg('미니홈이 업데이트되었습니다!')
      setIsEditing(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    },
  })

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      companyName: formData.companyName,
      introduction: formData.introduction,
      website: formData.website,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      isPublic: formData.isPublic,
      expertiseArea: formData.expertiseArea,
      skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      hourlyRate: formData.hourlyRate,
      availability: formData.availability,
      location: formData.location,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      portfolio: portfolioItems,
      certifications,
      workExperience,
    }
    if (minihome) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const toggleExpertise = (area: string) => {
    setFormData(prev => ({
      ...prev,
      expertiseArea: prev.expertiseArea.includes(area)
        ? prev.expertiseArea.filter(a => a !== area)
        : [...prev.expertiseArea, area],
    }))
  }

  // Portfolio helpers
  const addPortfolioItem = () => {
    if (!editingPortfolio?.title) return
    setPortfolioItems(prev => [...prev, { ...editingPortfolio }])
    setEditingPortfolio(null)
    setPortfolioTech('')
    setPortfolioResult('')
  }

  const removePortfolioItem = (index: number) => {
    setPortfolioItems(prev => prev.filter((_, i) => i !== index))
  }

  const addCert = () => {
    if (!newCert.name) return
    setCertifications(prev => [...prev, { ...newCert }])
    setNewCert({ name: '', issuedAt: '' })
  }

  const removeCert = (index: number) => {
    setCertifications(prev => prev.filter((_, i) => i !== index))
  }

  const addExp = () => {
    if (!newExp.title) return
    setWorkExperience(prev => [...prev, { ...newExp }])
    setNewExp({ title: '', description: '', period: '' })
  }

  const removeExp = (index: number) => {
    setWorkExperience(prev => prev.filter((_, i) => i !== index))
  }

  // Game management
  const [showGameForm, setShowGameForm] = useState(false)
  const [gameForm, setGameForm] = useState({ title: '', genre: '', description: '', platforms: '' })

  const addGameMutation = useMutation({
    mutationFn: (data: { title: string; genre: string; description: string; platforms?: string[] }) =>
      minihomeService.addGame(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMinihome'] })
      setShowGameForm(false)
      setGameForm({ title: '', genre: '', description: '', platforms: '' })
    },
  })

  const removeGameMutation = useMutation({
    mutationFn: (gameId: string) => minihomeService.removeGame(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMinihome'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">미니홈 관리</h2>
          <p className="text-text-secondary">파트너 프로필을 관리하세요</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
        </div>
      </div>
    )
  }

  // No minihome yet
  if (!minihome && !isEditing) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">미니홈 관리</h2>
          <p className="text-text-secondary">파트너 프로필을 생성하고 편집하세요</p>
        </div>
        <div className="bg-bg-secondary border border-line rounded-xl p-12 text-center">
          <Home className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">미니홈이 아직 생성되지 않았습니다</h3>
          <p className="text-text-secondary mb-6">미니홈을 생성하여 회사를 소개하고 파트너 매칭에 노출하세요</p>
          <button
            onClick={() => setIsEditing(true)}
            className="px-6 py-3 bg-accent hover:bg-accent-hover text-text-primary rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            미니홈 생성하기
          </button>
        </div>
      </div>
    )
  }

  const TABS: { key: ManageTab; label: string; icon: React.ReactNode }[] = [
    { key: 'basic', label: '기본 정보', icon: <FileText className="w-4 h-4" /> },
    { key: 'portfolio', label: '포트폴리오', icon: <Briefcase className="w-4 h-4" /> },
    { key: 'experience', label: '경력/자격증', icon: <Award className="w-4 h-4" /> },
    { key: 'contact', label: '연락처/설정', icon: <Phone className="w-4 h-4" /> },
    { key: 'games', label: '게임 관리', icon: <Home className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">미니홈 관리</h2>
          <p className="text-text-secondary">파트너 프로필을 관리하세요</p>
        </div>
        <div className="flex items-center gap-3">
          {minihome && !isEditing && (
            <>
              <a
                href={`/partner/${minihome._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-line text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors inline-flex items-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                프로필 보기
              </a>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-text-primary rounded-lg font-medium transition-colors inline-flex items-center gap-2 text-sm"
              >
                <Edit3 className="w-4 h-4" />
                수정하기
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-line text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors text-sm"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.companyName || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-bg-tertiary disabled:cursor-not-allowed text-text-primary rounded-lg font-medium transition-colors inline-flex items-center gap-2 text-sm"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 저장중...</>
                ) : (
                  <><Save className="w-4 h-4" /> 저장하기</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-accent-light border border-accent-muted text-accent px-4 py-3 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-green-400 text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* -- 기본 정보 탭 -- */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {isEditing ? (
            <>
              <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-5">
                <h3 className="text-lg font-semibold text-text-primary">기본 정보</h3>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">회사명 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="회사명을 입력해주세요"
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">회사 소개</label>
                  <textarea
                    value={formData.introduction}
                    onChange={(e) => setFormData(prev => ({ ...prev, introduction: e.target.value }))}
                    placeholder="회사에 대한 소개를 작성해주세요"
                    rows={4}
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">전문 분야</label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERTISE_OPTIONS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleExpertise(area)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                          formData.expertiseArea.includes(area)
                            ? 'bg-blue-600 text-text-primary border-blue-500'
                            : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border-line hover:border-line'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">주요 스킬 <span className="text-xs text-text-muted">(쉼표로 구분)</span></label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                    placeholder="Unity, Unreal Engine, React, Node.js"
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      <Globe className="w-4 h-4 inline mr-1" /> 웹사이트
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://example.com"
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" /> 위치
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="서울특별시 강남구"
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">단가 기준</label>
                    <input
                      type="text"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      placeholder="시급 80,000원 / 프로젝트 협의"
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">작업 가능 여부</label>
                    <div className="flex gap-2">
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, availability: opt.value }))}
                          className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                            formData.availability === opt.value ? opt.color : 'bg-bg-tertiary text-text-secondary border-line'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      <Tag className="w-4 h-4 inline mr-1" /> 태그 <span className="text-xs text-text-muted">(쉼표 구분)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="게임개발, RPG, Unity"
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">키워드 <span className="text-xs text-text-muted">(쉼표 구분)</span></label>
                    <input
                      type="text"
                      value={formData.keywords}
                      onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                      placeholder="모바일, PC, 인디"
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : minihome && (
            <div className="space-y-6">
              {/* Profile Overview - View Mode */}
              <div className="bg-bg-secondary border border-line rounded-xl p-6">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-text-primary text-2xl font-bold flex-shrink-0">
                    {minihome.companyName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-text-primary">{minihome.companyName}</h3>
                      {minihome.isVerified && (
                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">인증됨</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${minihome.isPublic ? 'bg-accent-light text-accent' : 'bg-red-500/20 text-red-400'}`}>
                        {minihome.isPublic ? '공개' : '비공개'}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm mb-3">{minihome.introduction || '소개가 없습니다'}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(minihome.expertiseArea || []).map((area, i) => (
                        <span key={i} className="bg-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded text-xs font-medium">{area}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="text-center p-3 bg-bg-tertiary/50 rounded-lg">
                        <p className="text-xl font-bold text-yellow-400">★ {minihome.rating || 0}</p>
                        <p className="text-xs text-text-muted mt-1">{minihome.reviewCount || 0}개 리뷰</p>
                      </div>
                      <div className="text-center p-3 bg-bg-tertiary/50 rounded-lg">
                        <p className="text-xl font-bold text-accent">{minihome.completedProjectCount || 0}</p>
                        <p className="text-xs text-text-muted mt-1">완료 프로젝트</p>
                      </div>
                      <div className="text-center p-3 bg-bg-tertiary/50 rounded-lg">
                        <p className="text-sm font-medium text-text-primary">{minihome.hourlyRate || '협의'}</p>
                        <p className="text-xs text-text-muted mt-1">단가 기준</p>
                      </div>
                      <div className="text-center p-3 bg-bg-tertiary/50 rounded-lg">
                        <p className={`text-sm font-medium ${
                          minihome.availability === 'available' ? 'text-accent' :
                          minihome.availability === 'busy' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {AVAILABILITY_OPTIONS.find(o => o.value === minihome.availability)?.label || '-'}
                        </p>
                        <p className="text-xs text-text-muted mt-1">가용 상태</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {(minihome.skills || []).length > 0 && (
                <div className="bg-bg-secondary border border-line rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">주요 스킬</h3>
                  <div className="flex flex-wrap gap-2">
                    {minihome.skills.map((skill, i) => (
                      <span key={i} className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Info */}
              <div className="bg-bg-secondary border border-line rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">상세 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: <Globe className="w-4 h-4" />, label: '웹사이트', value: minihome.website || '-' },
                    { icon: <MapPin className="w-4 h-4" />, label: '위치', value: minihome.location || '-' },
                    { icon: <Mail className="w-4 h-4" />, label: '이메일', value: minihome.contactEmail || '-' },
                    { icon: <Phone className="w-4 h-4" />, label: '전화번호', value: minihome.contactPhone || '-' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-text-muted">{item.icon}</span>
                      <div>
                        <p className="text-xs text-text-muted">{item.label}</p>
                        <p className="text-sm text-text-primary">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -- 포트폴리오 탭 -- */}
      {activeTab === 'portfolio' && (
        <div className="space-y-4">
          {isEditing && (
            <div className="bg-bg-secondary border border-line rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">포트폴리오 추가</h3>
              </div>
              {editingPortfolio ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingPortfolio.title}
                    onChange={(e) => setEditingPortfolio({ ...editingPortfolio, title: e.target.value })}
                    placeholder="프로젝트 제목"
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <textarea
                    value={editingPortfolio.description}
                    onChange={(e) => setEditingPortfolio({ ...editingPortfolio, description: e.target.value })}
                    placeholder="프로젝트 설명"
                    rows={3}
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={editingPortfolio.clientName}
                      onChange={(e) => setEditingPortfolio({ ...editingPortfolio, clientName: e.target.value })}
                      placeholder="클라이언트명"
                      className="bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      value={editingPortfolio.duration}
                      onChange={(e) => setEditingPortfolio({ ...editingPortfolio, duration: e.target.value })}
                      placeholder="기간 (예: 6개월)"
                      className="bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      value={editingPortfolio.imageUrl}
                      onChange={(e) => setEditingPortfolio({ ...editingPortfolio, imageUrl: e.target.value })}
                      placeholder="이미지 URL"
                      className="bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  {/* Technologies */}
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">사용 기술</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={portfolioTech}
                        onChange={(e) => setPortfolioTech(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && portfolioTech.trim()) {
                            e.preventDefault()
                            setEditingPortfolio({
                              ...editingPortfolio,
                              technologies: [...editingPortfolio.technologies, portfolioTech.trim()],
                            })
                            setPortfolioTech('')
                          }
                        }}
                        placeholder="기술명 입력 후 Enter"
                        className="flex-1 bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {editingPortfolio.technologies.map((tech, i) => (
                        <span key={i} className="bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded text-xs flex items-center gap-1">
                          {tech}
                          <button onClick={() => setEditingPortfolio({
                            ...editingPortfolio,
                            technologies: editingPortfolio.technologies.filter((_, j) => j !== i),
                          })} className="text-text-muted hover:text-red-400"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Results */}
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">주요 성과</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={portfolioResult}
                        onChange={(e) => setPortfolioResult(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && portfolioResult.trim()) {
                            e.preventDefault()
                            setEditingPortfolio({
                              ...editingPortfolio,
                              results: [...editingPortfolio.results, portfolioResult.trim()],
                            })
                            setPortfolioResult('')
                          }
                        }}
                        placeholder="성과 입력 후 Enter"
                        className="flex-1 bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div className="space-y-1 mt-2">
                      {editingPortfolio.results.map((result, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                          <span className="text-accent">✓</span> {result}
                          <button onClick={() => setEditingPortfolio({
                            ...editingPortfolio,
                            results: editingPortfolio.results.filter((_, j) => j !== i),
                          })} className="text-text-muted hover:text-red-400 ml-auto"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setEditingPortfolio(null)}
                      className="px-3 py-2 border border-line text-text-secondary rounded-lg text-sm hover:bg-bg-tertiary">
                      취소
                    </button>
                    <button onClick={addPortfolioItem} disabled={!editingPortfolio.title}
                      className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:bg-bg-tertiary text-text-primary rounded-lg text-sm font-medium inline-flex items-center gap-1">
                      <Plus className="w-4 h-4" /> 추가
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingPortfolio({ ...emptyPortfolio })}
                  className="w-full py-3 border-2 border-dashed border-line rounded-lg text-text-secondary hover:text-text-primary hover:border-line transition-colors inline-flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> 포트폴리오 항목 추가
                </button>
              )}
            </div>
          )}

          {/* Portfolio List */}
          {portfolioItems.length > 0 ? portfolioItems.map((item, index) => (
            <div key={item._id || index} className="bg-bg-secondary border border-line rounded-xl p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {item.imageUrl && (
                  <div className="md:col-span-1">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-lg" />
                  </div>
                )}
                <div className={item.imageUrl ? 'md:col-span-2' : 'md:col-span-3'}>
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-semibold text-text-primary mb-2">{item.title}</h3>
                    {isEditing && (
                      <button onClick={() => removePortfolioItem(index)}
                        className="text-text-muted hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
                    {item.clientName && <span>{item.clientName}</span>}
                    {item.duration && <span><Clock className="w-3 h-3 inline mr-1" />{item.duration}</span>}
                  </div>
                  <p className="text-text-secondary mb-4">{item.description}</p>
                  {item.technologies?.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-text-secondary mb-2">사용 기술</div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.technologies.map((tech, i) => (
                          <span key={i} className="bg-bg-tertiary/50 text-text-secondary px-2 py-0.5 rounded text-xs">{tech}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.results?.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-text-secondary mb-2">주요 성과</div>
                      <ul className="space-y-1">
                        {item.results.map((result, i) => (
                          <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-accent mt-0.5">✓</span> {result}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 text-text-muted">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>등록된 포트폴리오가 없습니다</p>
            </div>
          )}
        </div>
      )}

      {/* -- 경력/자격증 탭 -- */}
      {activeTab === 'experience' && (
        <div className="space-y-6">
          {/* Work Experience */}
          <div className="bg-bg-secondary border border-line rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">경력 사항</h3>

            {isEditing && (
              <div className="bg-bg-tertiary/50 border border-line rounded-lg p-4 mb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newExp.title}
                    onChange={(e) => setNewExp(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="경력 제목 (예: 모바일 RPG 개발)"
                    className="bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <input
                    type="text"
                    value={newExp.period}
                    onChange={(e) => setNewExp(prev => ({ ...prev, period: e.target.value }))}
                    placeholder="기간 (예: 2020.01 - 2023.06)"
                    className="bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <textarea
                  value={newExp.description}
                  onChange={(e) => setNewExp(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="경력 설명"
                  rows={2}
                  className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
                <button onClick={addExp} disabled={!newExp.title}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:bg-bg-tertiary text-text-primary rounded-lg text-sm font-medium inline-flex items-center gap-1">
                  <Plus className="w-4 h-4" /> 추가
                </button>
              </div>
            )}

            {workExperience.length > 0 ? (
              <div className="space-y-4">
                {workExperience.map((exp, index) => (
                  <div key={exp._id || index} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-text-primary">{exp.title}</h4>
                        {exp.period && <span className="bg-bg-tertiary/50 text-text-secondary px-2 py-0.5 rounded text-xs">{exp.period}</span>}
                        {isEditing && (
                          <button onClick={() => removeExp(index)} className="text-text-muted hover:text-red-400 ml-auto">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-text-secondary text-sm">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted text-sm">등록된 경력이 없습니다</div>
            )}
          </div>

          {/* Certifications */}
          <div className="bg-bg-secondary border border-line rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">자격증</h3>

            {isEditing && (
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={newCert.name}
                  onChange={(e) => setNewCert(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="자격증명"
                  className="flex-1 bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <input
                  type="text"
                  value={newCert.issuedAt}
                  onChange={(e) => setNewCert(prev => ({ ...prev, issuedAt: e.target.value }))}
                  placeholder="취득일 (예: 2023.06)"
                  className="w-40 bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button onClick={addCert} disabled={!newCert.name}
                  className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:bg-bg-tertiary text-text-primary rounded-lg text-sm font-medium inline-flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {certifications.length > 0 ? (
              <div className="space-y-3">
                {certifications.map((cert, index) => (
                  <div key={cert._id || index} className="flex items-center justify-between p-4 bg-bg-tertiary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-blue-400" />
                      <span className="font-medium text-text-primary">{cert.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-text-secondary">{cert.issuedAt}</span>
                      {isEditing && (
                        <button onClick={() => removeCert(index)} className="text-text-muted hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted text-sm">등록된 자격증이 없습니다</div>
            )}
          </div>
        </div>
      )}

      {/* -- 연락처/설정 탭 -- */}
      {activeTab === 'contact' && (
        <div className="space-y-6">
          <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-5">
            <h3 className="text-lg font-semibold text-text-primary">연락처 정보</h3>

            {isEditing ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      <Mail className="w-4 h-4 inline mr-1" /> 연락 이메일
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="contact@company.com"
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      <Phone className="w-4 h-4 inline mr-1" /> 연락 전화번호
                    </label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="02-1234-5678"
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="accent-green-500 w-4 h-4"
                    />
                    <span className="text-sm text-text-secondary">프로필 공개 설정</span>
                  </label>
                  <span className="text-xs text-text-muted">공개 시 파트너 디렉토리에 노출됩니다</span>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {[
                  { icon: <Mail className="w-5 h-5 text-text-secondary" />, label: '이메일', value: minihome?.contactEmail || '-' },
                  { icon: <Phone className="w-5 h-5 text-text-secondary" />, label: '전화번호', value: minihome?.contactPhone || '-' },
                  { icon: <Globe className="w-5 h-5 text-text-secondary" />, label: '웹사이트', value: minihome?.website || '-' },
                  { icon: <MapPin className="w-5 h-5 text-text-secondary" />, label: '위치', value: minihome?.location || '-' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-bg-tertiary/50 rounded-lg">
                    {item.icon}
                    <div>
                      <p className="text-xs text-text-muted">{item.label}</p>
                      <p className="text-sm font-medium text-text-primary">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- 게임 관리 탭 -- */}
      {activeTab === 'games' && (
        <div className="bg-bg-secondary border border-line rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">등록된 게임</h3>
            <button
              onClick={() => setShowGameForm(true)}
              className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-text-primary rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> 게임 추가
            </button>
          </div>

          {showGameForm && (
            <div className="bg-bg-tertiary border border-line rounded-lg p-4 mb-4 space-y-3">
              <input
                type="text"
                value={gameForm.title}
                onChange={(e) => setGameForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="게임 제목"
                className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={gameForm.genre}
                  onChange={(e) => setGameForm(prev => ({ ...prev, genre: e.target.value }))}
                  placeholder="장르"
                  className="bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <input
                  type="text"
                  value={gameForm.platforms}
                  onChange={(e) => setGameForm(prev => ({ ...prev, platforms: e.target.value }))}
                  placeholder="플랫폼 (쉼표 구분)"
                  className="bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <textarea
                value={gameForm.description}
                onChange={(e) => setGameForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="게임 설명"
                rows={2}
                className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowGameForm(false)}
                  className="px-3 py-1.5 border border-line text-text-secondary rounded-lg text-sm hover:bg-bg-tertiary">
                  취소
                </button>
                <button
                  onClick={() => {
                    if (!gameForm.title) return
                    addGameMutation.mutate({
                      title: gameForm.title,
                      genre: gameForm.genre,
                      description: gameForm.description,
                      platforms: gameForm.platforms ? gameForm.platforms.split(',').map(p => p.trim()).filter(Boolean) : undefined,
                    })
                  }}
                  disabled={!gameForm.title || addGameMutation.isPending}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:bg-bg-tertiary text-text-primary rounded-lg text-sm font-medium inline-flex items-center gap-1"
                >
                  {addGameMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  추가
                </button>
              </div>
            </div>
          )}

          {games.length > 0 ? (
            <div className="space-y-2">
              {games.map((game: MiniHomeGame) => (
                <div key={game._id} className="flex items-center justify-between bg-bg-tertiary rounded-lg px-4 py-3">
                  <div>
                    <p className="text-text-primary font-medium text-sm">{game.title}</p>
                    <p className="text-xs text-text-secondary">{game.genre} {game.platforms?.length > 0 && `· ${game.platforms.join(', ')}`}</p>
                  </div>
                  <button
                    onClick={() => { if (confirm('이 게임을 삭제하시겠습니까?')) removeGameMutation.mutate(game._id) }}
                    className="text-text-muted hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-4">등록된 게임이 없습니다</p>
          )}
        </div>
      )}
    </div>
  )
}
