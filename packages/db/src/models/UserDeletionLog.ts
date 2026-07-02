import mongoose, { Schema, Document } from 'mongoose'

export interface IUserDeletionLog extends Document {
  userId: mongoose.Types.ObjectId
  username: string
  email: string
  role: string
  memberType?: string
  companyInfo?: {
    companyName?: string
    companyType?: string[]
    approvalStatus?: string
  }
  isActive: boolean
  approvalStatus?: string
  level?: number
  activityScore?: number
  points?: number
  createdAt: Date
  deletedBy: mongoose.Types.ObjectId
  deletedByUsername?: string
  deletedAt: Date
  userSnapshot?: Record<string, unknown>
  restoredAt?: Date
  restoredBy?: mongoose.Types.ObjectId
}

const userDeletionLogSchema = new Schema<IUserDeletionLog>(
  {
    userId: { type: Schema.Types.ObjectId, index: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String },
    memberType: { type: String },
    companyInfo: { type: Schema.Types.Mixed },
    isActive: { type: Boolean },
    approvalStatus: { type: String },
    level: { type: Number },
    activityScore: { type: Number },
    points: { type: Number },
    createdAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deletedByUsername: { type: String },
    deletedAt: { type: Date, default: Date.now, index: true },
    userSnapshot: { type: Schema.Types.Mixed },
    restoredAt: { type: Date },
    restoredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: false }
)

userDeletionLogSchema.index({ deletedAt: -1 })

export default mongoose.model<IUserDeletionLog>('UserDeletionLog', userDeletionLogSchema)
