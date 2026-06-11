import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { UserModel as User } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function run() {
  await mongoose.connect(MONGO_URI)
  const users = await User.find({}).select('_id username email role').limit(30)
  users.forEach(u => console.log(String(u._id), '|', u.role, '|', u.username, '|', u.email))
  await mongoose.disconnect()
}
run().catch(console.error)
