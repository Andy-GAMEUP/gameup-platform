import mongoose, { Schema, Document } from 'mongoose'

export interface IPartnerProjectDeletionLog extends Document {
  projectId: mongoose.Types.ObjectId
  title: string
  category?: string
  status?: string
  ownerId?: mongoose.Types.ObjectId
  ownerUsername?: string
  applicantCount?: number
  createdAt?: Date
  deletedBy: mongoose.Types.ObjectId
  deletedByUsername?: string
  deletedAt: Date
  projectSnapshot?: Record<string, unknown>
  restoredAt?: Date
  restoredBy?: mongoose.Types.ObjectId
}

const partnerProjectDeletionLogSchema = new Schema<IPartnerProjectDeletionLog>(
  {
    projectId: { type: Schema.Types.ObjectId, index: true },
    title: { type: String, required: true },
    category: { type: String },
    status: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    ownerUsername: { type: String },
    applicantCount: { type: Number },
    createdAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deletedByUsername: { type: String },
    deletedAt: { type: Date, default: Date.now, index: true },
    projectSnapshot: { type: Schema.Types.Mixed },
    restoredAt: { type: Date },
    restoredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: false }
)

partnerProjectDeletionLogSchema.index({ deletedAt: -1 })

export default mongoose.model<IPartnerProjectDeletionLog>('PartnerProjectDeletionLog', partnerProjectDeletionLogSchema)
