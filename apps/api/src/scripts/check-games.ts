import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { GameModel as Game, PaymentModel as Payment } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function run() {
  await mongoose.connect(MONGO_URI)
  const games = await Game.find({}).select('_id title developerId').limit(20)
  games.forEach(g => console.log(String(g._id), '|', g.title, '| dev:', String((g as any).developerId)))
  const total = await Payment.countDocuments({})
  console.log('\n총 결제 수:', total)
  await mongoose.disconnect()
}
run().catch(console.error)
