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

export default mongoose.model<IFeedback>('Feedback', feedbackSchema)
