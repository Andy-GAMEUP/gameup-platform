import mongoose, { Document, Schema } from 'mongoose'

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId
  gameId: mongoose.Types.ObjectId
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  pgOrderId: string
  pgTransactionId: string
  pgProvider: string
  metadata: {
    gameName?: string
    itemName?: string
  }
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>({
  userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  gameId:          { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  amount:          { type: Number, required: true },
  currency:        { type: String, default: 'KRW' },
  status:          { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  pgOrderId:       { type: String, default: '' },
  pgTransactionId: { type: String, default: '' },
  pgProvider:      { type: String, default: 'none' },
  metadata: {
    gameName: String,
    itemName: String,
  }
}, { timestamps: true })

PaymentSchema.index({ userId: 1, createdAt: -1 })
PaymentSchema.index({ status: 1 })
PaymentSchema.index({ pgOrderId: 1 })

export default mongoose.model<IPayment>('Payment', PaymentSchema)
