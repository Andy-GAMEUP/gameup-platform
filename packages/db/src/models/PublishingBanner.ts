import mongoose, { Schema, Document } from 'mongoose'

export interface IPublishingBanner extends Document {
  publishingType: 'hms' | 'hk'
  title: string
  imageUrl: string
  linkUrl: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const publishingBannerSchema = new Schema<IPublishingBanner>(
  {
    publishingType: { type: String, enum: ['hms', 'hk'], required: true },
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

publishingBannerSchema.index({ publishingType: 1, sortOrder: 1 })

export default mongoose.model<IPublishingBanner>('PublishingBanner', publishingBannerSchema)
