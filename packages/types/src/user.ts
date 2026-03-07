export type UserRole = 'player' | 'developer' | 'admin'
export type MemberType = 'individual' | 'corporate'
export type UserStatus = 'active' | 'suspended' | 'withdrawn' | 'deleted'

export interface OAuthProvider {
  provider: 'kakao' | 'naver'
  providerId: string
  connectedAt: Date
}

export interface CompanyInfo {
  companyName: string
  businessNumber?: string
  businessLicense?: string
  phone?: string
  email?: string
  logo?: string
  employeeCount?: string
  companyType?: ('developer' | 'publisher')[]
  homepage?: string
  contactName?: string
  contactEmail?: string
  introduction?: string
  isApproved: boolean
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
