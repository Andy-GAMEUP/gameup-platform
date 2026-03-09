import mongoose, { Schema, Document } from 'mongoose'

export interface ISeason extends Document {
  title: string
  status: 'draft' | 'recruiting' | 'in-progress' | 'completed'
  recruitingTitle: string
  recruitingDescription: string
  recruitingStartDate: Date | null
  recruitingEndDate: Date | null
  recruitingMaxCount: number
  progressTitle: string
  progressDescription: string
  progressStartDate: Date | null
  progressEndDate: Date | null
  completionTitle: string
  completionDescription: string
  completionDate: Date | null
  isVisible: boolean
  createdAt: Date
  updatedAt: Date
}

const seasonSchema = new Schema<ISeason>(
  {
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'recruiting', 'in-progress', 'completed'],
      default: 'draft',
    },
    recruitingTitle: { type: String, default: '' },
    recruitingDescription: { type: String, default: '' },
    recruitingStartDate: { type: Date, default: null },
    recruitingEndDate: { type: Date, default: null },
    recruitingMaxCount: { type: Number, default: 0 },
    progressTitle: { type: String, default: '' },
    progressDescription: { type: String, default: '' },
    progressStartDate: { type: Date, default: null },
    progressEndDate: { type: Date, default: null },
    completionTitle: { type: String, default: '' },
    completionDescription: { type: String, default: '' },
    completionDate: { type: Date, default: null },
    isVisible: { type: Boolean, default: false },
  },
  { timestamps: true }
)

seasonSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model<ISeason>('Season', seasonSchema)
