import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  UserModel as User,
  GameModel as Game,
  PostModel as Post,
  AnnouncementModel as Announcement,
  LevelModel as Level,
  SeasonModel as Season,
  PartnerModel as Partner,
  TopicGroupModel as TopicGroup,
} from '@gameup/db'
import { hashPassword } from '../services/authService'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function seed() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB 연결 성공\n')

  const hashedPw = await hashPassword('test123456')

  // ─── 1. Users ──────────────────────────────────────────────
  console.log('👤 사용자 생성...')

  const admin = await User.findOneAndUpdate(
    { email: 'admin@gameup.com' },
    {
      email: 'admin@gameup.com',
      username: 'admin',
      password: hashedPw,
      role: 'admin',
      isActive: true,
      memberType: 'individual',
      level: 10,
      activityScore: 500,
      points: 10000,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  const dev = await User.findOneAndUpdate(
    { email: 'developer@test.com' },
    {
      email: 'developer@test.com',
      username: 'testdev',
      password: hashedPw,
      role: 'developer',
      isActive: true,
      memberType: 'corporate',
      level: 5,
      activityScore: 200,
      points: 5000,
      companyInfo: {
        companyName: '인디게임 스튜디오',
        phone: '02-1234-5678',
        companyEmail: 'contact@indiegame.co.kr',
        employeeCount: 5,
        businessNumber: '123-45-67890',
        companyType: ['개발사'],
        homepageUrl: 'https://indiegame.co.kr',
        isApproved: true,
        description: '인디 게임을 개발하는 작은 스튜디오입니다.',
      },
      contactPerson: { name: '김개발', email: 'kim@indiegame.co.kr' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  const player = await User.findOneAndUpdate(
    { email: 'player@test.com' },
    {
      email: 'player@test.com',
      username: 'testplayer',
      password: hashedPw,
      role: 'player',
      isActive: true,
      memberType: 'individual',
      level: 3,
      activityScore: 80,
      points: 1500,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  console.log('  ✅ admin@gameup.com / test123456 (관리자)')
  console.log('  ✅ developer@test.com / test123456 (개발자)')
  console.log('  ✅ player@test.com / test123456 (플레이어)')

  // ─── 2. Levels ─────────────────────────────────────────────
  console.log('\n📊 레벨 설정...')

  const levels = [
    { level: 1, name: '뉴비', requiredScore: 0 },
    { level: 2, name: '초보', requiredScore: 20 },
    { level: 3, name: '견습생', requiredScore: 50 },
    { level: 4, name: '루키', requiredScore: 100 },
    { level: 5, name: '일반', requiredScore: 150 },
    { level: 6, name: '중급', requiredScore: 200 },
    { level: 7, name: '숙련자', requiredScore: 280 },
    { level: 8, name: '베테랑', requiredScore: 360 },
    { level: 9, name: '전문가', requiredScore: 450 },
    { level: 10, name: '마스터', requiredScore: 550 },
    { level: 11, name: '그랜드마스터', requiredScore: 650 },
    { level: 12, name: '레전드', requiredScore: 800 },
  ]

  for (const lv of levels) {
    await Level.findOneAndUpdate({ level: lv.level }, lv, { upsert: true })
  }
  console.log(`  ✅ ${levels.length}개 레벨 설정 완료`)

  // ─── 3. Games ──────────────────────────────────────────────
  console.log('\n🎮 샘플 게임 등록...')

  const games = [
    {
      title: '던전 어드벤처',
      description: '로그라이크 던전 탐험 게임입니다. 매번 달라지는 던전에서 모험을 즐겨보세요.',
      genre: 'RPG',
      platform: 'PC, Mobile',
      status: 'beta',
      approvalStatus: 'approved',
      developerId: dev._id,
      playCount: 1250,
      rating: 4.2,
    },
    {
      title: '스타 디펜더',
      description: '우주를 배경으로 한 타워 디펜스 게임. 외계 침략자로부터 기지를 방어하세요!',
      genre: 'Strategy',
      platform: 'PC',
      status: 'beta',
      approvalStatus: 'approved',
      developerId: dev._id,
      playCount: 890,
      rating: 4.5,
    },
    {
      title: '픽셀 레이서',
      description: '레트로 스타일 레이싱 게임. 친구들과 함께 경쟁하세요.',
      genre: 'Racing',
      platform: 'PC, Mobile',
      status: 'published',
      approvalStatus: 'approved',
      developerId: dev._id,
      playCount: 2300,
      rating: 3.8,
    },
    {
      title: '마법사의 탑',
      description: '퍼즐 어드벤처 게임. 마법사의 탑 꼭대기를 향해 퍼즐을 풀어나가세요.',
      genre: 'Puzzle',
      platform: 'Mobile',
      status: 'pending',
      approvalStatus: 'pending',
      developerId: dev._id,
      playCount: 0,
      rating: 0,
    },
  ]

  for (const g of games) {
    await Game.findOneAndUpdate({ title: g.title }, g, { upsert: true })
  }
  console.log(`  ✅ ${games.length}개 게임 등록 완료`)

  // ─── 4. Community Posts ────────────────────────────────────
  console.log('\n💬 커뮤니티 게시글...')

  const channels = ['general-question', 'dev-question', 'daily-talk', 'game-talk', 'info-share', 'new-game']
  const postData = [
    { title: '게임업 베타 오픈했습니다!', content: '<p>게임업 베타 버전이 오픈했습니다. 많은 피드백 부탁드립니다! 🎮</p>', channel: 'info-share', authorId: admin._id },
    { title: 'Unity vs Godot 어떤 걸 쓰시나요?', content: '<p>인디 게임 개발에 유니티와 고도 중 어떤 것이 더 적합한지 경험 공유해주세요.</p>', channel: 'dev-question', authorId: dev._id },
    { title: '오늘 뭐하고 놀까요', content: '<p>주말인데 같이 게임할 분 있으신가요?</p>', channel: 'daily-talk', authorId: player._id },
    { title: '던전 어드벤처 후기', content: '<p>진짜 재밌어요! 특히 보스전 난이도가 적절해서 좋았습니다.</p>', channel: 'game-talk', authorId: player._id },
    { title: 'GDC 2026 하이라이트 정리', content: '<p>GDC 2026에서 발표된 인디 게임 관련 주요 세션을 정리해보았습니다.</p>', channel: 'info-share', authorId: dev._id },
    { title: 'Next.js로 게임 웹 포탈 만들기', content: '<p>Next.js App Router를 활용한 게임 포탈 사이트 구축 경험을 공유합니다.</p>', channel: 'dev-question', authorId: dev._id },
  ]

  for (const p of postData) {
    await Post.findOneAndUpdate({ title: p.title }, { ...p, viewCount: Math.floor(Math.random() * 500), likeCount: Math.floor(Math.random() * 50) }, { upsert: true })
  }
  console.log(`  ✅ ${postData.length}개 게시글 작성 완료`)

  // ─── 5. Announcements ──────────────────────────────────────
  console.log('\n📢 공지사항...')

  const announcements = [
    { title: '게임업 플랫폼 베타 서비스 오픈', content: '<p>게임업 플랫폼의 베타 서비스가 오픈되었습니다.</p>', type: 'notice', priority: 'high', isPublished: true, isPinned: true, targetRole: 'all', authorId: admin._id },
    { title: '서비스 점검 안내 (3/15)', content: '<p>3월 15일 02:00~06:00 서비스 점검이 예정되어 있습니다.</p>', type: 'maintenance', priority: 'normal', isPublished: true, isPinned: false, targetRole: 'all', authorId: admin._id },
    { title: '파트너 채널 오픈 기념 이벤트', content: '<p>파트너 채널 오픈을 기념하여 포인트 지급 이벤트를 진행합니다!</p>', type: 'event', priority: 'normal', isPublished: true, isPinned: false, targetRole: 'all', authorId: admin._id },
  ]

  for (const a of announcements) {
    await Announcement.findOneAndUpdate({ title: a.title }, { ...a, publishedAt: new Date() }, { upsert: true })
  }
  console.log(`  ✅ ${announcements.length}개 공지사항 작성 완료`)

  // ─── 6. Partner + Topics ───────────────────────────────────
  console.log('\n🤝 파트너...')

  const topicGroup = await TopicGroup.findOneAndUpdate(
    { name: '게임 개발' },
    {
      name: '게임 개발',
      description: '게임 개발 관련 파트너 채널 주제',
      topics: [
        { name: '개발 일지', slug: 'dev-log' },
        { name: '기술 공유', slug: 'tech-share' },
        { name: '아트 공유', slug: 'art-share' },
      ],
      order: 1,
    },
    { upsert: true, new: true }
  )

  await Partner.findOneAndUpdate(
    { userId: dev._id },
    {
      userId: dev._id,
      channelName: '인디게임 스튜디오',
      description: '인디 게임 개발 스토리와 기술 블로그를 공유합니다.',
      status: 'approved',
      topicGroupId: topicGroup._id,
      followerCount: 42,
    },
    { upsert: true }
  )
  console.log('  ✅ 파트너 채널 1개 생성 완료')

  // ─── 7. Support Season ─────────────────────────────────────
  console.log('\n🏆 지원 프로그램 시즌...')

  await Season.findOneAndUpdate(
    { title: '2026 상반기 인디 게임 지원' },
    {
      title: '2026 상반기 인디 게임 지원',
      description: '인디 게임 개발사를 위한 지원 프로그램입니다. 선정된 게임에 개발비 및 마케팅을 지원합니다.',
      status: 'recruiting',
      recruitStartDate: new Date('2026-03-01'),
      recruitEndDate: new Date('2026-04-30'),
      supportStartDate: new Date('2026-05-15'),
      supportEndDate: new Date('2026-11-15'),
      maxGames: 10,
    },
    { upsert: true }
  )
  console.log('  ✅ 지원 시즌 1개 생성 완료')

  // ─── Done ──────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 시드 데이터 생성 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n📋 로그인 정보:')
  console.log('  👑 관리자: admin@gameup.com / test123456')
  console.log('  👨‍💻 개발자: developer@test.com / test123456')
  console.log('  🎮 플레이어: player@test.com / test123456')
  console.log('\n🌐 접속 URL:')
  console.log('  서비스: http://localhost:3000')
  console.log('  관리자: http://localhost:3000/admin')
  console.log('  API:    http://localhost:5000/api/health')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  await mongoose.connection.close()
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ 시드 실패:', err)
  process.exit(1)
})
