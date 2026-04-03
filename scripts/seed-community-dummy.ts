/**
 * 커뮤니티 더미 게시글 시드 스크립트
 * 다양한 채널, 이미지, 좋아요, 댓글, 게임 연동 등을 포함
 *
 * 실행: npx ts-node scripts/seed-community-dummy.ts
 */
import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'

// 샘플 이미지 URL (Picsum 기반)
const sampleImages = [
  'https://picsum.photos/seed/game1/800/450',
  'https://picsum.photos/seed/game2/800/450',
  'https://picsum.photos/seed/game3/800/450',
  'https://picsum.photos/seed/game4/800/450',
  'https://picsum.photos/seed/game5/800/450',
  'https://picsum.photos/seed/game6/800/450',
  'https://picsum.photos/seed/game7/800/450',
  'https://picsum.photos/seed/game8/800/450',
  'https://picsum.photos/seed/game9/800/450',
  'https://picsum.photos/seed/game10/800/450',
]

async function seed() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('📦 MongoDB 연결 성공')

    const db = mongoose.connection.db
    if (!db) throw new Error('DB 연결 실패')

    // 기존 유저/게임 조회
    const users = await db.collection('users').find({}).toArray()
    const games = await db.collection('games').find({}).toArray()

    if (users.length === 0) {
      console.log('❌ 유저가 없습니다. 먼저 seed를 실행해주세요.')
      return
    }

    const admin = users.find(u => u.role === 'admin')
    const devs = users.filter(u => u.role === 'developer')
    const players = users.filter(u => u.role === 'player')
    const allUsers = [...(admin ? [admin] : []), ...devs, ...players]

    console.log(`👤 유저: admin=${admin?.username}, devs=${devs.length}, players=${players.length}`)
    console.log(`🎮 게임: ${games.length}개`)

    // 기존 더미 게시글 삭제 (태그에 'dummy' 포함된 것만)
    const deleted = await db.collection('posts').deleteMany({ tags: 'dummy-seed' })
    console.log(`🗑️ 기존 더미 게시글 ${deleted.deletedCount}개 삭제`)

    // 더미 게시글 데이터
    const now = new Date()
    const dummyPosts = [
      // ── 공지사항 (notice) ──
      {
        title: '📢 커뮤니티 이용 가이드 & 규칙 안내',
        content: '<h2>환영합니다!</h2><p>GAMEUP 커뮤니티에 오신 것을 환영합니다. 아래 규칙을 지켜주세요.</p><ul><li>상호 존중하는 대화를 해주세요</li><li>스팸, 광고성 게시글은 삭제됩니다</li><li>게임 관련 건설적인 피드백을 남겨주세요</li><li>버그 제보는 가능한 상세하게 작성해주세요</li></ul><p>즐거운 커뮤니티 활동 되세요! 🎮</p>',
        author: admin?._id || allUsers[0]._id,
        channel: 'notice',
        images: [],
        tags: ['공지', '가이드', 'dummy-seed'],
        isPinned: true,
        isHot: false,
        hotScore: 50,
        views: 1520,
        likes: players.slice(0, 5).map(u => u._id),
        bookmarks: players.slice(0, 3).map(u => u._id),
        commentCount: 8,
        createdAt: new Date(now.getTime() - 7 * 24 * 3600000),
      },
      {
        title: '🔧 3월 정기 업데이트 안내 (v2.5.0)',
        content: '<p>안녕하세요, GAMEUP 운영팀입니다.</p><p>3월 정기 업데이트 내용을 안내드립니다.</p><h3>주요 변경사항</h3><ul><li>커뮤니티 UI 개편 (카드형 레이아웃)</li><li>이미지 업로드 기능 추가</li><li>동영상 링크 지원</li><li>인기 게시글/게임 캐러셀 추가</li></ul><p>앞으로도 많은 관심 부탁드립니다.</p>',
        author: admin?._id || allUsers[0]._id,
        channel: 'notice',
        images: [sampleImages[0]],
        tags: ['업데이트', '패치노트', 'dummy-seed'],
        isPinned: true,
        isHot: false,
        hotScore: 45,
        views: 980,
        likes: players.slice(0, 4).map(u => u._id),
        bookmarks: players.slice(1, 4).map(u => u._id),
        commentCount: 12,
        createdAt: new Date(now.getTime() - 2 * 24 * 3600000),
      },

      // ── 자유게시판 (free) ──
      {
        title: '오늘 드래곤 하트 사가 처음 해봤는데 진짜 재밌네요',
        content: '<p>친구가 추천해줘서 드래곤 하트 사가 처음 해봤습니다.</p><p>그래픽이 생각보다 너무 좋고, 스토리도 탄탄해요. 특히 챕터 3 보스전이 엄청 긴장감 있었습니다.</p><p>다들 어디까지 진행하셨나요? 팁 있으면 공유해주세요! 😊</p>',
        author: players[0]?._id || allUsers[1]._id,
        channel: 'free',
        gameId: games.find(g => g.title === '드래곤 하트 사가')?._id,
        images: [sampleImages[1], sampleImages[2]],
        tags: ['드래곤하트사가', '후기', '추천', 'dummy-seed'],
        isPinned: false,
        isHot: true,
        hotScore: 35,
        views: 450,
        likes: allUsers.slice(0, 6).map(u => u._id),
        bookmarks: allUsers.slice(0, 2).map(u => u._id),
        commentCount: 15,
        createdAt: new Date(now.getTime() - 1 * 24 * 3600000),
      },
      {
        title: '주말 게이밍 세션 후기 - 우주 전사단 멀티플레이',
        content: '<p>주말에 친구들이랑 우주 전사단 멀티플레이를 했습니다.</p><p>3시간 동안 미션을 클리어하면서 정말 재밌었어요. 협동 미션이 잘 짜여있더라고요.</p><p>스크린샷 몇 장 올립니다!</p>',
        author: players[1]?._id || allUsers[2]._id,
        channel: 'free',
        gameId: games.find(g => g.title === '우주 전사단')?._id,
        images: [sampleImages[3], sampleImages[4], sampleImages[5]],
        thumbnailIndex: 0,
        tags: ['우주전사단', '멀티플레이', '주말', 'dummy-seed'],
        isPinned: false,
        isHot: false,
        hotScore: 20,
        views: 280,
        likes: allUsers.slice(2, 5).map(u => u._id),
        bookmarks: [],
        commentCount: 7,
        createdAt: new Date(now.getTime() - 3 * 24 * 3600000),
      },
      {
        title: '요즘 인디게임 추천 부탁드려요',
        content: '<p>최근에 할만한 인디게임을 찾고 있는데, 추천해주실 수 있나요?</p><p>저는 RPG, 퍼즐 장르를 좋아하고 스토리가 탄탄한 게임을 선호합니다.</p><p>플레이 시간은 10-20시간 정도면 좋겠어요.</p>',
        author: players[2]?._id || players[0]?._id || allUsers[1]._id,
        channel: 'free',
        images: [],
        tags: ['인디게임', '추천', 'RPG', '퍼즐', 'dummy-seed'],
        isPinned: false,
        isHot: false,
        hotScore: 15,
        views: 190,
        likes: allUsers.slice(0, 3).map(u => u._id),
        bookmarks: allUsers.slice(0, 1).map(u => u._id),
        commentCount: 22,
        createdAt: new Date(now.getTime() - 5 * 24 * 3600000),
      },
      {
        title: '레이싱 킹스 신규 트랙 너무 어려운거 아닌가요?',
        content: '<p>레이싱 킹스 최근 업데이트에서 추가된 산악 트랙이 너무 어렵습니다.</p><p>드리프트 구간이 연속으로 나오는데, 컨트롤이 잘 안되네요. 다른 분들은 어떠신가요?</p><p>공략 영상도 첨부합니다.</p>',
        author: players[0]?._id || allUsers[1]._id,
        channel: 'free',
        gameId: games.find(g => g.title === '레이싱 킹스')?._id,
        images: [sampleImages[6]],
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        tags: ['레이싱킹스', '공략', '난이도', 'dummy-seed'],
        isPinned: false,
        isHot: false,
        hotScore: 12,
        views: 156,
        likes: allUsers.slice(1, 4).map(u => u._id),
        bookmarks: [],
        commentCount: 9,
        createdAt: new Date(now.getTime() - 6 * 24 * 3600000),
      },
      {
        title: '게임 개발자분들 진짜 존경합니다',
        content: '<p>최근에 GAMEUP에서 여러 인디게임들을 플레이해봤는데, 소규모 팀에서 이런 퀄리티의 게임을 만든다는게 정말 대단해요.</p><p>개발자분들 응원합니다! 💪</p>',
        author: players[1]?._id || allUsers[2]._id,
        channel: 'free',
        images: [],
        tags: ['인디게임', '응원', '개발자', 'dummy-seed'],
        isPinned: false,
        isHot: false,
        hotScore: 25,
        views: 340,
        likes: allUsers.slice(0, 7).map(u => u._id),
        bookmarks: allUsers.slice(0, 2).map(u => u._id),
        commentCount: 5,
        createdAt: new Date(now.getTime() - 4 * 24 * 3600000),
      },

      // ── 베타게임 (beta-game) ──
      {
        title: '[CBT 후기] 사이버 퀘스트 2077 - 기대 이상!',
        content: '<p>사이버 퀘스트 2077 CBT에 참여했습니다.</p><p>네온 시티의 분위기가 정말 몰입감 있고, 해킹 시스템이 독특합니다.</p><h3>좋았던 점</h3><ul><li>그래픽 퀄리티가 높음</li><li>해킹 퍼즐이 재미있음</li><li>NPC 대화가 자연스러움</li></ul><h3>개선 희망사항</h3><ul><li>로딩 시간이 다소 길음</li><li>일부 UI 반응이 느림</li></ul><p>정식 출시가 기대됩니다!</p>',
        author: players[2]?._id || players[0]?._id || allUsers[1]._id,
        channel: 'beta-game',
        gameId: games.find(g => g.title === '사이버 퀘스트 2077')?._id,
        images: [sampleImages[7], sampleImages[8], sampleImages[9]],
        thumbnailIndex: 1,
        tags: ['사이버퀘스트2077', 'CBT', '후기', 'dummy-seed'],
        isPinned: false,
        isHot: true,
        hotScore: 40,
        views: 620,
        likes: allUsers.slice(0, 8).map(u => u._id),
        bookmarks: allUsers.slice(0, 4).map(u => u._id),
        commentCount: 18,
        createdAt: new Date(now.getTime() - 1.5 * 24 * 3600000),
      },
      {
        title: '퍼즐 마스터 베타 버그 제보합니다',
        content: '<p>퍼즐 마스터 베타 테스트 중 발견한 버그를 제보합니다.</p><p>스테이지 15에서 블록이 겹치는 현상이 발생합니다. 재현 방법:</p><ol><li>스테이지 15 시작</li><li>빨간 블록을 오른쪽으로 2칸 이동</li><li>파란 블록을 위로 1칸 이동</li><li>블록이 겹치면서 진행 불가</li></ol><p>스크린샷 첨부합니다.</p>',
        author: players[0]?._id || allUsers[1]._id,
        channel: 'beta-game',
        gameId: games.find(g => g.title === '퍼즐 마스터')?._id,
        images: [sampleImages[2]],
        tags: ['퍼즐마스터', '버그', '제보', 'dummy-seed'],
        isPinned: false,
        isHot: false,
        hotScore: 10,
        views: 95,
        likes: allUsers.slice(0, 2).map(u => u._id),
        bookmarks: [],
        commentCount: 3,
        createdAt: new Date(now.getTime() - 2.5 * 24 * 3600000),
      },
      {
        title: '우주 전사단 CBT 2차 모집 시작!',
        content: '<p>우주 전사단 2차 CBT 모집이 시작되었습니다!</p><p>모집 기간: 3월 15일 ~ 3월 20일</p><p>테스트 기간: 3월 22일 ~ 3월 30일</p><p>참여 방법은 게임 페이지에서 신청해주세요.</p><p>많은 참여 부탁드립니다! 🚀</p>',
        author: devs[0]?._id || allUsers[0]._id,
        channel: 'beta-game',
        gameId: games.find(g => g.title === '우주 전사단')?._id,
        images: [sampleImages[4]],
        videoUrl: 'https://www.youtube.com/watch?v=example123',
        tags: ['우주전사단', 'CBT', '모집', 'dummy-seed'],
        isPinned: false,
        isHot: true,
        hotScore: 30,
        views: 410,
        likes: allUsers.slice(0, 5).map(u => u._id),
        bookmarks: allUsers.slice(0, 3).map(u => u._id),
        commentCount: 11,
        createdAt: new Date(now.getTime() - 0.5 * 24 * 3600000),
      },

      // ── 라이브게임 (live-game) ──
      {
        title: '드래곤 하트 사가 시즌 3 공략 가이드',
        content: '<h2>시즌 3 공략 가이드</h2><p>시즌 3에서 추가된 새로운 던전과 보스에 대한 공략입니다.</p><h3>신규 던전: 화염의 성채</h3><p>추천 레벨: 45 이상</p><p>필수 아이템: 얼음 저항 반지</p><h3>보스 공략</h3><p>1페이즈: 원거리 공격 위주로 플레이</p><p>2페이즈: 패턴 3회 후 본체 공격</p><p>3페이즈: 범위 공격 회피 → 약점 타격</p>',
        author: players[1]?._id || allUsers[2]._id,
        channel: 'live-game',
        gameId: games.find(g => g.title === '드래곤 하트 사가')?._id,
        images: [sampleImages[5], sampleImages[6]],
        tags: ['드래곤하트사가', '공략', '시즌3', 'dummy-seed'],
        isPinned: false,
        isHot: true,
        hotScore: 38,
        views: 520,
        likes: allUsers.slice(0, 7).map(u => u._id),
        bookmarks: allUsers.slice(0, 5).map(u => u._id),
        commentCount: 14,
        createdAt: new Date(now.getTime() - 1 * 24 * 3600000),
      },
      {
        title: '레이싱 킹스 랭킹 시즌 4 결과 공유',
        content: '<p>시즌 4 랭킹전이 종료되었습니다!</p><p>최종 순위: 다이아몬드 3 🏆</p><p>이번 시즌은 새로운 차량 밸런스 패치 덕분에 다양한 차량을 볼 수 있어서 좋았습니다.</p><p>다음 시즌도 화이팅!</p>',
        author: players[2]?._id || players[0]?._id || allUsers[1]._id,
        channel: 'live-game',
        gameId: games.find(g => g.title === '레이싱 킹스')?._id,
        images: [sampleImages[8]],
        tags: ['레이싱킹스', '랭킹', '시즌4', 'dummy-seed'],
        isPinned: false,
        isHot: false,
        hotScore: 18,
        views: 230,
        likes: allUsers.slice(0, 4).map(u => u._id),
        bookmarks: allUsers.slice(0, 1).map(u => u._id),
        commentCount: 6,
        createdAt: new Date(now.getTime() - 3.5 * 24 * 3600000),
      },
      {
        title: '테스트 RPG 게임 이벤트 퀘스트 보상이 짜요',
        content: '<p>이번 이벤트 퀘스트 보상이 너무 적은 것 같아요.</p><p>지난 이벤트에 비해 골드가 절반 수준이고, 장비 상자도 등급이 낮아졌습니다.</p><p>개발사 측에서 확인해주시면 좋겠습니다.</p>',
        author: players[0]?._id || allUsers[1]._id,
        channel: 'live-game',
        gameId: games.find(g => g.title === '테스트 RPG 게임')?._id,
        images: [],
        tags: ['테스트RPG', '이벤트', '보상', 'dummy-seed'],
        isPinned: false,
        isHot: false,
        hotScore: 8,
        views: 110,
        likes: allUsers.slice(3, 5).map(u => u._id),
        bookmarks: [],
        commentCount: 4,
        createdAt: new Date(now.getTime() - 4.5 * 24 * 3600000),
      },

      // ── 추가 자유 게시글 (다양성) ──
      {
        title: '게임 OST 추천해주세요 🎵',
        content: '<p>요즘 게임하면서 들을 OST를 찾고 있어요.</p><p>분위기 있는 RPG 배경음악이면 좋겠습니다.</p><p>제가 좋아하는 OST는:</p><ul><li>파이널 판타지 시리즈</li><li>젤다의 전설</li><li>니어 오토마타</li></ul>',
        author: players[1]?._id || allUsers[2]._id,
        channel: 'free',
        images: [],
        tags: ['OST', '음악', '추천', 'dummy-seed'],
        isPinned: false,
        isHot: false,
        hotScore: 5,
        views: 78,
        likes: allUsers.slice(0, 2).map(u => u._id),
        bookmarks: [],
        commentCount: 11,
        createdAt: new Date(now.getTime() - 8 * 24 * 3600000),
      },
      {
        title: '이번 달 GAMEUP 베스트 게임 투표',
        content: '<p>이번 달 가장 재미있게 플레이한 게임에 투표해주세요!</p><p>1. 드래곤 하트 사가</p><p>2. 사이버 퀘스트 2077</p><p>3. 우주 전사단</p><p>4. 퍼즐 마스터</p><p>5. 레이싱 킹스</p><p>댓글로 번호 남겨주세요! 🗳️</p>',
        author: admin?._id || allUsers[0]._id,
        channel: 'free',
        images: [sampleImages[0], sampleImages[3], sampleImages[7]],
        thumbnailIndex: 0,
        tags: ['투표', '베스트게임', '이달의게임', 'dummy-seed'],
        isPinned: false,
        isHot: true,
        hotScore: 32,
        views: 380,
        likes: allUsers.slice(0, 6).map(u => u._id),
        bookmarks: allUsers.slice(0, 3).map(u => u._id),
        commentCount: 25,
        createdAt: new Date(now.getTime() - 0.3 * 24 * 3600000),
      },
    ]

    // 게시글 삽입
    const postsToInsert = dummyPosts.map(p => ({
      ...p,
      images: p.images || [],
      videoUrl: p.videoUrl || '',
      thumbnailIndex: p.thumbnailIndex || 0,
      links: [],
      status: 'active',
      isTempSave: false,
      reportCount: 0,
      reports: [],
      updatedAt: p.createdAt,
    }))

    const result = await db.collection('posts').insertMany(postsToInsert)
    console.log(`\n✅ 더미 게시글 ${result.insertedCount}개 생성 완료!`)

    // 댓글 더미 데이터 생성 (주요 게시글에)
    const insertedIds = Object.values(result.insertedIds)
    const commentPosts = insertedIds.slice(2, 8) // 자유/베타게임 게시글에 댓글
    const sampleComments = [
      '완전 공감합니다! 저도 같은 생각이에요.',
      '좋은 정보 감사합니다 👍',
      '오 이건 몰랐네요. 도움이 많이 됩니다!',
      '저도 해봤는데 진짜 재밌어요',
      '혹시 다른 팁도 있으면 공유해주세요~',
      '대박! 이렇게 좋은 게임이 있었다니',
      '개발자님 응원합니다! 화이팅!',
      '다음 업데이트가 기대됩니다',
    ]

    const commentsToInsert: Record<string, unknown>[] = []
    for (const postId of commentPosts) {
      const commentCount = Math.floor(Math.random() * 4) + 1
      for (let i = 0; i < commentCount; i++) {
        const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)]
        commentsToInsert.push({
          postId,
          author: randomUser._id,
          content: sampleComments[Math.floor(Math.random() * sampleComments.length)],
          likes: [],
          status: 'active',
          createdAt: new Date(now.getTime() - Math.random() * 5 * 24 * 3600000),
          updatedAt: new Date(),
        })
      }
    }

    if (commentsToInsert.length > 0) {
      const commentResult = await db.collection('comments').insertMany(commentsToInsert)
      console.log(`💬 더미 댓글 ${commentResult.insertedCount}개 생성 완료!`)
    }

    // 최종 통계
    console.log('\n📊 최종 게시글 현황:')
    const stats = await db.collection('posts').aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()
    stats.forEach(s => console.log(`  ${s._id}: ${s.count}개`))
    console.log(`  합계: ${stats.reduce((a, s) => a + s.count, 0)}개`)

  } catch (err) {
    console.error('❌ 시드 실패:', err)
  } finally {
    await mongoose.disconnect()
    console.log('\n📦 MongoDB 연결 해제')
  }
}

seed()
