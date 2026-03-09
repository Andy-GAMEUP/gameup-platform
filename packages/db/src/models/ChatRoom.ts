import mongoose, { Schema, Document } from 'mongoose'

export interface IChatRoom extends Document {
  participants: mongoose.Types.ObjectId[]
  lastMessage: string
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}

const chatRoomSchema = new Schema<IChatRoom>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

chatRoomSchema.index({ participants: 1 })
chatRoomSchema.index({ lastMessageAt: -1 })

export default mongoose.model<IChatRoom>('ChatRoom', chatRoomSchema)
