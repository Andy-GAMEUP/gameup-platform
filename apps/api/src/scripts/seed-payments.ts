import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { UserModel as User, GameShopItemModel as ShopItem, PaymentModel as Payment } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

const PROVIDERS = ['toss', 'kakaopay', 'naverpay', 'card']
const STATUSES: Array<'completed' | 'refunded' | 'failed' | 'pending'> = [
  'completed', 'completed', 'completed', 'completed',
  'refunded', 'failed', 'pending',
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysAgo: number): Date {
  return new Date(Date.now() - Math.random() * daysAgo * 86400000)
}

function orderId(): string {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
}

async function run() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  // itemId가 있는 상품만
  const items = await ShopItem.find({ itemId: { $exists: true, $ne: '' } }).populate('gameId', 'title')
  if (items.length === 0) { console.log('itemId가 등록된 상품이 없습니다.'); process.exit(1) }

  const users = await User.find({ role: { $ne: 'admin' } }).select('_id')
  if (users.length === 0) { console.log('유저가 없습니다.'); process.exit(1) }

  console.log(`상품 ${items.length}개, 유저 ${users.length}명으로 더미 생성`)

  // 기존 더미 결제 전부 삭제
  const deleted = await Payment.deleteMany({})
  console.log(`기존 결제 ${deleted.deletedCount}건 삭제`)

  const docs = Array.from({ length: 150 }, () => {
    const item = randomItem(items)
    return {
      userId:          randomItem(users)._id,
      gameId:          (item.gameId as any)._id,
      amount:          item.price,
      currency:        item.currency || 'KRW',
      status:          randomItem(STATUSES),
      pgOrderId:       orderId(),
      pgTransactionId: 'TXN-' + Math.random().toString(36).slice(2, 12).toUpperCase(),
      pgProvider:      randomItem(PROVIDERS),
      metadata: {
        gameName: (item.gameId as any).title,
        itemName: item.name,
        itemId:   item.itemId,
      },
      createdAt: randomDate(90),
    }
  })

  await Payment.insertMany(docs)
  console.log(`더미 결제 ${docs.length}건 삽입 완료`)

  const byStatus = docs.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  console.log('상태별:', byStatus)

  await mongoose.disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
