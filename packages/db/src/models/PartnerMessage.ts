import mongoose, { Schema, Document } from 'mongoose'

export interface IPartnerMessage extends Document {
  partnerId?: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  recipientUserId: mongoose.Types.ObjectId
  parentId?: mongoose.Types.ObjectId
  // identifies which conversation ("연락하기" inquiry) this message belongs to — a root
  // message (fresh inquiry) references its own _id; every reply inherits its parent's rootId.
  // this is what lets the inbox show one card per inquiry instead of merging every message
  // ever exchanged with the same counterpart into a single card
  rootId?: mongoose.Types.ObjectId
  content: string
  createdAt: Date
  updatedAt: Date
}

const partnerMessageSchema = new Schema<IPartnerMessage>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'PartnerMessage' },
    rootId: { type: Schema.Types.ObjectId, ref: 'PartnerMessage' },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
)

partnerMessageSchema.index({ recipientUserId: 1, createdAt: -1 })
partnerMessageSchema.index({ rootId: 1, createdAt: 1 })

export default mongoose.model<IPartnerMessage>('PartnerMessage', partnerMessageSchema)
