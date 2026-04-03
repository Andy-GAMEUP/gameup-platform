import mongoose, { Schema, Document } from 'mongoose'

export interface IPartnerReview extends Document {
  reviewerId: mongoose.Types.ObjectId
  targetMinihomeId: mongoose.Types.ObjectId
  projectId: mongoose.Types.ObjectId | null
  rating: number
  content: string
  projectTitle: string
  createdAt: Date
  updatedAt: Date
}

const partnerReviewSchema = new Schema<IPartnerReview>(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetMinihomeId: { type: Schema.Types.ObjectId, ref: 'MiniHome', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'PartnerProject', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    content: { type: String, default: '', maxlength: 5000 },
    projectTitle: { type: String, default: '' },
  },
  { timestamps: true }
)

partnerReviewSchema.index({ targetMinihomeId: 1, createdAt: -1 })
partnerReviewSchema.index({ reviewerId: 1, targetMinihomeId: 1 })

export default mongoose.model<IPartnerReview>('PartnerReview', partnerReviewSchema)
