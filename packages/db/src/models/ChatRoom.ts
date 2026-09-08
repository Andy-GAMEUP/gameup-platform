import mongoose, { Schema, Document } from 'mongoose'

export const INQUIRY_CATEGORIES = ['game', 'account', 'bug', 'report', 'community', 'other'] as const
export type InquiryCategory = typeof INQUIRY_CATEGORIES[number]

export const INQUIRY_STATUSES = ['open', 'in_progress', 'closed'] as const
export type InquiryStatus = typeof INQUIRY_STATUSES[number]

export interface IChatRoom extends Document {
  participants: mongoose.Types.ObjectId[]
  lastMessage: string
  lastMessageAt: Date
  deletedBy: mongoose.Types.ObjectId[]
  title: string
  content: string
  imageUrl: string
  category: InquiryCategory
  status: InquiryStatus
  createdAt: Date
  updatedAt: Date
}

const chatRoomSchema = new Schema<IChatRoom>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    category: { type: String, enum: INQUIRY_CATEGORIES, default: 'other' },
    status: { type: String, enum: INQUIRY_STATUSES, default: 'open' },
  },
  { timestamps: true }
)

chatRoomSchema.index({ participants: 1 })
chatRoomSchema.index({ lastMessageAt: -1 })

export default mongoose.model<IChatRoom>('ChatRoom', chatRoomSchema)
