import mongoose from './apps/api/node_modules/mongoose/index.js'

await mongoose.connect('mongodb://localhost:27017/gameup')
const result = await mongoose.connection.collection('games').updateOne(
  { _id: new mongoose.Types.ObjectId('6a05259371e33b2b8367534d') },
  { $set: { gameDomain: 'http://localhost:3000/dino-game.html' } }
)
console.log('결과:', result.modifiedCount === 1 ? '✅ URL 업데이트 완료 → http://localhost:3000/dino-game.html' : '❌ 실패')
await mongoose.disconnect()
