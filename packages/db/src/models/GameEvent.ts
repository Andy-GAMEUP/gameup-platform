import mongoose, { Schema, Document } from 'mongoose'

export type GameEventConditionType = 'attendance' | 'payment' | 'achievement' | 'custom'

export interface IGameEvent extends Document {
  gameId: mongoose.Types.ObjectId
  developerId: mongoose.Types.ObjectId
  title: string
  description: string
  conditionType: GameEventConditionType
  conditionValue: number
  rewardPoints: number
  startDate: Date
  endDate: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IGameEventClaim extends Document {
  eventId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  claimedAt: Date
  pointsAwarded: number
}

const gameEventSchema = new Schema<IGameEvent>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    developerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    conditionType: {
      type: String,
      enum: ['attendance', 'payment', 'achievement', 'custom'],
      required: true,
    },
    conditionValue: {
      type: Number,
      required: true,
    },
    rewardPoints: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

gameEventSchema.index({ gameId: 1, isActive: 1 })
gameEventSchema.index({ startDate: 1, endDate: 1 })

const gameEventClaimSchema = new Schema<IGameEventClaim>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'GameEvent',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    pointsAwarded: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: false,
  }
)

gameEventClaimSchema.index({ eventId: 1, userId: 1 }, { unique: true })

export const GameEventClaimModel = mongoose.model<IGameEventClaim>('GameEventClaim', gameEventClaimSchema)
export default mongoose.model<IGameEvent>('GameEvent', gameEventSchema)
