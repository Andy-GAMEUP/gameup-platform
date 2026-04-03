import mongoose, { Schema, Document } from 'mongoose'

export interface IEventBanner extends Document {
  title: string
  description: string
  imageUrl: string
  linkUrl: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const eventBannerSchema = new Schema<IEventBanner>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

eventBannerSchema.index({ sortOrder: 1 })

export default mongoose.model<IEventBanner>('EventBanner', eventBannerSchema)
