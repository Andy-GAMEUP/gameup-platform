import mongoose, { Schema, Document } from 'mongoose'

export interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId
  gameId: mongoose.Types.ObjectId
  rating: number
  comment: string
  createdAt: Date
}

const feedbackSchema = new Schema<IFeedback>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
)

feedbackSchema.index({ gameId: 1, createdAt: -1 })
feedbackSchema.index({ userId: 1, gameId: 1 }, { unique: true })

export default mongoose.model<IFeedback>('Feedback', feedbackSchema)
