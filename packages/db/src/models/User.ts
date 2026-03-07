import mongoose, { Schema, Document } from 'mongoose'

interface IOAuthProvider {
  provider: 'kakao' | 'naver'
  providerId: string
  connectedAt: Date
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
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IUser>('User', userSchema)
