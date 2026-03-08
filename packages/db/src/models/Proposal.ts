import mongoose, { Schema, Document } from 'mongoose'

export interface IProposal extends Document {
  type: 'investment' | 'publishing'
  fromUserId: mongoose.Types.ObjectId
  toMinihomeId: mongoose.Types.ObjectId
  gameId: mongoose.Types.ObjectId | null
  title: string
  content: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
  updatedAt: Date
}

const proposalSchema = new Schema<IProposal>(
  {
    type: { type: String, enum: ['investment', 'publishing'], required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toMinihomeId: { type: Schema.Types.ObjectId, ref: 'MiniHome', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'MiniHomeGame', default: null },
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
)

proposalSchema.index({ toMinihomeId: 1, type: 1, createdAt: -1 })
proposalSchema.index({ fromUserId: 1, createdAt: -1 })

export default mongoose.model<IProposal>('Proposal', proposalSchema)
