import mongoose, { Schema, Document } from 'mongoose'

const GENRE_NORMALIZE: Record<string, string> = {
  rpg: 'RPG', RPG: 'RPG',
  action: '액션', Action: '액션',
  strategy: '전략', Strategy: '전략',
  racing: '레이싱', Racing: '레이싱',
  adventure: '어드벤처', Adventure: '어드벤처',
  simulation: '시뮬레이션', Simulation: '시뮬레이션',
  puzzle: '퍼즐', Puzzle: '퍼즐',
  fps: 'FPS', FPS: 'FPS',
  sports: '스포츠', Sports: '스포츠',
  horror: '호러', Horror: '호러',
  기타: '기타', etc: '기타', Etc: '기타',
}

export interface IGame extends Document {
  title: string
  description: string
  genre: string
  developerId: mongoose.Types.ObjectId
  thumbnail?: string
  bannerImage?: string
  gameFile?: string
  gameDomain?: string
  price: number
  isPaid: boolean
  playCount: number
  rating: number
  status: 'draft' | 'beta' | 'published' | 'archived'
  approvalStatus: 'not_submitted' | 'pending' | 'review' | 'approved' | 'rejected'
  serviceType: 'beta' | 'live' | 'review' | 'ended'
  monetization: 'free' | 'ad' | 'paid' | 'freemium'
  testers: number
  feedbackCount: number
  betaEndDate?: Date
  suspendReason?: string
  suspendedAt?: Date
  statusBeforeSuspend?: string
  suspendAppeal?: { message?: string; sentAt?: Date; isRead?: boolean }
  archivedAt?: Date
  archiveReason?: string
  tags: string[]
  adminNote?: string
  rejectionReason?: string
  platform?: string
  engine?: string
  startDate?: Date
  endDate?: Date
  maxTesters?: number
  testType?: string
  requirements?: string
  trailer?: string
  website?: string
  discord?: string
  notes?: string
  approvedAt?: Date
  approvedBy?: mongoose.Types.ObjectId
  isNewFeatured?: boolean
  ratingCertificate?: {
    ratingClass?: '전체이용가' | '12세이용가' | '15세이용가' | '18세이용가' | '청소년이용불가'
    certNumber?: string
    certDate?: string
    certFileUrl?: string
    isVerified?: boolean
  }
  shopCurrencyIconUrl?: string
  shopCurrencyName?: string
  shopCurrencyNames?: Record<string, string>
  shopPaymentType?: 'cash' | 'capcoin'
  additionalCurrencies?: { _id: string; name: string; names: Record<string, string>; iconUrl: string; paymentType?: 'cash' | 'capcoin' }[]
  publishedSnapshot?: Record<string, unknown>
  isDeleted?: boolean
  deletedAt?: Date
  hiddenFromCommunity?: boolean
  createdAt: Date
  updatedAt: Date
}

const gameSchema = new Schema<IGame>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    genre: {
      type: String,
      default: '',
      get: (v: string) => GENRE_NORMALIZE[v] ?? v,
    },
    developerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    thumbnail: {
      type: String
    },
    bannerImage: {
      type: String
    },
    gameFile: {
      type: String
    },
    gameDomain: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      default: 0
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    playCount: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['draft', 'beta', 'published', 'archived'],
      default: 'draft'
    },
    approvalStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'review', 'approved', 'rejected'],
      default: 'not_submitted'
    },
    serviceType: {
      type: String,
      enum: ['beta', 'live', 'review', 'ended'],
      default: 'beta'
    },
    monetization: {
      type: String,
      enum: ['free', 'ad', 'paid', 'freemium'],
      default: 'freemium'
    },
    testers: {
      type: Number,
      default: 0
    },
    feedbackCount: {
      type: Number,
      default: 0
    },
    betaEndDate: {
      type: Date
    },
    suspendReason: {
      type: String
    },
    suspendedAt: {
      type: Date
    },
    statusBeforeSuspend: {
      type: String
    },
    suspendAppeal: {
      message: { type: String },
      sentAt: { type: Date },
      isRead: { type: Boolean, default: false },
    },
    archivedAt: {
      type: Date
    },
    archiveReason: {
      type: String
    },
    adminNote: {
      type: String
    },
    rejectionReason: {
      type: String
    },
    approvedAt: {
      type: Date
    },
    publishedSnapshot: {
      type: Object
    },
    platform: { type: String, default: '' },
    engine: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    maxTesters: { type: Number, default: 0 },
    testType: { type: String, default: '' },
    requirements: { type: String, default: '' },
    trailer: { type: String, default: '' },
    website: { type: String, default: '' },
    discord: { type: String, default: '' },
    notes: { type: String, default: '' },
    shopCurrencyIconUrl: { type: String, default: '' },
    shopCurrencyName: { type: String, default: '' },
    shopCurrencyNames: { type: Map, of: String, default: {} },
    shopPaymentType: { type: String, enum: ['cash', 'capcoin'], default: 'cash' },
    additionalCurrencies: {
      type: [{
        name:        { type: String, default: '' },
        names:       { type: Map, of: String, default: {} },
        iconUrl:     { type: String, default: '' },
        paymentType: { type: String, enum: ['cash', 'capcoin'], default: 'cash' },
      }],
      default: []
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    isNewFeatured: {
      type: Boolean,
      default: false
    },
    ratingCertificate: {
      ratingClass: {
        type: String,
        enum: ['전체이용가', '12세이용가', '15세이용가', '18세이용가', '청소년이용불가'],
      },
      certNumber: { type: String },
      certDate: { type: String },
      certFileUrl: { type: String },
      isVerified: { type: Boolean, default: false },
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    hiddenFromCommunity: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
)

gameSchema.index({ developerId: 1, status: 1, createdAt: -1 })
gameSchema.index({ status: 1, approvalStatus: 1 })
gameSchema.index({ approvalStatus: 1, createdAt: -1 })
gameSchema.index({ isDeleted: 1 })

export default mongoose.model<IGame>('Game', gameSchema)
