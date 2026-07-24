import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PartnerModel as Partner } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function run() {
  await mongoose.connect(MONGO_URI)
  const result = await Partner.collection.updateMany(
    { $or: [{ certifications: { $exists: true } }, { workExperience: { $exists: true } }] },
    { $unset: { certifications: '', workExperience: '' } }
  )
  console.log(`경력·자격증 필드 정리: ${result.modifiedCount}건`)
  await mongoose.disconnect()
}
run().catch(console.error)
