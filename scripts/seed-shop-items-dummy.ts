import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

const GAME_ID    = '6a05259371e33b2b8367534d'
const DEVELOPER_ID = '6a042c5f0c9c4aa1503f1afb'

const items = [
  { name: '스타터 패키지 (더미)',    price: 990,    type: '패키지',  sales: 312 },
  { name: '골드 1000 (더미)',        price: 1200,   type: '재화',    sales: 287 },
  { name: '프리미엄 패스 (더미)',    price: 4900,   type: '패스',    sales: 201 },
  { name: '다이아 500 (더미)',       price: 2500,   type: '재화',    sales: 178 },
  { name: '시즌 번들 (더미)',        price: 9900,   type: '패키지',  sales: 154 },
  { name: '골드 3000 (더미)',        price: 3300,   type: '재화',    sales: 140 },
  { name: '레전드 스킨팩 (더미)',    price: 6500,   type: '스킨',    sales: 118 },
  { name: '부스터 7일권 (더미)',     price: 1800,   type: '부스터',  sales: 103 },
  { name: '다이아 2000 (더미)',      price: 9000,   type: '재화',    sales:  89 },
  { name: '이벤트 코인 (더미)',      price: 500,    type: '재화',    sales:  76 },
  { name: '무기 강화석 10개 (더미)', price: 2200,   type: '아이템',  sales:  65 },
  { name: 'VIP 30일권 (더미)',       price: 14900,  type: '구독',    sales:  58 },
  { name: '엘리트 패키지 (더미)',    price: 19900,  type: '패키지',  sales:  47 },
  { name: '캐릭터 슬롯 +1 (더미)',   price: 3000,   type: '확장',    sales:  42 },
  { name: '골드 10000 (더미)',       price: 9900,   type: '재화',    sales:  39 },
  { name: '코스튬 랜덤박스 (더미)',  price: 1500,   type: '박스',    sales:  31 },
  { name: '레이드 티켓 5장 (더미)',  price: 2000,   type: '티켓',    sales:  24 },
  { name: '펫 소환권 (더미)',        price: 3500,   type: '소환',    sales:  17 },
  { name: '얼티밋 번들 (더미)',      price: 49900,  type: '패키지',  sales:   9 },
  { name: '창립기념 패키지 (더미)',  price: 990,    type: '이벤트',  sales:   3 },
]

async function main() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB 연결됨')

  const col = mongoose.connection.collection('gameshopitems')

  const docs = items.map(item => ({
    gameId:      new mongoose.Types.ObjectId(GAME_ID),
    developerId: new mongoose.Types.ObjectId(DEVELOPER_ID),
    name:        item.name,
    price:       item.price,
    currency:    'KRW',
    type:        item.type,
    stock:       '무제한',
    description: `${item.name} 상품입니다.`,
    active:      true,
    sales:       item.sales,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  }))

  const result = await col.insertMany(docs)
  console.log(`${result.insertedCount}개 더미 상품 삽입 완료`)

  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
