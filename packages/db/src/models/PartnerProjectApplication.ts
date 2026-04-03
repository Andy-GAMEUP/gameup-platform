import mongoose, { Schema, Document } from 'mongoose'

export interface IPartnerProjectApplication extends Document {
  projectId: mongoose.Types.ObjectId
  applicantId: mongoose.Types.ObjectId
  applicantName: string
  email: string
  phone: string
  experience: string
  proposedBudget: string
  portfolioUrl: string
  proposal: string
  attachments: string[]
  status: 'pending' | 'approved' | 'on-hold' | 'rejected'
  createdAt: Date
  updatedAt: Date
}

const partnerProjectApplicationSchema = new Schema<IPartnerProjectApplication>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'PartnerProject', required: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    applicantName: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    experience: { type: String, default: '' },
    proposedBudget: { type: String, default: '' },
    portfolioUrl: { type: String, default: '' },
    proposal: { type: String, default: '', maxlength: 10000 },
    attachments: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'on-hold', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

partnerProjectApplicationSchema.index({ projectId: 1, applicantId: 1 }, { unique: true })
partnerProjectApplicationSchema.index({ projectId: 1, status: 1 })
partnerProjectApplicationSchema.index({ applicantId: 1, createdAt: -1 })

export default mongoose.model<IPartnerProjectApplication>(
  'PartnerProjectApplication',
  partnerProjectApplicationSchema
)
