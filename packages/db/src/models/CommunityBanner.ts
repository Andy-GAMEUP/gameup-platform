import mongoose, { Schema, Document } from 'mongoose'

export interface IBannerDailyStat {
  date: string  // YYYY-MM-DD
  impressions: number
  clicks: number
  edits: number
}

export interface ICommunityBanner extends Document {
  imageUrl: string
  linkUrl?: string
  title?: string
  sortOrder: number
  isActive: boolean
  position: 'community' | 'main' | 'event' | 'newgame'
  dailyStats: IBannerDailyStat[]
  createdAt: Date
  updatedAt: Date
}

const dailyStatSchema = new Schema<IBannerDailyStat>(
  {
    date:        { type: String, required: true },
    impressions: { type: Number, default: 0 },
    clicks:      { type: Number, default: 0 },
    edits:       { type: Number, default: 0 },
  },
  { _id: false }
)

const communityBannerSchema = new Schema<ICommunityBanner>(
  {
    imageUrl:   { type: String, required: true },
    linkUrl:    { type: String, default: '' },
    title:      { type: String, default: '' },
    sortOrder:  { type: Number, default: 0 },
    isActive:   { type: Boolean, default: true },
    position:   { type: String, enum: ['community', 'main', 'event', 'newgame'], default: 'community' },
    dailyStats: { type: [dailyStatSchema], default: [] },
  },
  { timestamps: true }
)

communityBannerSchema.index({ sortOrder: 1 })

export default mongoose.model<ICommunityBanner>('CommunityBanner', communityBannerSchema)
