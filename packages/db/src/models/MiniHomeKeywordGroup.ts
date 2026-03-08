import mongoose, { Schema, Document } from 'mongoose'

export interface IMiniHomeKeyword {
  name: string
  isActive: boolean
}

export interface IMiniHomeKeywordGroup extends Document {
  name: string
  keywords: IMiniHomeKeyword[]
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const miniHomeKeywordGroupSchema = new Schema<IMiniHomeKeywordGroup>(
  {
    name: { type: String, required: true, maxlength: 100 },
    sortOrder: { type: Number, default: 0 },
    keywords: [{
      name: { type: String, required: true },
      isActive: { type: Boolean, default: true },
    }],
  },
  { timestamps: true }
)

miniHomeKeywordGroupSchema.index({ sortOrder: 1 })

export default mongoose.model<IMiniHomeKeywordGroup>('MiniHomeKeywordGroup', miniHomeKeywordGroupSchema)
