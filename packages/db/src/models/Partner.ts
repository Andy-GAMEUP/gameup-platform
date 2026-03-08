import mongoose, { Schema, Document } from 'mongoose'

export interface IPartner extends Document {
  userId: mongoose.Types.ObjectId
  status: 'pending' | 'approved' | 'suspended' | 'rejected'
  slogan: string
  introduction: string
  activityPlan: string
  externalUrl: string
  selectedTopics: string[]
  profileImage: string
  postCount: number
  approvedAt?: Date
  rejectedReason?: string
  createdAt: Date
  updatedAt: Date
}

const partnerSchema = new Schema<IPartner>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['pending', 'approved', 'suspended', 'rejected'], default: 'pending' },
    slogan: { type: String, default: '', maxlength: 200 },
    introduction: { type: String, required: true, maxlength: 2000 },
    activityPlan: { type: String, required: true, maxlength: 2000 },
    externalUrl: { type: String, default: '' },
    selectedTopics: [{ type: String }],
    profileImage: { type: String, default: '' },
    postCount: { type: Number, default: 0 },
    approvedAt: { type: Date },
    rejectedReason: { type: String, default: '' },
  },
  { timestamps: true }
)

partnerSchema.index({ status: 1, createdAt: -1 })
partnerSchema.index({ userId: 1 }, { unique: true })

export default mongoose.model<IPartner>('Partner', partnerSchema)
