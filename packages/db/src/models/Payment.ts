import mongoose, { Schema, Document } from 'mongoose'

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId
  gameId: mongoose.Types.ObjectId
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  pgOrderId?: string
  pgTransactionId?: string
  pgProvider: string
  metadata?: {
    gameName?: string
    itemName?: string
  }
  createdAt: Date
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KRW' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    pgOrderId: String,
    pgTransactionId: String,
    pgProvider: { type: String, default: 'toss' },
    metadata: {
      gameName: String,
      itemName: String,
    },
  },
  { timestamps: true }
)

export const PaymentModel = mongoose.model<IPayment>('Payment', paymentSchema)
