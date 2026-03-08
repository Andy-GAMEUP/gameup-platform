import mongoose, { Schema, Document } from 'mongoose'

export interface IPublishingSuggest extends Document {
  publishingType: 'hms' | 'hk'
  userId: mongoose.Types.ObjectId
  gameName: string
  gameDescription: string
  appIcon: string
  coverImage: string
  screenshots: string[]
  buildUrl: string
  additionalServices: string[]
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  adminNote: string
  createdAt: Date
  updatedAt: Date
}

const publishingSuggestSchema = new Schema<IPublishingSuggest>(
  {
    publishingType: { type: String, enum: ['hms', 'hk'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameName: { type: String, required: true },
    gameDescription: { type: String, required: true },
    appIcon: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    screenshots: [{ type: String }],
    buildUrl: { type: String, default: '' },
    additionalServices: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
)

publishingSuggestSchema.index({ publishingType: 1, status: 1, createdAt: -1 })
publishingSuggestSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model<IPublishingSuggest>('PublishingSuggest', publishingSuggestSchema)
