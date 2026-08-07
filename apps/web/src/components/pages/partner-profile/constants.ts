export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: '검토중', approved: '협의 중', rejected: '거절됨', 'on-hold': '보류중', confirmed: '확정',
}
// 진행 상태 컬럼용 — 배지(배경/테두리) 없이 텍스트 색상만
export const APPLICATION_STATUS_TEXT_COLORS: Record<string, string> = {
  pending: 'text-amber-600', approved: 'text-emerald-600', rejected: 'text-red-500',
  'on-hold': 'text-text-muted', confirmed: 'text-teal-600',
}

export const COMPANY_TYPE_LABELS: Record<string, string> = {
  developer: '개발사', publisher: '퍼블리셔', game_solution: '게임솔루션',
  game_service: '게임서비스', operations: '운영', qa: 'QA', marketing: '마케팅',
  development: '개발', original_art: '원화', other: '기타',
}

// 기업 형태 편집 시 선택 가능한 옵션 (developer는 하위 호환용 플래그일 뿐 선택 항목이 아님)
export const COMPANY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'publisher', label: '퍼블리셔' },
  { value: 'game_solution', label: '게임솔루션' },
  { value: 'game_service', label: '게임서비스' },
  { value: 'operations', label: '운영' },
  { value: 'qa', label: 'QA' },
  { value: 'marketing', label: '마케팅' },
  { value: 'development', label: '개발' },
  { value: 'original_art', label: '원화' },
  { value: 'other', label: '기타' },
]

export interface PartnerUser {
  _id: string
  username: string
  role: string
  profileImage?: string
  memberType?: string
  companyInfo?: { companyName?: string; companyCategory?: string; companyType?: string[] }
  createdAt?: string
}

export interface TeamMember {
  userId: { _id: string; username: string; role: string; profileImage?: string }
  addedAt: string
}

export const PORTFOLIO_WORK_SCOPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'development', label: '개발' },
  { value: 'design', label: '디자인' },
  { value: 'planning', label: '기획' },
  { value: 'art', label: '아트' },
  { value: 'qa', label: 'QA' },
  { value: 'sound', label: '사운드' },
  { value: 'marketing', label: '마케팅' },
  { value: 'operations', label: '운영' },
  { value: 'other', label: '기타' },
]

export const PORTFOLIO_PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: 'web', label: '웹' },
  { value: 'android', label: '안드로이드' },
  { value: 'ios', label: 'iOS' },
  { value: 'pc', label: 'PC 프로그램' },
  { value: 'gameup', label: '게임업' },
  { value: 'other', label: '기타' },
]

export const PORTFOLIO_TECHNOLOGY_MAX = 20

export interface PartnerPortfolioItem {
  _id?: string
  title: string
  description: string
  thumbnailUrl: string
  workScopes: string[]
  platforms: string[]
  technologies: string[]
  isPublic: boolean
}

export interface PartnerHistoryItem {
  _id?: string
  year: string
  month: string
  description: string
}

export const SKILL_EXPERIENCE_LEVEL_OPTIONS: string[] = [
  '1년 미만',
  '1년 이상 3년 미만',
  '3년 이상 5년 미만',
  '5년 이상 10년 미만',
  '10년 이상',
]

export interface PartnerSkillItem {
  _id?: string
  name: string
  experienceLevel: string
}

export interface PartnerGameItem {
  _id: string
  title: string
  genre: string
  description: string
  iconUrl: string
  coverUrl: string
  screenshots: string[]
  platforms: string[]
  status: 'active' | 'inactive'
  sortOrder: number
}

export interface PartnerData {
  _id: string
  userId: PartnerUser
  status: string
  slogan: string
  introduction: string
  externalUrl: string
  selectedTopics: string[]
  profileImage: string
  postCount: number
  isProfilePublic: boolean
  approvedAt?: string
  createdAt: string
  teamMembers?: TeamMember[]
  // 파트너 매칭 확장 필드 (미니홈에서 흡수)
  displayNameOverride: string
  coverImage: string
  website: string
  tags: string[]
  keywords: string[]
  techStack: string[]
  hourlyRate: string
  location: string
  isVerified: boolean
  rating: number
  reviewCount: number
  completedProjectCount: number
  portfolio: PartnerPortfolioItem[]
  history: PartnerHistoryItem[]
  skills: PartnerSkillItem[]
  contactEmail: string
  contactPhone: string
  representativeGameId?: string | null
}
