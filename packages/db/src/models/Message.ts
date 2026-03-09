import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage extends Document {
  roomId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  type: 'text' | 'image' | 'file'
  content: string
  fileName: string
  isRead: boolean
  deletedBy: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<IMessage>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    content: { type: String, required: true },
    fileName: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

messageSchema.index({ roomId: 1, createdAt: -1 })
messageSchema.index({ senderId: 1 })

export default mongoose.model<IMessage>('Message', messageSchema)
