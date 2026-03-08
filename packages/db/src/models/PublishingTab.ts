import mongoose, { Schema, Document } from 'mongoose'

export interface IPublishingTab extends Document {
  publishingType: 'hms' | 'hk'
  name: string
  content: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const publishingTabSchema = new Schema<IPublishingTab>(
  {
    publishingType: { type: String, enum: ['hms', 'hk'], required: true },
    name: { type: String, required: true },
    content: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

publishingTabSchema.index({ publishingType: 1, sortOrder: 1 })

export default mongoose.model<IPublishingTab>('PublishingTab', publishingTabSchema)
