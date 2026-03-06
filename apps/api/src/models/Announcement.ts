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
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema)
