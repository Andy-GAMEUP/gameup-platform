import mongoose, { Schema, Document } from 'mongoose'

export interface IMiniHomeNews extends Document {
  minihomeId: mongoose.Types.ObjectId
  authorId: mongoose.Types.ObjectId
  type: 'game' | 'company'
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

const miniHomeNewsSchema = new Schema<IMiniHomeNews>(
  {
    minihomeId: { type: Schema.Types.ObjectId, ref: 'MiniHome', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['game', 'company'], required: true },
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true },
  },
  { timestamps: true }
)

miniHomeNewsSchema.index({ minihomeId: 1, type: 1, createdAt: -1 })

export default mongoose.model<IMiniHomeNews>('MiniHomeNews', miniHomeNewsSchema)
