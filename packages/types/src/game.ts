export type GameStatus = 'draft' | 'beta' | 'published' | 'archived'
export type ApprovalStatus = 'pending' | 'review' | 'approved' | 'rejected'
export type MonetizationType = 'free' | 'ad' | 'paid'
export type ServiceType = 'beta' | 'live'

export interface Game {
  id: string
  title: string
  description: string
  developerId: string
  thumbnail?: string
  gameFile: string
  genre?: string
  price: number
  isPaid: boolean
  monetization: MonetizationType
  serviceType: ServiceType
  playCount: number
  rating: number
  feedbackCount: number
  status: GameStatus
  approvalStatus: ApprovalStatus
  adminNote?: string
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
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
