import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { UserModel as User } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup')
  const users = await User.find({ role: 'developer' }).select('username companyInfo').lean()
  users.forEach((u: any) => console.log(u.username, '|', u.companyInfo?.companyName || '(없음)'))
  await mongoose.disconnect()
}
run().catch(console.error)
