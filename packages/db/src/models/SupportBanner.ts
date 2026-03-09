import mongoose, { Schema, Document } from 'mongoose'

export interface ISupportBanner extends Document {
  category: 'offseason' | 'season' | 'recruit'
  title: string
  imageUrl: string
  linkUrl: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const supportBannerSchema = new Schema<ISupportBanner>(
  {
    category: { type: String, enum: ['offseason', 'season', 'recruit'], required: true },
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

supportBannerSchema.index({ category: 1, sortOrder: 1 })

export default mongoose.model<ISupportBanner>('SupportBanner', supportBannerSchema)
