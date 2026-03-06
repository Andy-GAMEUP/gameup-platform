import mongoose, { Schema, Document } from 'mongoose'

export interface IPost extends Document {
  title: string
  content: string
  author: mongoose.Types.ObjectId
  gameId?: mongoose.Types.ObjectId
  category: 'general' | 'bug' | 'suggestion' | 'review' | 'notice'
  images: string[]
  links: { url: string; label?: string }[]
  tags: string[]
  likes: mongoose.Types.ObjectId[]
  bookmarks: mongoose.Types.ObjectId[]
  views: number
  commentCount: number
  status: 'active' | 'hidden' | 'deleted'
  isPinned: boolean
  isHot: boolean
  hotScore: number
  reportCount: number
  reports: {
    userId: mongoose.Types.ObjectId
    reason: string
    createdAt: Date
  }[]
  createdAt: Date
  updatedAt: Date
}

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 10000 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game' },
    category: { type: String, enum: ['general', 'bug', 'suggestion', 'review', 'notice'], default: 'general' },
    images: [{ type: String }],
    links: [{ url: String, label: String }],
    tags: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' },
    isPinned: { type: Boolean, default: false },
    isHot: { type: Boolean, default: false },
    hotScore: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    reports: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
)

postSchema.index({ status: 1, createdAt: -1 })
postSchema.index({ status: 1, hotScore: -1 })
postSchema.index({ author: 1, createdAt: -1 })
postSchema.index({ gameId: 1, status: 1, createdAt: -1 })
postSchema.index({ isPinned: -1, status: 1, createdAt: -1 })
postSchema.index({ isPinned: -1, status: 1, hotScore: -1 })

export default mongoose.model<IPost>('Post', postSchema)
