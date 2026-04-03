import mongoose, { Schema, Document } from 'mongoose'
import type { GamePointType } from './GamePointPolicy'

export interface IGamePointLog extends Document {
  gameId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: GamePointType
  amount: number
  metadata?: Record<string, unknown>
  apiKeyUsed?: string
  createdAt: Date
}

const gamePointLogSchema = new Schema<IGamePointLog>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'game_account_create',
        'game_daily_login',
        'game_play_time',
        'game_purchase',
        'game_event_participate',
        'game_ranking',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    apiKeyUsed: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

gamePointLogSchema.index({ gameId: 1, userId: 1, type: 1, createdAt: -1 })
gamePointLogSchema.index({ gameId: 1, createdAt: -1 })
// 게임 계정 생성 중복 방지
gamePointLogSchema.index(
  { gameId: 1, userId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'game_account_create' } }
)

export default mongoose.model<IGamePointLog>('GamePointLog', gamePointLogSchema)
