import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PaymentModel as Payment } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function run() {
  await mongoose.connect(MONGO_URI)
  const payments = await Payment.find({ 'metadata.itemId': { $exists: false } })
  console.log(`itemId 없는 결제 ${payments.length}건 패치 시작`)
  for (const p of payments) {
    const itemId = 'ITEM-' + Math.random().toString(36).slice(2, 10).toUpperCase()
    await Payment.updateOne({ _id: p._id }, { $set: { 'metadata.itemId': itemId } })
  }
  console.log('완료')
  await mongoose.disconnect()
}
run().catch(console.error)
