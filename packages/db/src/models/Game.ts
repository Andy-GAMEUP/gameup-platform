import mongoose, { Schema, Document } from 'mongoose'

export interface IGame extends Document {
  title: string
  description: string
  developerId: mongoose.Types.ObjectId
  thumbnail?: string
  gameFile: string
  genre?: string
  price: number
  isPaid: boolean
  monetization: 'free' | 'ad' | 'paid'
  serviceType: 'beta' | 'live'
  playCount: number
  rating: number
  feedbackCount: number
  status: 'draft' | 'beta' | 'published' | 'archived'
  approvalStatus: 'pending' | 'review' | 'approved' | 'rejected'
  adminNote?: string
  rejectionReason?: string
  approvedAt?: Date
  approvedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const gameSchema = new Schema<IGame>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    developerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    thumbnail: String,
    gameFile: { type: String, required: true },
    genre: String,
    price: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    monetization: { type: String, enum: ['free', 'ad', 'paid'], default: 'free' },
    serviceType: { type: String, enum: ['beta', 'live'], default: 'beta' },
    playCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    feedbackCount: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'beta', 'published', 'archived'], default: 'draft' },
    approvalStatus: { type: String, enum: ['pending', 'review', 'approved', 'rejected'], default: 'pending' },
    adminNote: String,
    rejectionReason: String,
    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export const GameModel = mongoose.model<IGame>('Game', gameSchema)
