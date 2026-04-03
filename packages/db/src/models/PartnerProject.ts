import mongoose, { Schema, Document } from 'mongoose'

export interface IMilestone {
  phase: string
  period: string
  description: string
}

export interface IPartnerProject extends Document {
  ownerId: mongoose.Types.ObjectId
  title: string
  description: string
  detailedDescription: string
  category: string
  status: 'draft' | 'recruiting' | 'ongoing' | 'completed' | 'cancelled'
  budget: string
  budgetMin: string
  budgetMax: string
  duration: string
  location: string
  startDate: Date
  endDate: Date
  requiredSkills: string[]
  requirements: string[]
  milestones: IMilestone[]
  applicationDeadline: Date
  applicantCount: number
  createdAt: Date
  updatedAt: Date
}

const milestoneSchema = new Schema<IMilestone>(
  {
    phase: { type: String, required: true, maxlength: 100 },
    period: { type: String, default: '' },
    description: { type: String, default: '', maxlength: 1000 },
  },
  { _id: true }
)

const partnerProjectSchema = new Schema<IPartnerProject>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    detailedDescription: { type: String, default: '', maxlength: 10000 },
    category: {
      type: String,
      enum: ['웹 개발', '앱 개발', '디자인', '마케팅', 'QA/테스트', '번역/현지화', '웹퍼블리싱', '서버/인프라', '컨설팅', '기타'],
      default: '기타',
    },
    status: {
      type: String,
      enum: ['draft', 'recruiting', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
    },
    budget: { type: String, default: '' },
    budgetMin: { type: String, default: '' },
    budgetMax: { type: String, default: '' },
    duration: { type: String, default: '' },
    location: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    requiredSkills: [{ type: String }],
    requirements: [{ type: String }],
    milestones: [milestoneSchema],
    applicationDeadline: { type: Date },
    applicantCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

partnerProjectSchema.index({ ownerId: 1, status: 1 })
partnerProjectSchema.index({ status: 1, category: 1, createdAt: -1 })
partnerProjectSchema.index({ applicationDeadline: 1 })

export default mongoose.model<IPartnerProject>('PartnerProject', partnerProjectSchema)
