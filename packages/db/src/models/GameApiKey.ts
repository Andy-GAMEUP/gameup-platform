import mongoose, { Schema, Document } from 'mongoose'

export interface IGameApiKey extends Document {
  gameId: mongoose.Types.ObjectId
  developerId: mongoose.Types.ObjectId
  keyHash: string
  prefix: string
  name: string
  isActive: boolean
  lastUsedAt?: Date
  expiresAt?: Date
  createdAt: Date
}

const gameApiKeySchema = new Schema<IGameApiKey>(
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
    keyHash: {
      type: String,
      required: true,
    },
    prefix: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      default: 'Default',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

gameApiKeySchema.index({ gameId: 1 })
gameApiKeySchema.index({ prefix: 1 }, { unique: true })

export default mongoose.model<IGameApiKey>('GameApiKey', gameApiKeySchema)
