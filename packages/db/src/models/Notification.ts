import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId
  type: 'notice' | 'publishing' | 'comment' | 'follow' | 'proposal' | 'system'
  title: string
  content: string
  linkUrl: string
  isRead: boolean
  createdAt: Date
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['notice', 'publishing', 'comment', 'follow', 'proposal', 'system'], required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  linkUrl: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

export default mongoose.model<INotification>('Notification', notificationSchema)
