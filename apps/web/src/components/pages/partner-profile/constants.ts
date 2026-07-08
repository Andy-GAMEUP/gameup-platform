export const PROJECT_STATUS_LABELS: Record<string, string> = {
  recruiting: '모집중', matched: '매칭성공', unmatched: '매칭보류',
}
export const PROJECT_STATUS_COLORS: Record<string, string> = {
  recruiting: 'text-emerald-600',
  matched: 'text-blue-600',
  unmatched: 'text-amber-600',
}
export const OPERATION_STATUS_LABELS: Record<string, string> = {
  active: '진행 중', closed: '마감',
}
export const OPERATION_STATUS_COLORS: Record<string, string> = {
  active: 'bg-violet-600 text-white border-violet-600',
  closed: 'bg-slate-100 text-slate-400 border-slate-200',
}
export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: '검토중', approved: '승인됨', rejected: '거절됨', 'on-hold': '보류중',
}
export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  'on-hold': 'bg-gray-100 text-gray-600 border-gray-200',
}

export const COMPANY_TYPE_LABELS: Record<string, string> = {
  developer: '개발사', publisher: '퍼블리셔', game_solution: '게임솔루션',
  game_service: '게임서비스', operations: '운영', qa: 'QA', marketing: '마케팅',
  development: '개발', original_art: '원화', other: '기타',
}

export interface PartnerUser {
  _id: string
  username: string
  role: string
  profileImage?: string
  memberType?: string
  companyInfo?: { companyName?: string; companyType?: string[]; employeeCount?: number; description?: string }
  contactPerson?: { name?: string; email?: string; phone?: string }
  createdAt?: string
}

export interface TeamMember {
  userId: { _id: string; username: string; role: string; profileImage?: string }
  addedAt: string
}

export interface PartnerData {
  _id: string
  userId: PartnerUser
  status: string
  slogan: string
  introduction: string
  activityPlan: string
  externalUrl: string
  selectedTopics: string[]
  profileImage: string
  postCount: number
  isProfilePublic: boolean
  approvedAt?: string
  createdAt: string
  teamMembers?: TeamMember[]
}
