import mongoose, { Schema, Document } from 'mongoose'

export type DeveloperPointTransactionType =
  | 'purchase'      // 포인트 구매
  | 'consume'       // 포인트 사용 (플레이어 지급)
  | 'refund'        // 환불
  | 'admin_grant'   // 관리자 수동 지급
  | 'admin_deduct'  // 관리자 수동 차감

export interface IDeveloperPointTransaction extends Document {
  developerId: mongoose.Types.ObjectId
  type: DeveloperPointTransactionType
  amount: number
  balance: number
  description: string
  relatedGameId?: mongoose.Types.ObjectId
  relatedUserId?: mongoose.Types.ObjectId
  pointPolicyType?: string
  paymentId?: string
  packageId?: mongoose.Types.ObjectId
  createdAt: Date
}

const developerPointTransactionSchema = new Schema<IDeveloperPointTransaction>(
  {
    developerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'consume', 'refund', 'admin_grant', 'admin_deduct'],
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
    description: {
      type: String,
      required: true,
    },
    relatedGameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
    },
    relatedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    pointPolicyType: {
      type: String,
    },
    paymentId: {
      type: String,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'PointPackage',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

developerPointTransactionSchema.index({ developerId: 1, createdAt: -1 })
developerPointTransactionSchema.index({ developerId: 1, type: 1 })

export default mongoose.model<IDeveloperPointTransaction>('DeveloperPointTransaction', developerPointTransactionSchema)
