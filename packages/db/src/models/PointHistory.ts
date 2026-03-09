import mongoose, { Schema, Document } from 'mongoose'

export type PointHistoryType =
  | 'admin_grant'
  | 'admin_deduct'
  | 'reward'
  | 'purchase'
  | 'refund'

export interface IPointHistory extends Document {
  userId: mongoose.Types.ObjectId
  amount: number
  balance: number
  reason: string
  type: PointHistoryType
  adminId?: mongoose.Types.ObjectId
  createdAt: Date
}

const pointHistorySchema = new Schema<IPointHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balance: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['admin_grant', 'admin_deduct', 'reward', 'purchase', 'refund'],
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

pointHistorySchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model<IPointHistory>('PointHistory', pointHistorySchema)
