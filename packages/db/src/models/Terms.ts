import mongoose, { Schema, Document } from 'mongoose'

export type TermsType = 'privacy' | 'service'

export interface ITerms extends Document {
  type: TermsType
  content: string
  updatedBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const termsSchema = new Schema<ITerms>(
  {
    type: {
      type: String,
      enum: ['privacy', 'service'],
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
      default: '',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<ITerms>('Terms', termsSchema)
