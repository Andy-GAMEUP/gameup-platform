import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGameAnnouncement extends Document {
  gameId: Types.ObjectId
  developerId: Types.ObjectId
  title: string
  content: string
  type: 'notice' | 'update' | 'maintenance' | 'event'
  priority: 'high' | 'normal' | 'low'
  sendPush: boolean
  recipients: number
  views: number
  images: string[]
  thumbnailIndex: number
  deletedAt?: Date
  likes: Types.ObjectId[]
  reportCount: number
  reports: { userId: Types.ObjectId; reason: string; createdAt: Date }[]
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

const GameAnnouncementSchema = new Schema<IGameAnnouncement>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    developerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 5000 },
    type: { type: String, enum: ['notice', 'update', 'maintenance', 'event'], default: 'notice' },
    priority: { type: String, enum: ['high', 'normal', 'low'], default: 'normal' },
    sendPush: { type: Boolean, default: false },
    recipients: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    images: [{ type: String }],
    thumbnailIndex: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reportCount: { type: Number, default: 0 },
    reports: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      createdAt: { type: Date, default: Date.now }
    }],
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
)

GameAnnouncementSchema.index({ gameId: 1, createdAt: -1 })

export default mongoose.model<IGameAnnouncement>('GameAnnouncement', GameAnnouncementSchema)
