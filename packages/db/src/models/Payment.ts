import mongoose, { Document, Schema } from 'mongoose'

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId
  gameId: mongoose.Types.ObjectId
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  pgOrderId: string
  pgTransactionId: string
  pgProvider: string
  metadata: {
    gameName?: string
    itemName?: string
    itemId?: string
    productName?: string
    paymentMethod?: string
    paidAt?: Date
  }
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>({
  userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  gameId:          { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  amount:          { type: Number, required: true },
  currency:        { type: String, default: 'KRW' },
  status:          { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  pgOrderId:       { type: String, default: '' },
  pgTransactionId: { type: String, default: '' },
  pgProvider:      { type: String, default: 'none' },
  metadata: {
    gameName:      String,
    itemName:      String,
    itemId:        String,
    // PG(토스/뉴플레이)에 실제로 보낸 상품명 원문 (게임명/상품ID가 붙은 전체 텍스트) — itemName은 우리 화면용 깔끔한 버전
    productName:   String,
    // 뉴플레이 웹훅이 실어 보내는 실제 결제수단(카드/카카오페이 등)과 결제 완료 시각 — 웹훅 처리 시 채워짐
    paymentMethod: String,
    paidAt:        Date,
  }
}, { timestamps: true })

PaymentSchema.index({ userId: 1, createdAt: -1 })
PaymentSchema.index({ status: 1 })
// pgOrderId는 결제 조회/승인/웹훅의 유일한 외부 키라서 충돌하면 다른 주문을 잘못 갱신할 수 있음 — 유니크 제약 추가
// (기존에 pgOrderId를 안 쓰는 흐름이 있을 수 있어 빈 문자열/미설정은 제약에서 제외하는 partial index)
PaymentSchema.index(
  { pgOrderId: 1 },
  { unique: true, partialFilterExpression: { pgOrderId: { $type: 'string', $gt: '' } } }
)

export default mongoose.model<IPayment>('Payment', PaymentSchema)
