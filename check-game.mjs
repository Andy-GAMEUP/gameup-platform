import mongoose from './apps/api/node_modules/mongoose/index.js'

await mongoose.connect('mongodb://localhost:27017/gameup')
const game = await mongoose.connection.collection('games').findOne(
  { _id: new mongoose.Types.ObjectId('6a05259371e33b2b8367534d') }
)
if (!game) {
  console.log('❌ 게임을 찾을 수 없습니다')
} else {
  console.log('gameDomain   :', game.gameDomain)
  console.log('gameFile     :', game.gameFile)
  console.log('status       :', game.status)
  console.log('approvalStatus:', game.approvalStatus)
  console.log('title        :', game.title)
}
await mongoose.disconnect()
