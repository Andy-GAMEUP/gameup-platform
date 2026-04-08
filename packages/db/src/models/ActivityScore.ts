import mongoose, { Schema, Document } from 'mongoose'

export type ActivityScoreType =
  | 'login'
  | 'stay_time'
  | 'post_write'
  | 'post_delete'
  | 'comment_write'
  | 'comment_delete'
  | 'recommend_received'
  | 'recommend_cancelled'
  | 'game_access'
  | 'game_stay_time'
  | 'game_event_reward'
  | 'game_payment_reward'
  | 'game_account_create'
  | 'game_daily_login'
  | 'game_play_time'
  | 'game_purchase'
  | 'game_event_participate'
  | 'game_level_achieve'
  | 'game_ranking'
  | 'admin_grant'
  | 'admin_deduct'

export interface IActivityScore extends Document {
  userId: mongoose.Types.ObjectId
  amount: number
  reason: string
  type: ActivityScoreType
  relatedId?: mongoose.Types.ObjectId
  createdAt: Date
}

const activityScoreSchema = new Schema<IActivityScore>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'login',
        'stay_time',
        'post_write',
        'post_delete',
        'comment_write',
        'comment_delete',
        'recommend_received',
        'recommend_cancelled',
        'game_access',
        'game_stay_time',
        'game_event_reward',
        'game_payment_reward',
        'game_account_create',
        'game_daily_login',
        'game_play_time',
        'game_purchase',
        'game_event_participate',
        'game_level_achieve',
        'game_ranking',
        'admin_grant',
        'admin_deduct',
      ],
      required: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

activityScoreSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model<IActivityScore>('ActivityScore', activityScoreSchema)
