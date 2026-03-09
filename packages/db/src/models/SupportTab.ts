import mongoose, { Schema, Document } from 'mongoose'

export interface ISupportTab extends Document {
  name: string
  content: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const supportTabSchema = new Schema<ISupportTab>(
  {
    name: { type: String, required: true },
    content: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

supportTabSchema.index({ sortOrder: 1 })

export default mongoose.model<ISupportTab>('SupportTab', supportTabSchema)
