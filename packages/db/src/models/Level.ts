import mongoose, { Schema, Document } from 'mongoose'

export interface ILevel extends Document {
  level: number
  name: string
  icon?: string
  requiredScore: number
  memberCount: number
  createdAt: Date
  updatedAt: Date
}

const levelSchema = new Schema<ILevel>(
  {
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
    },
    requiredScore: {
      type: Number,
      required: true,
      default: 0,
    },
    memberCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

levelSchema.index({ level: 1 })

export default mongoose.model<ILevel>('Level', levelSchema)
