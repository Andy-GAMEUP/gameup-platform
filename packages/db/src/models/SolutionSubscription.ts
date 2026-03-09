import mongoose, { Schema, Document } from 'mongoose'

export interface ISolutionSubscription extends Document {
  solutionId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  companyName: string
  managerName: string
  phone: string
  email: string
  message: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  isConfirmed: boolean
  adminNote: string
  createdAt: Date
  updatedAt: Date
}

const solutionSubscriptionSchema = new Schema<ISolutionSubscription>(
  {
    solutionId: { type: Schema.Types.ObjectId, ref: 'Solution', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyName: { type: String, required: true },
    managerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'approved', 'rejected'],
      default: 'pending',
    },
    isConfirmed: { type: Boolean, default: false },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
)

solutionSubscriptionSchema.index({ solutionId: 1, createdAt: -1 })
solutionSubscriptionSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model<ISolutionSubscription>('SolutionSubscription', solutionSubscriptionSchema)
