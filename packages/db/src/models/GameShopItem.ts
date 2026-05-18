import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGameShopItem extends Document {
  gameId: Types.ObjectId
  developerId: Types.ObjectId
  name: string
  price: number
  currency: 'KRW' | 'USD' | 'EUR'
  type: string
  stock: string
  description: string
  active: boolean
  sales: number
  createdAt: Date
  updatedAt: Date
}

const GameShopItemSchema = new Schema<IGameShopItem>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    developerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxlength: 100 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['KRW', 'USD', 'EUR'], default: 'KRW' },
    type: { type: String, default: '패키지' },
    stock: { type: String, default: '무제한' },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
    sales: { type: Number, default: 0 },
  },
  { timestamps: true }
)

GameShopItemSchema.index({ gameId: 1, createdAt: -1 })

export default mongoose.model<IGameShopItem>('GameShopItem', GameShopItemSchema)
