import mongoose, { Schema, Document } from 'mongoose'

export interface IPost extends Document {
  title: string
  content: string
  author: mongoose.Types.ObjectId
  gameId?: mongoose.Types.ObjectId
  channel: 'notice' | 'new-game-intro' | 'beta-game' | 'live-game' | 'free'
  images: string[]
  videoUrl?: string
  thumbnailIndex: number
  tags: string[]
  likes: mongoose.Types.ObjectId[]
  views: number
  commentCount: number
  status: 'active' | 'hidden' | 'deleted'
  isHot: boolean
  hotScore: number
  isPublished: boolean
  reportCount: number
  deletedByReport: boolean
  deletedAt?: Date
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
    content: { type: String, required: true, maxlength: 50000 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game' },
    channel: { type: String, enum: ['notice', 'new-game-intro', 'beta-game', 'live-game', 'free'], default: 'free' },
    images: [{ type: String }],
    videoUrl: { type: String, default: '' },
    thumbnailIndex: { type: Number, default: 0 },
    tags: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' },
    isHot: { type: Boolean, default: false },
    hotScore: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    reportCount: { type: Number, default: 0 },
    deletedByReport: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
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
postSchema.index({ channel: 1, status: 1, createdAt: -1 })

export default mongoose.model<IPost>('Post', postSchema)
