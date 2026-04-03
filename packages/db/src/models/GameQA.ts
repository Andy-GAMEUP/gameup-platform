import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGameQA extends Document {
  gameId: Types.ObjectId
  userId: Types.ObjectId        // 질문 작성자 (플레이어)
  developerId: Types.ObjectId   // 게임 개발자
  question: string
  answer?: string
  answeredAt?: Date
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

const GameQASchema = new Schema<IGameQA>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    developerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true, maxlength: 1000 },
    answer: { type: String, maxlength: 2000 },
    answeredAt: { type: Date },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
)

GameQASchema.index({ gameId: 1, createdAt: -1 })
GameQASchema.index({ developerId: 1, answeredAt: 1 })
GameQASchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model<IGameQA>('GameQA', GameQASchema)
