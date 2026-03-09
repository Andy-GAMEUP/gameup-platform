import mongoose, { Schema, Document } from 'mongoose'

export type ActivityScoreType =
  | 'post_write'
  | 'comment_write'
  | 'recommend_received'
  | 'recommend_cancelled'
  | 'admin_grant'
  | 'admin_deduct'

export interface IActivityScore extends Document {
  userId: mongoose.Types.ObjectId
  amount: number
  reason: string
  type: ActivityScoreType
  relatedId?: mongoose.Types.ObjectId
  createdAt: Date
}

const activityScoreSchema = new Schema<IActivityScore>(
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
    reason: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'post_write',
        'comment_write',
        'recommend_received',
        'recommend_cancelled',
        'admin_grant',
        'admin_deduct',
      ],
      required: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

activityScoreSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model<IActivityScore>('ActivityScore', activityScoreSchema)
