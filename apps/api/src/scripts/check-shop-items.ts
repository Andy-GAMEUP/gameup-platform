import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { GameShopItemModel as ShopItem } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function run() {
  await mongoose.connect(MONGO_URI)
  const items = await ShopItem.find({}).populate('gameId', 'title').select('_id name itemId price gameId')
  items.forEach(i => console.log(
    String(i._id), '|', (i.gameId as any)?.title, '|', i.name, '| itemId:', i.itemId, '| price:', i.price
  ))
  console.log('총', items.length, '개')
  await mongoose.disconnect()
}
run().catch(console.error)
