import mongoose, { Schema, Document } from 'mongoose'

export interface IPartnerProjectInquiry extends Document {
  projectId: mongoose.Types.ObjectId
  authorId: mongoose.Types.ObjectId
  content: string
  parentId?: mongoose.Types.ObjectId
  isSecret: boolean
  isHidden: boolean
  createdAt: Date
  updatedAt: Date
}

const partnerProjectInquirySchema = new Schema<IPartnerProjectInquiry>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'PartnerProject', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 1000 },
    parentId: { type: Schema.Types.ObjectId, ref: 'PartnerProjectInquiry', default: null },
    isSecret: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
)

partnerProjectInquirySchema.index({ projectId: 1, createdAt: 1 })

export default mongoose.model<IPartnerProjectInquiry>('PartnerProjectInquiry', partnerProjectInquirySchema)
