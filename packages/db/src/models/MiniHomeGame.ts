import mongoose, { Schema, Document } from 'mongoose'

export interface IMiniHomeGame extends Document {
  minihomeId: mongoose.Types.ObjectId
  title: string
  genre: string
  description: string
  iconUrl: string
  coverUrl: string
  screenshots: string[]
  platforms: string[]
  status: 'active' | 'inactive'
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const miniHomeGameSchema = new Schema<IMiniHomeGame>(
  {
    minihomeId: { type: Schema.Types.ObjectId, ref: 'MiniHome', required: true },
    title: { type: String, required: true, maxlength: 100 },
    genre: { type: String, default: '' },
    description: { type: String, default: '', maxlength: 2000 },
    iconUrl: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
    screenshots: [{ type: String }],
    platforms: [{ type: String }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

miniHomeGameSchema.index({ minihomeId: 1, sortOrder: 1 })

export default mongoose.model<IMiniHomeGame>('MiniHomeGame', miniHomeGameSchema)
