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
  paymentType: 'cash' | 'capcoin'
  currencyName: string
  currencyIconUrl: string
  currencyType: string
  currencyId: string
  currencyAmount: number
  bonusAmount: number
  stock: string
  itemId?: string
  names?: Record<string, string>
  currencyNames?: Record<string, string>
  capcoinPrice?: number
  capcoinName?: string
  capcoinIconUrl?: string
  isSpecial?: boolean
  specialImageUrl?: string
  active: boolean
  sales: number
  sortOrder: number
  saleStatus: 'registering' | 'reviewing' | 'on_sale' | 'rejected'
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
    paymentType: { type: String, enum: ['cash', 'capcoin'], default: 'cash' },
    currencyName: { type: String, default: '' },
    currencyIconUrl: { type: String, default: '' },
    currencyType: { type: String, default: '' },
    currencyId: { type: String, default: 'main' },
    currencyAmount: { type: Number, default: 0, min: 0 },
    bonusAmount: { type: Number, default: 0, min: 0 },
    stock: { type: String, default: '무제한' },
    itemId: { type: String, default: '' },
    names: { type: Schema.Types.Mixed, default: {} },
    currencyNames: { type: Schema.Types.Mixed, default: {} },
    capcoinPrice: { type: Number, default: 0, min: 0 },
    capcoinName: { type: String, default: '' },
    capcoinIconUrl: { type: String, default: '' },
    isSpecial: { type: Boolean, default: false },
    specialImageUrl: { type: String, default: '' },
    active: { type: Boolean, default: true },
    sales: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    saleStatus: { type: String, enum: ['registering', 'reviewing', 'on_sale', 'rejected'], default: 'registering' },
  },
  { timestamps: true }
)

GameShopItemSchema.index({ gameId: 1, sortOrder: 1 })
GameShopItemSchema.index({ gameId: 1, createdAt: -1 })

export default mongoose.model<IGameShopItem>('GameShopItem', GameShopItemSchema)
