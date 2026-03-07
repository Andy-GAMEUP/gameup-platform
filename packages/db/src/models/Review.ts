import mongoose, { Schema, Document } from 'mongoose'

export interface IReview extends Document {
  userId: mongoose.Types.ObjectId
  gameId: mongoose.Types.ObjectId
  rating: number
  title: string
  content: string
  feedbackType: 'general' | 'bug' | 'suggestion' | 'praise'
  bugSeverity?: 'low' | 'medium' | 'high' | 'critical'
  isVerifiedTester: boolean
  helpfulCount: number
  helpfulUsers: mongoose.Types.ObjectId[]
  isBlocked: boolean
  blockReason?: string
  blockedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const reviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    content: { type: String, required: true, maxlength: 2000 },
    feedbackType: {
      type: String,
      enum: ['general', 'bug', 'suggestion', 'praise'],
      default: 'general'
    },
    bugSeverity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    isVerifiedTester: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    helpfulUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String },
    blockedAt: { type: Date }
  },
  { timestamps: true }
)

reviewSchema.index({ userId: 1, gameId: 1 }, { unique: true })
reviewSchema.index({ gameId: 1 })
reviewSchema.index({ gameId: 1, isBlocked: 1, createdAt: -1 })

export default mongoose.model<IReview>('Review', reviewSchema)
