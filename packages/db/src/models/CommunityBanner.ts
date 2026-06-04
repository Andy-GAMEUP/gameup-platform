import mongoose, { Schema, Document } from 'mongoose'

export interface ICommunityBanner extends Document {
  imageUrl: string
  linkUrl?: string
  title?: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const communityBannerSchema = new Schema<ICommunityBanner>(
  {
    imageUrl: { type: String, required: true },
    linkUrl:  { type: String, default: '' },
    title:    { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

communityBannerSchema.index({ sortOrder: 1 })

export default mongoose.model<ICommunityBanner>('CommunityBanner', communityBannerSchema)
