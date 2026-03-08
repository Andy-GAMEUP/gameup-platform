import mongoose, { Schema, Document } from 'mongoose'

export interface IPartnerPost extends Document {
  partnerId: mongoose.Types.ObjectId
  author: mongoose.Types.ObjectId
  title: string
  content: string
  topicGroup: string
  topic: string
  images: string[]
  tags: string[]
  views: number
  likes: mongoose.Types.ObjectId[]
  commentCount: number
  sortOrder: number
  status: 'active' | 'hidden' | 'deleted'
  createdAt: Date
  updatedAt: Date
}

const partnerPostSchema = new Schema<IPartnerPost>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 50000 },
    topicGroup: { type: String, default: '' },
    topic: { type: String, default: '' },
    images: [{ type: String }],
    tags: [{ type: String }],
    views: { type: Number, default: 0 },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    commentCount: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' },
  },
  { timestamps: true }
)

partnerPostSchema.index({ partnerId: 1, status: 1, sortOrder: -1 })
partnerPostSchema.index({ partnerId: 1, status: 1, createdAt: -1 })
partnerPostSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model<IPartnerPost>('PartnerPost', partnerPostSchema)
