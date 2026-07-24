import mongoose, { Schema, Document } from 'mongoose'

export interface IPartnerMessageThread extends Document {
  // one thread-state doc per conversation (per rootId), not per counterpart pair — the same
  // two users can have several independent conversations, each closable/deletable on its own
  rootId: mongoose.Types.ObjectId
  userLow: mongoose.Types.ObjectId
  userHigh: mongoose.Types.ObjectId
  status: 'open' | 'closed' | 'deleted'
  actionByUserId?: mongoose.Types.ObjectId
  // separate from status/actionByUserId: lets a participant who doesn't own the shared
  // open/closed state (e.g. the side already blocked by the other party's close) permanently
  // erase their own copy without touching the other participant's reply-blocking state
  permanentlyDeletedBy: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const partnerMessageThreadSchema = new Schema<IPartnerMessageThread>(
  {
    rootId: { type: Schema.Types.ObjectId, ref: 'PartnerMessage', required: true },
    userLow: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userHigh: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'closed', 'deleted'], default: 'open' },
    actionByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    permanentlyDeletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

partnerMessageThreadSchema.index({ rootId: 1 }, { unique: true })
partnerMessageThreadSchema.index({ userLow: 1, userHigh: 1 })

export default mongoose.model<IPartnerMessageThread>('PartnerMessageThread', partnerMessageThreadSchema)
