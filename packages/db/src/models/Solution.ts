import mongoose, { Schema, Document } from 'mongoose'

export interface ISolution extends Document {
  name: string
  category: string
  description: string
  detailedDescription: string
  imageUrl: string
  features: string[]
  pricing: string
  contactUrl: string
  isActive: boolean
  isRecommended: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const solutionSchema = new Schema<ISolution>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    detailedDescription: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    features: [{ type: String }],
    pricing: { type: String, default: '' },
    contactUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isRecommended: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

solutionSchema.index({ isActive: 1, sortOrder: 1 })

export default mongoose.model<ISolution>('Solution', solutionSchema)
