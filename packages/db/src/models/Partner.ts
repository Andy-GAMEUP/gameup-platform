import mongoose, { Schema, Document } from 'mongoose'

export interface ITeamMember {
  userId: mongoose.Types.ObjectId
  addedAt: Date
}

export interface IPartnerPortfolioItem {
  title: string
  description: string
  thumbnailUrl: string
  workScopes: string[]
  platforms: string[]
  technologies: string[]
  isPublic: boolean
}

export interface IPartnerHistoryItem {
  year: string
  month: string
  description: string
}

export interface IPartnerSkillItem {
  name: string
  experienceLevel: string
}

export interface IPartner extends Document {
  userId: mongoose.Types.ObjectId
  status: 'pending' | 'approved' | 'suspended' | 'rejected'
  teamMembers: ITeamMember[]
  slogan: string
  introduction: string
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
  // 파트너 매칭 확장 필드 (미니홈에서 흡수)
  displayNameOverride: string
  coverImage: string
  website: string
  tags: string[]
  keywords: string[]
  hourlyRate: string
  location: string
  isVerified: boolean
  rating: number
  reviewCount: number
  portfolio: IPartnerPortfolioItem[]
  history: IPartnerHistoryItem[]
  skills: IPartnerSkillItem[]
  contactEmail: string
  contactPhone: string
  representativeGameId: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const partnerPortfolioItemSchema = new Schema<IPartnerPortfolioItem>(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    thumbnailUrl: { type: String, default: '' },
    workScopes: [{ type: String }],
    platforms: [{ type: String }],
    technologies: [{ type: String }],
    isPublic: { type: Boolean, default: true },
  },
  { _id: true }
)

const partnerHistoryItemSchema = new Schema<IPartnerHistoryItem>(
  {
    year: { type: String, required: true, maxlength: 10 },
    month: { type: String, default: '', maxlength: 10 },
    description: { type: String, required: true, maxlength: 500 },
  },
  { _id: true }
)

const partnerSkillItemSchema = new Schema<IPartnerSkillItem>(
  {
    name: { type: String, required: true, maxlength: 100 },
    experienceLevel: { type: String, default: '' },
  },
  { _id: true }
)

const partnerSchema = new Schema<IPartner>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['pending', 'approved', 'suspended', 'rejected'], default: 'pending' },
    slogan: { type: String, default: '', maxlength: 200 },
    introduction: { type: String, default: '', maxlength: 10000 },
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
    // 파트너 매칭 확장 필드 (미니홈에서 흡수)
    displayNameOverride: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    website: { type: String, default: '' },
    tags: [{ type: String }],
    keywords: [{ type: String }],
    hourlyRate: { type: String, default: '' },
    location: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    portfolio: [partnerPortfolioItemSchema],
    history: [partnerHistoryItemSchema],
    skills: [partnerSkillItemSchema],
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    representativeGameId: { type: Schema.Types.ObjectId, ref: 'MiniHomeGame', default: null },
  },
  { timestamps: true }
)

partnerSchema.index({ status: 1, createdAt: -1 })
partnerSchema.index({ isProfilePublic: 1, isVerified: -1, rating: -1 })

export default mongoose.model<IPartner>('Partner', partnerSchema)
