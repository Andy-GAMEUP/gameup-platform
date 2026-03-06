import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  username: string
  password: string
  role: 'developer' | 'player' | 'admin'
  bio?: string
  favoriteGenres?: string[]
  isActive: boolean
  bannedUntil?: Date
  banReason?: string
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
      type: String,
      required: true
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
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IUser>('User', userSchema)
