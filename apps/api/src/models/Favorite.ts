import mongoose, { Schema, Document } from 'mongoose'

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId
  gameId: mongoose.Types.ObjectId
  createdAt: Date
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true }
  },
  { timestamps: true }
)

favoriteSchema.index({ userId: 1, gameId: 1 }, { unique: true })

export default mongoose.model<IFavorite>('Favorite', favoriteSchema)
