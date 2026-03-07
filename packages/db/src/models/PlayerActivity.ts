import mongoose, { Schema, Document } from 'mongoose'

export interface IPlayerActivity extends Document {
  userId: mongoose.Types.ObjectId
  gameId: mongoose.Types.ObjectId
  type: 'play' | 'review' | 'favorite' | 'unfavorite' | 'helpful'
  sessionDuration?: number
  createdAt: Date
}

const playerActivitySchema = new Schema<IPlayerActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    type: {
      type: String,
      enum: ['play', 'review', 'favorite', 'unfavorite', 'helpful'],
      required: true
    },
    sessionDuration: { type: Number }
  },
  { timestamps: true }
)

playerActivitySchema.index({ userId: 1, createdAt: -1 })
playerActivitySchema.index({ gameId: 1, type: 1, createdAt: -1 })

export default mongoose.model<IPlayerActivity>('PlayerActivity', playerActivitySchema)
