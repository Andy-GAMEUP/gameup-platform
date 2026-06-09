import mongoose, { Schema, Document } from 'mongoose'

interface IOAuthProvider {
  provider: 'kakao' | 'naver'
  providerId: string
  connectedAt: Date
}

interface ICompanyInfo {
  companyName?: string
  phone?: string
  companyEmail?: string
  employeeCount?: number
  businessNumber?: string
  companyLogo?: string
  businessLicense?: string
  companyType?: string[]
  homepageUrl?: string
  isApproved?: boolean
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  rejectedReason?: string
  description?: string
}

interface IContactPerson {
  name?: string
  email?: string
  phone?: string
}

export interface IUser extends Document {
  email: string
  username: string
  password?: string
  role: 'developer' | 'player' | 'admin'
  adminLevel?: 'super' | 'normal' | 'monitor'
  bio?: string
  favoriteGenres?: string[]
  isActive: boolean
  bannedAt?: Date
  bannedUntil?: Date
  banReason?: string
  banScope?: string[]
  appeal?: { content: string; createdAt: Date }
  history?: { type: string; content: string; createdAt: Date }[]
  oauthProviders?: IOAuthProvider[]
  memberType?: 'individual' | 'corporate'
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  approvalRejectedReason?: string
  approvedAt?: Date
  profileImage?: string
  level?: number
  activityScore?: number
  points?: number
  companyInfo?: ICompanyInfo
  contactPerson?: IContactPerson
  adminMemo?: string
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String
    },
    role: {
      type: String,
      enum: ['developer', 'player', 'admin'],
      default: 'player'
    },
    adminLevel: {
      type: String,
      enum: ['super', 'normal', 'monitor'],
    },
    bio: {
      type: String,
      default: '',
      maxlength: 200
    },
    favoriteGenres: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    },
    bannedAt: {
      type: Date
    },
    bannedUntil: {
      type: Date
    },
    banReason: {
      type: String
    },
    banScope: {
      type: [String],
      default: undefined,
    },
    appeal: {
      content: { type: String },
      createdAt: { type: Date },
    },
    history: [{
      type: { type: String, required: true },
      content: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
    }],
    oauthProviders: [{
      provider: { type: String, enum: ['kakao', 'naver'] },
      providerId: { type: String },
      connectedAt: { type: Date, default: Date.now },
    }],
    memberType: {
      type: String,
      enum: ['individual', 'corporate'],
      default: 'individual',
    },
    profileImage: { type: String },
    level: {
      type: Number,
      default: 1,
    },
    activityScore: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    companyInfo: {
      companyName: { type: String },
      phone: { type: String },
      companyEmail: { type: String },
      employeeCount: { type: Number },
      businessNumber: { type: String },
      companyLogo: { type: String },
      businessLicense: { type: String },
      companyType: { type: [String], enum: ['developer', 'publisher', 'game_solution', 'game_service', 'operations', 'qa', 'marketing', 'other'] },
      homepageUrl: { type: String },
      isApproved: { type: Boolean, default: false },
      approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectedReason: { type: String },
      description: { type: String },
    },
    contactPerson: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvalRejectedReason: { type: String },
    approvedAt: { type: Date },
    adminMemo: { type: String },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true
  }
)

userSchema.index({ role: 1, isActive: 1 })
userSchema.index({ memberType: 1 })
userSchema.index({ approvalStatus: 1 })

export default mongoose.model<IUser>('User', userSchema)
