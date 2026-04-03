import mongoose, { Schema, Document } from 'mongoose'

export interface IUserSession extends Document {
  userId: mongoose.Types.ObjectId
  sessionStart: Date
  sessionEnd?: Date
  duration: number
  pointsEarned: number
  type: 'web' | 'game'
  gameId?: mongoose.Types.ObjectId
  lastHeartbeat: Date
  isActive: boolean
  createdAt: Date
}

const userSessionSchema = new Schema<IUserSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    sessionEnd: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ['web', 'game'],
      default: 'web',
    },
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

userSessionSchema.index({ userId: 1, isActive: 1 })
userSessionSchema.index({ userId: 1, type: 1, createdAt: -1 })

export default mongoose.model<IUserSession>('UserSession', userSessionSchema)
