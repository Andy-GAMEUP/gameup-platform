import mongoose, { Schema, Document } from 'mongoose'

export interface IPublishing extends Document {
  type: 'hms' | 'hk'
  name: string
  description: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const publishingSchema = new Schema<IPublishing>(
  {
    type: { type: String, enum: ['hms', 'hk'], required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default mongoose.model<IPublishing>('Publishing', publishingSchema)
