import mongoose, { Schema, Document } from 'mongoose'

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId
  author: mongoose.Types.ObjectId
  content: string
  parentId?: mongoose.Types.ObjectId
  likes: mongoose.Types.ObjectId[]
  status: 'active' | 'hidden' | 'deleted'
  reportCount: number
  deletedAt?: Date
  deletedBy?: mongoose.Types.ObjectId
  reports: {
    userId: mongoose.Types.ObjectId
    reason: string
    createdAt: Date
  }[]
  createdAt: Date
  updatedAt: Date
}

const commentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' },
    reportCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reports: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
)

commentSchema.index({ postId: 1, status: 1, createdAt: 1 })
commentSchema.index({ author: 1, createdAt: -1 })

export default mongoose.model<IComment>('Comment', commentSchema)
