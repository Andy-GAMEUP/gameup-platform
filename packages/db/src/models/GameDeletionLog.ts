import mongoose, { Schema, Document } from 'mongoose'

export interface IGameDeletionLog extends Document {
  gameId: mongoose.Types.ObjectId
  gameTitle: string
  gameGenre?: string
  developerId: mongoose.Types.ObjectId
  developerUsername?: string
  deletedBy: mongoose.Types.ObjectId
  deletedByUsername?: string
  deletedByEmail?: string
  deletedByRole?: string
  reason: string
  ipAddress?: string
  userAgent?: string
  gameSnapshot?: Record<string, unknown>
  deletedAt: Date
}

const gameDeletionLogSchema = new Schema<IGameDeletionLog>(
  {
    gameId: { type: Schema.Types.ObjectId, required: true, index: true },
    gameTitle: { type: String, required: true },
    gameGenre: { type: String },
    developerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    developerUsername: { type: String },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deletedByUsername: { type: String },
    deletedByEmail: { type: String },
    deletedByRole: { type: String },
    reason: { type: String, required: true, trim: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    gameSnapshot: { type: Schema.Types.Mixed },
    deletedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
)

gameDeletionLogSchema.index({ deletedAt: -1 })

export default mongoose.model<IGameDeletionLog>('GameDeletionLog', gameDeletionLogSchema)
