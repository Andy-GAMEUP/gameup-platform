import mongoose, { Schema, Document } from 'mongoose'

export type GamePointType =
  | 'game_account_create'   // 게임 계정 생성
  | 'game_daily_login'      // 게임 일일 접속
  | 'game_play_time'        // 게임 플레이 시간
  | 'game_purchase'         // 게임 결제
  | 'game_event_participate' // 게임 이벤트 참여/완료
  | 'game_level_achieve'    // 게임 레벨 도달
  | 'game_ranking'          // 게임 랭킹 보상

export type GamePointApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface IGamePointPolicy extends Document {
  gameId: mongoose.Types.ObjectId
  developerId: mongoose.Types.ObjectId
  type: GamePointType
  label: string
  description: string
  amount: number
  multiplier: number
  dailyLimit: number | null
  startDate?: Date
  endDate?: Date
  estimatedDailyUsage?: number
  developerNote?: string
  conditionConfig?: Record<string, unknown>
  isActive: boolean
  approvalStatus: GamePointApprovalStatus
  adminNote?: string
  approvedAt?: Date
  approvedBy?: mongoose.Types.ObjectId
  rejectedAt?: Date
  rejectedBy?: mongoose.Types.ObjectId
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

const gamePointPolicySchema = new Schema<IGamePointPolicy>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    developerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'game_account_create',
        'game_daily_login',
        'game_play_time',
        'game_purchase',
        'game_event_participate',
        'game_level_achieve',
        'game_ranking',
      ],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      default: 1,
    },
    multiplier: {
      type: Number,
      default: 1,
    },
    dailyLimit: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft',
    },
    adminNote: {
      type: String,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    estimatedDailyUsage: {
      type: Number,
      default: 0,
    },
    developerNote: {
      type: String,
      default: '',
    },
    conditionConfig: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// 게임별 포인트 타입 유니크
gamePointPolicySchema.index({ gameId: 1, type: 1 }, { unique: true })
gamePointPolicySchema.index({ approvalStatus: 1 })
gamePointPolicySchema.index({ developerId: 1 })

export default mongoose.model<IGamePointPolicy>('GamePointPolicy', gamePointPolicySchema)
