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
  // 지원자 목록/내가 한 지원의 "협의 하기"로 보낸 메시지에만 채워짐(답장은 원본 메시지의 값을
  // 그대로 물려받음) — 같은 회사와 다른 프로젝트로 나눈 무관한 대화가 이 지원 건의 히스토리에
  // 섞여 보이지 않도록, 지원 건 단위로 스레드를 조회할 때 씀
  applicationId?: mongoose.Types.ObjectId
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
    applicationId: { type: Schema.Types.ObjectId, ref: 'PartnerProjectApplication' },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
)

partnerMessageSchema.index({ recipientUserId: 1, createdAt: -1 })
partnerMessageSchema.index({ rootId: 1, createdAt: 1 })
partnerMessageSchema.index({ applicationId: 1, createdAt: 1 })

export default mongoose.model<IPartnerMessage>('PartnerMessage', partnerMessageSchema)
