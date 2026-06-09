import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGameShopItem extends Document {
  gameId: Types.ObjectId
  developerId: Types.ObjectId
  name: string
  description: string
  imageUrl: string
  price: number
  currency: 'KRW' | 'USD' | 'EUR'
  type: string
  currencyType: string
  currencyAmount: number
  bonusAmount: number
  stock: string
  itemId?: string
  isSpecial?: boolean
  specialImageUrl?: string
  active: boolean
  sales: number
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const GameShopItemSchema = new Schema<IGameShopItem>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    developerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['KRW', 'USD', 'EUR'], default: 'KRW' },
    type: { type: String, default: '패키지' },
    currencyType: { type: String, default: '' },
    currencyAmount: { type: Number, default: 0, min: 0 },
    bonusAmount: { type: Number, default: 0, min: 0 },
    stock: { type: String, default: '무제한' },
    itemId: { type: String, default: '' },
    isSpecial: { type: Boolean, default: false },
    specialImageUrl: { type: String, default: '' },
    active: { type: Boolean, default: true },
    sales: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

GameShopItemSchema.index({ gameId: 1, sortOrder: 1 })
GameShopItemSchema.index({ gameId: 1, createdAt: -1 })

export default mongoose.model<IGameShopItem>('GameShopItem', GameShopItemSchema)
