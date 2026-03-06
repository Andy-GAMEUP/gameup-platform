export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Payment {
  id: string
  userId: string
  gameId: string
  amount: number
  currency: string
  status: PaymentStatus
  pgOrderId?: string
  pgTransactionId?: string
  pgProvider: string
  metadata?: {
    gameName?: string
    itemName?: string
  }
  createdAt: Date
}
