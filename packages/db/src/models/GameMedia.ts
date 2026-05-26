import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGameMedia extends Document {
  gameId: Types.ObjectId
  developerId: Types.ObjectId
  type: 'screenshot' | 'video'
  title: string
  url: string
  order: number
  createdAt: Date
  updatedAt: Date
}

const GameMediaSchema = new Schema<IGameMedia>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    developerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['screenshot', 'video'], required: true },
    title: { type: String, required: true, maxlength: 200 },
    url: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

GameMediaSchema.index({ gameId: 1, type: 1, order: 1 })

export default mongoose.model<IGameMedia>('GameMedia', GameMediaSchema)
