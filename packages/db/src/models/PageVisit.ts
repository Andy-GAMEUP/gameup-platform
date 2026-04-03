import mongoose, { Schema, Document } from 'mongoose'

export interface IPageVisit extends Document {
  userId: mongoose.Types.ObjectId | null
  sessionId: string
  page: string
  menu: string
  referrer: string
  userAgent: string
  platform: string
  duration: number
  createdAt: Date
}

const PageVisitSchema = new Schema<IPageVisit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, required: true },
    page: { type: String, required: true },
    menu: {
      type: String,
      enum: ['home', 'games', 'community', 'partner', 'publishing', 'minihome', 'support', 'solution', 'other'],
      default: 'other',
    },
    referrer: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    platform: { type: String, enum: ['PC', 'Mobile'], default: 'PC' },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true },
)

PageVisitSchema.index({ createdAt: 1, menu: 1 })
PageVisitSchema.index({ page: 1, createdAt: 1 })
PageVisitSchema.index({ userId: 1, createdAt: 1 })
PageVisitSchema.index({ sessionId: 1, createdAt: 1 })

export default mongoose.model<IPageVisit>('PageVisit', PageVisitSchema)
