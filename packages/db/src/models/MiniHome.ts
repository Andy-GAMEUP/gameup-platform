import mongoose, { Schema, Document } from 'mongoose'

export interface IMiniHome extends Document {
  userId: mongoose.Types.ObjectId
  companyName: string
  introduction: string
  profileImage: string
  coverImage: string
  website: string
  tags: string[]
  keywords: string[]
  isPublic: boolean
  isRecommended: boolean
  representativeGameId: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const miniHomeSchema = new Schema<IMiniHome>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, maxlength: 100 },
    introduction: { type: String, default: '', maxlength: 2000 },
    profileImage: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    website: { type: String, default: '' },
    tags: [{ type: String }],
    keywords: [{ type: String }],
    isPublic: { type: Boolean, default: true },
    isRecommended: { type: Boolean, default: false },
    representativeGameId: { type: Schema.Types.ObjectId, ref: 'MiniHomeGame', default: null },
  },
  { timestamps: true }
)

miniHomeSchema.index({ userId: 1 }, { unique: true })
miniHomeSchema.index({ isPublic: 1, isRecommended: -1, createdAt: -1 })

export default mongoose.model<IMiniHome>('MiniHome', miniHomeSchema)
