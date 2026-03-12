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
  bio?: string
  favoriteGenres?: string[]
  isActive: boolean
  bannedUntil?: Date
  banReason?: string
  oauthProviders?: IOAuthProvider[]
  memberType?: 'individual' | 'corporate'
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
    bannedUntil: {
      type: Date
    },
    banReason: {
      type: String
    },
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
    adminMemo: { type: String },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IUser>('User', userSchema)
