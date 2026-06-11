import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { GameModel as Game, SettlementModel as Settlement } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

// 이번 달 기준 n개월 전 (월 초/말)
function monthRange(monthsAgo: number): { from: Date; to: Date } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const to   = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59)
  return { from, to }
}

// 정산일 = 해당 월 말일 다음달 10일 (e.g. 5월 → 6월 10일)
function settledAt(monthsAgo: number): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 10)
}

function round(n: number) { return Math.round(n) }

async function run() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  // 상용화(freemium/paid) 게임만
  const games = await Game.find({
    monetization: { $in: ['freemium', 'paid', 'ad'] },
  }).select('_id developerId title').lean()

  if (games.length === 0) {
    console.log('수익화 게임이 없습니다. 전체 게임으로 시도합니다.')
  }

  const targets = games.length > 0
    ? games
    : await Game.find({}).select('_id developerId title').lean()

  if (targets.length === 0) {
    console.log('게임이 없습니다.'); process.exit(1)
  }

  console.log(`게임 ${targets.length}개, 최근 6개월 정산 생성`)

  await Settlement.deleteMany({})
  console.log('기존 정산 데이터 삭제')

  const docs = []

  for (const game of targets) {
    // 게임마다 최근 6개월치 (0 = 이번 달, 5 = 6개월 전)
    // 이번 달은 정산 미완료(pending), 나머지는 completed
    for (let mo = 5; mo >= 0; mo--) {
      const { from, to } = monthRange(mo)
      const settled = settledAt(mo)

      // 매출: 게임마다 랜덤 규모 (50만~500만)
      const baseRevenue = Math.floor(500000 + Math.random() * 4500000)
      const revenue     = round(baseRevenue * (0.9 + Math.random() * 0.2))  // ±10% 변동

      const vat               = round(revenue * 0.1)
      const paybackExpired    = round(revenue * (Math.random() * 0.05))      // 0~5%
      const platformFee       = round(revenue * 0.05)                         // 5%
      const paymentMethodFee  = round(revenue * 0.015)                        // 1.5%
      const carryover         = round(revenue * (Math.random() * 0.03))       // 0~3% 이월
      const paybackComp       = round(revenue * (Math.random() * 0.02))       // 0~2% 페이백 보상

      const baseSettlement   = revenue - vat - platformFee - paymentMethodFee
      const settlementAmount = baseSettlement + paybackExpired + carryover - paybackComp

      docs.push({
        gameId:               game._id,
        developerId:          game.developerId,
        settledAt:            settled,
        periodFrom:           from,
        periodTo:             to,
        revenue,
        vat,
        paybackExpiredAmount: paybackExpired,
        platformFee,
        paymentMethodFee,
        baseSettlement,
        carryoverAmount:      carryover,
        paybackCompensation:  paybackComp,
        settlementAmount,
        status:               mo === 0 ? 'pending' : 'completed',
      })
    }
  }

  await Settlement.insertMany(docs)
  console.log(`정산 데이터 ${docs.length}건 삽입 완료 (게임 ${targets.length}개 × 6개월)`)

  // 요약
  const total = docs.reduce((s, d) => s + d.settlementAmount, 0)
  console.log(`총 정산 금액: ₩${total.toLocaleString()}`)

  await mongoose.disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
