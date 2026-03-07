export type GameStatus = 'draft' | 'beta' | 'published' | 'archived'
export type ApprovalStatus = 'pending' | 'review' | 'approved' | 'rejected'
export type MonetizationType = 'free' | 'ad' | 'paid' | 'freemium'
export type ServiceType = 'beta' | 'live'

export interface Game {
  id: string
  _id?: string
  title: string
  description: string
  developerId: string
  thumbnail?: string
  gameFile?: string
  genre?: string
  price: number
  isPaid: boolean
  monetization?: MonetizationType
  serviceType?: ServiceType | string
  playCount: number
  rating: number
  feedbackCount?: number
  status: GameStatus
  approvalStatus?: ApprovalStatus
  adminNote?: string
  rejectionReason?: string
  platform?: string
  engine?: string
  tags?: string[]
  startDate?: Date | string
  endDate?: Date | string
  maxTesters?: number
  testType?: string
  requirements?: string
  trailer?: string
  website?: string
  discord?: string
  notes?: string
  testers?: number
  betaEndDate?: Date
  suspendReason?: string
  suspendedAt?: Date
  archivedAt?: Date
  archiveReason?: string
  approvedAt?: Date
  approvedBy?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface Feedback {
  id: string
  userId: string
  gameId: string
  rating: number
  comment: string
  createdAt: Date
}

export interface Review {
  id: string
  userId: string
  gameId: string
  rating: number
  title?: string
  content: string
  feedbackType: 'general' | 'bug' | 'suggestion' | 'praise'
  bugSeverity?: 'low' | 'medium' | 'high' | 'critical'
  isBlocked: boolean
  helpfulCount: number
  createdAt: Date
  updatedAt: Date
}
