import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  username: string
  password: string
  role: 'player' | 'developer' | 'admin'
  memberType: 'individual' | 'corporate'
  status: 'active' | 'suspended' | 'withdrawn' | 'deleted'
  bio?: string
  profileImage?: string
  level: number
  activityScore: number
  points: number
  favoriteGenres: string[]
  oauthProviders: { provider: string; providerId: string; connectedAt: Date }[]
  companyInfo?: {
    companyName: string
    businessNumber?: string
    businessLicense?: string
    phone?: string
    email?: string
    logo?: string
    employeeCount?: string
    companyType?: string[]
    homepage?: string
    contactName?: string
    contactEmail?: string
    introduction?: string
    isApproved: boolean
  }
  isActive: boolean
  bannedUntil?: Date
  banReason?: string
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['player', 'developer', 'admin'], default: 'player' },
    memberType: { type: String, enum: ['individual', 'corporate'], default: 'individual' },
    status: { type: String, enum: ['active', 'suspended', 'withdrawn', 'deleted'], default: 'active' },
    bio: String,
    profileImage: String,
    level: { type: Number, default: 1 },
    activityScore: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    favoriteGenres: [String],
    oauthProviders: [{
      provider: String,
      providerId: String,
      connectedAt: { type: Date, default: Date.now },
    }],
    companyInfo: {
      companyName: String,
      businessNumber: String,
      businessLicense: String,
      phone: String,
      email: String,
      logo: String,
      employeeCount: String,
      companyType: [String],
      homepage: String,
      contactName: String,
      contactEmail: String,
      introduction: String,
      isApproved: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    bannedUntil: Date,
    banReason: String,
  },
  { timestamps: true }
)

export const UserModel = mongoose.model<IUser>('User', userSchema)
