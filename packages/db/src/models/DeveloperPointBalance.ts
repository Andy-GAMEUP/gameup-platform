import mongoose, { Schema, Document } from 'mongoose'

export interface IDeveloperPointBalance extends Document {
  developerId: mongoose.Types.ObjectId
  totalPurchased: number
  totalUsed: number
  balance: number
  lastPurchasedAt?: Date
  lowBalanceNotifiedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const developerPointBalanceSchema = new Schema<IDeveloperPointBalance>(
  {
    developerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalPurchased: {
      type: Number,
      default: 0,
    },
    totalUsed: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    lastPurchasedAt: {
      type: Date,
    },
    lowBalanceNotifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IDeveloperPointBalance>('DeveloperPointBalance', developerPointBalanceSchema)
