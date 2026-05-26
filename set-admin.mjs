import mongoose from './apps/api/node_modules/mongoose/index.js'

await mongoose.connect('mongodb://localhost:27017/gameup')
const result = await mongoose.connection.collection('users').updateOne(
  { email: 'admin@gameup.com' },
  { $set: { adminLevel: 'super' } }
)
console.log('수정 결과:', result.modifiedCount === 1 ? '✅ 성공' : '❌ 실패 (계정을 찾지 못했거나 이미 super)')
await mongoose.disconnect()
