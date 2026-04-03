import mongoose, { Schema, Document } from 'mongoose'

export interface IPortfolioItem {
  title: string
  description: string
  imageUrl: string
  technologies: string[]
  results: string[]
  clientName: string
  duration: string
  completedAt: Date
}

export interface ICertification {
  name: string
  issuedAt: string
}

export interface IWorkExperience {
  title: string
  description: string
  period: string
}

export interface IMiniHome extends Document {
  userId: mongoose.Types.ObjectId
  companyName: string
  introduction: string
  profileImage: string
  coverImage: string
  website: string
  tags: string[]
  keywords: string[]
  isPublic: boolean
  isRecommended: boolean
  representativeGameId: mongoose.Types.ObjectId | null
  // 파트너 매칭 확장 필드
  expertiseArea: string[]
  skills: string[]
  hourlyRate: string
  availability: 'available' | 'busy' | 'unavailable'
  location: string
  isVerified: boolean
  rating: number
  reviewCount: number
  completedProjectCount: number
  portfolio: IPortfolioItem[]
  certifications: ICertification[]
  workExperience: IWorkExperience[]
  contactEmail: string
  contactPhone: string
  createdAt: Date
  updatedAt: Date
}

const portfolioItemSchema = new Schema<IPortfolioItem>(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    imageUrl: { type: String, default: '' },
    technologies: [{ type: String }],
    results: [{ type: String }],
    clientName: { type: String, default: '' },
    duration: { type: String, default: '' },
    completedAt: { type: Date },
  },
  { _id: true }
)

const certificationSchema = new Schema<ICertification>(
  {
    name: { type: String, required: true, maxlength: 200 },
    issuedAt: { type: String, default: '' },
  },
  { _id: true }
)

const workExperienceSchema = new Schema<IWorkExperience>(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    period: { type: String, default: '' },
  },
  { _id: true }
)

const miniHomeSchema = new Schema<IMiniHome>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, maxlength: 100 },
    introduction: { type: String, default: '', maxlength: 2000 },
    profileImage: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    website: { type: String, default: '' },
    tags: [{ type: String }],
    keywords: [{ type: String }],
    isPublic: { type: Boolean, default: true },
    isRecommended: { type: Boolean, default: false },
    representativeGameId: { type: Schema.Types.ObjectId, ref: 'MiniHomeGame', default: null },
    // 파트너 매칭 확장 필드
    expertiseArea: [{ type: String }],
    skills: [{ type: String }],
    hourlyRate: { type: String, default: '' },
    availability: { type: String, enum: ['available', 'busy', 'unavailable'], default: 'available' },
    location: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    completedProjectCount: { type: Number, default: 0 },
    portfolio: [portfolioItemSchema],
    certifications: [certificationSchema],
    workExperience: [workExperienceSchema],
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
  },
  { timestamps: true }
)

miniHomeSchema.index({ userId: 1 }, { unique: true })
miniHomeSchema.index({ isPublic: 1, isRecommended: -1, createdAt: -1 })
miniHomeSchema.index({ expertiseArea: 1, availability: 1, rating: -1 })
miniHomeSchema.index({ isPublic: 1, isVerified: -1, rating: -1 })

export default mongoose.model<IMiniHome>('MiniHome', miniHomeSchema)
