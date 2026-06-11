import mongoose, { Document, Schema } from 'mongoose'

export interface ISettlement extends Document {
  gameId:               mongoose.Types.ObjectId
  developerId:          mongoose.Types.ObjectId
  settledAt:            Date
  periodFrom:           Date
  periodTo:             Date
  revenue:              number
  vat:                  number
  paybackExpiredAmount: number
  platformFee:          number
  paymentMethodFee:     number
  baseSettlement:       number
  carryoverAmount:      number
  paybackCompensation:  number
  settlementAmount:     number
  status:               'pending' | 'completed'
  createdAt:            Date
  updatedAt:            Date
}

const SettlementSchema = new Schema<ISettlement>({
  gameId:               { type: Schema.Types.ObjectId, ref: 'Game',      required: true },
  developerId:          { type: Schema.Types.ObjectId, ref: 'User',      required: true },
  settledAt:            { type: Date, required: true },
  periodFrom:           { type: Date, required: true },
  periodTo:             { type: Date, required: true },
  revenue:              { type: Number, required: true },
  vat:                  { type: Number, required: true },
  paybackExpiredAmount: { type: Number, default: 0 },
  platformFee:          { type: Number, required: true },
  paymentMethodFee:     { type: Number, required: true },
  baseSettlement:       { type: Number, required: true },
  carryoverAmount:      { type: Number, default: 0 },
  paybackCompensation:  { type: Number, default: 0 },
  settlementAmount:     { type: Number, required: true },
  status:               { type: String, enum: ['pending', 'completed'], default: 'completed' },
}, { timestamps: true })

SettlementSchema.index({ gameId: 1, periodFrom: -1 })
SettlementSchema.index({ developerId: 1, periodFrom: -1 })

export default mongoose.model<ISettlement>('Settlement', SettlementSchema)
