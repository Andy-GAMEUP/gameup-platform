import mongoose, { Schema, Document } from 'mongoose'

export interface ITeamMember {
  userId: mongoose.Types.ObjectId
  addedAt: Date
}

export interface IPartner extends Document {
  userId: mongoose.Types.ObjectId
  status: 'pending' | 'approved' | 'suspended' | 'rejected'
  teamMembers: ITeamMember[]
  slogan: string
  introduction: string
  activityPlan: string
  externalUrl: string
  selectedTopics: string[]
  profileImage: string
  postCount: number
  isProfilePublic: boolean
  approvedAt?: Date
  rejectedReason?: string
  // 필수 정보
  techStack: string[]
  portfolioUrls: string[]
  availability: 'available' | 'busy' | 'unavailable'
  // 신뢰도
  careerYears?: number
  completedProjectCount: number
  teamSize?: 'individual' | 'team' | 'company'
  genres: string[]
  // 매칭 품질
  preferredProjectSize?: 'small' | 'medium' | 'large'
  contractTypes: string[]
  budgetRange?: string
  availableDuration?: string
  workStyle?: 'remote' | 'onsite' | 'hybrid'
  createdAt: Date
  updatedAt: Date
}

const partnerSchema = new Schema<IPartner>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['pending', 'approved', 'suspended', 'rejected'], default: 'pending' },
    slogan: { type: String, default: '', maxlength: 200 },
    introduction: { type: String, default: '', maxlength: 2000 },
    activityPlan: { type: String, default: '', maxlength: 2000 },
    externalUrl: { type: String, default: '' },
    selectedTopics: [{ type: String }],
    profileImage: { type: String, default: '' },
    postCount: { type: Number, default: 0 },
    isProfilePublic: { type: Boolean, default: true },
    teamMembers: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, addedAt: { type: Date, default: Date.now } }],
    approvedAt: { type: Date },
    rejectedReason: { type: String, default: '' },
    // 필수 정보
    techStack: [{ type: String }],
    portfolioUrls: [{ type: String }],
    availability: { type: String, enum: ['available', 'busy', 'unavailable'], default: 'available' },
    // 신뢰도
    careerYears: { type: Number },
    completedProjectCount: { type: Number, default: 0 },
    teamSize: { type: String, enum: ['individual', 'team', 'company'] },
    genres: [{ type: String }],
    // 매칭 품질
    preferredProjectSize: { type: String, enum: ['small', 'medium', 'large'] },
    contractTypes: [{ type: String }],
    budgetRange: { type: String },
    availableDuration: { type: String },
    workStyle: { type: String, enum: ['remote', 'onsite', 'hybrid'] },
  },
  { timestamps: true }
)

partnerSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model<IPartner>('Partner', partnerSchema)
