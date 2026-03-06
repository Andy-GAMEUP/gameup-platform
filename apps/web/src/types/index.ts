export interface User {
  id: string
  email: string
  username: string
  role: 'developer' | 'player' | 'admin'
  bio?: string
  favoriteGenres?: string[]
  createdAt?: Date
  updatedAt?: Date
}

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
  playCount: number
  rating: number
  status: 'draft' | 'beta' | 'published' | 'archived'
  approvalStatus?: 'pending' | 'review' | 'approved' | 'rejected'
  monetization?: 'free' | 'paid' | 'freemium'
  serviceType?: string
  platform?: string
  engine?: string
  tags?: string[]
  startDate?: string
  endDate?: string
  maxTesters?: number
  testType?: string
  requirements?: string
  trailer?: string
  website?: string
  discord?: string
  notes?: string
  rejectionReason?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface Payment {
  id: string
  userId: string
  gameId: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  paymentMethod: string
  transactionId: string
  createdAt: Date
}

export interface Feedback {
  id: string
  userId: string
  gameId: string
  rating: number
  comment: string
  createdAt: Date
}
