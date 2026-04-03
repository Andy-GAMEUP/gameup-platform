import mongoose, { Schema, Document } from 'mongoose'

export interface IEventRegistration extends Document {
  eventBanner: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId | null
  name: string
  email: string
  phone: string
  createdAt: Date
  updatedAt: Date
}

const eventRegistrationSchema = new Schema<IEventRegistration>(
  {
    eventBanner: { type: Schema.Types.ObjectId, ref: 'EventBanner', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { timestamps: true }
)

// 동일 이벤트에 동일 이메일로 중복 신청 방지
eventRegistrationSchema.index({ eventBanner: 1, email: 1 }, { unique: true })

export default mongoose.model<IEventRegistration>('EventRegistration', eventRegistrationSchema)
