import mongoose, { Schema, Document } from 'mongoose'
import type { ActivityScoreType } from './ActivityScore'

export interface IPointPolicy extends Document {
  type: ActivityScoreType
  label: string
  description: string
  amount: number
  multiplier?: number
  dailyLimit?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const pointPolicySchema = new Schema<IPointPolicy>(
  {
    type: {
      type: String,
      required: true,
      unique: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      default: 1,
    },
    multiplier: {
      type: Number,
      default: 1,
    },
    dailyLimit: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IPointPolicy>('PointPolicy', pointPolicySchema)
