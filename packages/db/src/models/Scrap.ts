import mongoose, { Schema, Document } from 'mongoose'

export type ScrapType = 'game' | 'community' | 'partner' | 'minihome' | 'solution'

export interface IScrap extends Document {
  userId: mongoose.Types.ObjectId
  targetId: mongoose.Types.ObjectId
  targetType: ScrapType
  createdAt: Date
}

const scrapSchema = new Schema<IScrap>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ['game', 'community', 'partner', 'minihome', 'solution'], required: true },
  },
  { timestamps: true }
)

scrapSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true })
scrapSchema.index({ userId: 1, targetType: 1, createdAt: -1 })

export default mongoose.model<IScrap>('Scrap', scrapSchema)
