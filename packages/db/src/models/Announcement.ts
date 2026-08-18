import mongoose, { Schema, Document } from 'mongoose'

export interface IAnnouncement extends Document {
  title: string
  content: string
  type: 'notice' | 'event' | 'maintenance' | 'update'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  authorId: mongoose.Types.ObjectId
  isPinned: boolean
  isPublished: boolean
  publishedAt?: Date
  expiresAt?: Date
  targetRole: 'all' | 'developer' | 'player'
  views: number
  images: string[]
  thumbnailIndex: number
  deletedAt?: Date
  likes: mongoose.Types.ObjectId[]
  reportCount: number
  reports: { userId: mongoose.Types.ObjectId; reason: string; createdAt: Date }[]
  createdAt: Date
  updatedAt: Date
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['notice', 'event', 'maintenance', 'update'],
      default: 'notice'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date
    },
    expiresAt: {
      type: Date
    },
    targetRole: {
      type: String,
      enum: ['all', 'developer', 'player'],
      default: 'all'
    },
    views: {
      type: Number,
      default: 0
    },
    images: [{ type: String }],
    thumbnailIndex: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reportCount: { type: Number, default: 0 },
    reports: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  {
    timestamps: true
  }
)

announcementSchema.index({ isPublished: 1, isPinned: -1, createdAt: -1 })
announcementSchema.index({ targetRole: 1, isPublished: 1 })

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema)
