import mongoose, { Schema, Document } from 'mongoose'

export interface IGameRanking extends Document {
  zone: 'beta' | 'live'
  gameId: mongoose.Types.ObjectId
  rank: number
  score: number
  metrics: Record<string, number>
  computedAt: Date
}

const gameRankingSchema = new Schema<IGameRanking>(
  {
    zone: { type: String, enum: ['beta', 'live'], required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    rank: { type: Number, required: true },
    score: { type: Number, required: true },
    metrics: { type: Schema.Types.Mixed, default: {} },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

gameRankingSchema.index({ zone: 1, rank: 1 })
gameRankingSchema.index({ zone: 1, gameId: 1 }, { unique: true })

export default mongoose.model<IGameRanking>('GameRanking', gameRankingSchema)
