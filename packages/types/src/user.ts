export type UserRole = 'player' | 'developer' | 'admin'
export type MemberType = 'individual' | 'corporate'
export type UserStatus = 'active' | 'suspended' | 'withdrawn' | 'deleted'
export type CompanyType = 'developer' | 'publisher' | 'game_solution' | 'game_service' | 'operations' | 'qa' | 'marketing' | 'other'
export type CorporateApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface OAuthProvider {
  provider: 'kakao' | 'naver'
  providerId: string
  connectedAt: Date
}

export interface ContactPerson {
  name?: string
  email?: string
  phone?: string
}

export interface CompanyInfo {
  companyName: string
  businessNumber?: string
  businessLicense?: string
  phone?: string
  email?: string
  logo?: string
  employeeCount?: string
  companyType?: CompanyType[]
  homepage?: string
  contactName?: string
  contactEmail?: string
  introduction?: string
  isApproved: boolean
  approvalStatus?: CorporateApprovalStatus
  rejectedReason?: string
}

export interface User {
  id: string
  email: string
  username: string
  password?: string
  role: UserRole
  memberType?: MemberType
  status?: UserStatus
  bio?: string
  favoriteGenres?: string[]
  profileImage?: string
  level?: number
  activityScore?: number
  points?: number
  oauthProviders?: OAuthProvider[]
  companyInfo?: CompanyInfo
  contactPerson?: ContactPerson
  isActive?: boolean
  bannedUntil?: Date
  banReason?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
}
