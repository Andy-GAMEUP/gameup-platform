import mongoose, { Schema, Document } from 'mongoose'

export interface IGameApplication extends Document {
  seasonId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  gameName: string
  genre: string
  description: string
  iconUrl: string
  introVideoUrl: string
  introImageUrl: string
  buildUrl: string
  screenshots: string[]
  platforms: string[]
  developmentSchedule: string
  status: 'pending' | 'reviewing' | 'selected' | 'rejected' | 'on-hold'
  isConfirmed: boolean
  adminNote: string
  score: { gameplay: number; design: number; sound: number; business: number; total: number }
  milestones: { title: string; date: Date; description: string; buildUrl: string; isCompleted: boolean }[]
  supportPoints: number
  irDocumentUrl: string
  minihomeId: mongoose.Types.ObjectId | null
  selectedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const milestoneSchema = new Schema(
  {
    title: { type: String, default: '' },
    date: { type: Date },
    description: { type: String, default: '' },
    buildUrl: { type: String, default: '' },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false }
)

const scoreSchema = new Schema(
  {
    gameplay: { type: Number, default: 0 },
    design: { type: Number, default: 0 },
    sound: { type: Number, default: 0 },
    business: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
)

const gameApplicationSchema = new Schema<IGameApplication>(
  {
    seasonId: { type: Schema.Types.ObjectId, ref: 'Season', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameName: { type: String, required: true },
    genre: { type: String, default: '' },
    description: { type: String, default: '' },
    iconUrl: { type: String, default: '' },
    introVideoUrl: { type: String, default: '' },
    introImageUrl: { type: String, default: '' },
    buildUrl: { type: String, default: '' },
    screenshots: [{ type: String }],
    platforms: [{ type: String }],
    developmentSchedule: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'selected', 'rejected', 'on-hold'],
      default: 'pending',
    },
    isConfirmed: { type: Boolean, default: false },
    adminNote: { type: String, default: '' },
    score: {
      type: scoreSchema,
      default: () => ({ gameplay: 0, design: 0, sound: 0, business: 0, total: 0 }),
    },
    milestones: [milestoneSchema],
    supportPoints: { type: Number, default: 0 },
    irDocumentUrl: { type: String, default: '' },
    minihomeId: { type: Schema.Types.ObjectId, ref: 'MiniHome', default: null },
    selectedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

gameApplicationSchema.index({ seasonId: 1, status: 1, createdAt: -1 })
gameApplicationSchema.index({ userId: 1, seasonId: 1 })

export default mongoose.model<IGameApplication>('GameApplication', gameApplicationSchema)
