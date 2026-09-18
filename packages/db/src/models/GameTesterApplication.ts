import mongoose, { Schema, Document, Types } from 'mongoose'

// 베타존 참가 신청 — 선착순 즉시 확정 방식이라 별도 승인/거절 상태 없이, 레코드 존재 자체가 확정을 의미함
export interface IGameTesterApplication extends Document {
  gameId: Types.ObjectId
  userId: Types.ObjectId
  appliedAt: Date
}

const GameTesterApplicationSchema = new Schema<IGameTesterApplication>({
  gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  appliedAt: { type: Date, default: Date.now },
})

GameTesterApplicationSchema.index({ gameId: 1, userId: 1 }, { unique: true })

export default mongoose.model<IGameTesterApplication>('GameTesterApplication', GameTesterApplicationSchema)
