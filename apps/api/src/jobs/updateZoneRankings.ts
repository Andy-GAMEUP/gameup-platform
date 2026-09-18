import { GameModel, GameRankingModel, PaymentModel, ReviewModel, PostModel, GameQAModel } from '@gameup/db'

const LIVE_REVENUE_WINDOW_DAYS = 7

// 베타존은 매출이 없는(출시 전) 게임이라 아래 6개 지표를 정규화(백분위 순위) 후 가중합산
// 플레이 수는 목표 테스터 수 대비 달성률(playRate)로 써서 게임마다 다른 목표 규모를 보정함(2026-09-11)
// 리뷰/커뮤니티 글 수는 악플·논쟁으로도 늘어날 수 있어(신뢰도가 낮음) 플레이 달성률보다 낮은 비중만 부여
// 2026-09-17: Q&A 질문 수 + 개발사 답변률 추가. 개발사 리뷰 답글은 그 기능 자체가 아직 없어서(Review 모델에 답글 필드 없음) 제외.
// 커뮤니티 글 수는 신뢰도가 가장 낮다고 판단해 전체 지표 중 최저 가중치로 조정
const BETA_WEIGHTS = {
  playRate: 0.35,
  rating: 0.25,
  reviewCount: 0.13,
  qnaAnswerRate: 0.12,
  qnaCount: 0.10,
  communityCount: 0.05,
}

// 목표 테스터 수(maxTesters)를 안 정한 게임은 플랫폼 기본 상한(docs/platform-rules.md 1.10 "참여 인원 최대 1만 명")을 목표로 간주
const DEFAULT_MAX_TESTERS = 10000

// 리뷰가 적은 게임이 평점 하나로 과대평가되지 않도록 베이지안 평균으로 보정할 때 쓰는 최소 리뷰 수 기준(m)
const BETA_RATING_MIN_VOTES = 10

// 값 하나(극단치)가 나머지 게임 점수 차이를 뭉개버리는 min-max 대신, 순서(백분위)만 보고 0~1로 정규화 — 동점은 평균 순위 부여
function percentileRank(values: number[]): number[] {
  const n = values.length
  if (n <= 1) return values.map(() => 0)
  const indexed = values.map((v, i) => ({ v, i }))
  const sorted = [...indexed].sort((a, b) => a.v - b.v)
  const ranks = new Array<number>(n)
  let idx = 0
  while (idx < n) {
    let j = idx
    while (j + 1 < n && sorted[j + 1].v === sorted[idx].v) j++
    const avgRank = (idx + j) / 2
    for (let k = idx; k <= j; k++) ranks[sorted[k].i] = avgRank
    idx = j + 1
  }
  return ranks.map(r => r / (n - 1))
}

// 베이지안 평균: 리뷰 수(v)가 적을수록 전체 평균(globalAvg) 쪽으로 끌어당겨 신뢰도를 보정
function bayesianRating(rating: number, reviewCount: number, globalAvg: number): number {
  const v = reviewCount
  const m = BETA_RATING_MIN_VOTES
  return (v / (v + m)) * rating + (m / (v + m)) * globalAvg
}

async function updateLiveRanking() {
  const games = await GameModel.find({ status: 'published', serviceType: 'live', isDeleted: { $ne: true } })
    .select('_id')
    .lean()
  if (games.length === 0) {
    await GameRankingModel.deleteMany({ zone: 'live' })
    return
  }

  const since = new Date(Date.now() - LIVE_REVENUE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const revenueAgg = await PaymentModel.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: since } } },
    { $group: { _id: '$gameId', revenue: { $sum: '$amount' } } },
  ])
  const revenueMap = Object.fromEntries(revenueAgg.map(r => [r._id.toString(), r.revenue as number]))

  const ranked = games
    .map(g => ({ gameId: g._id, revenue: revenueMap[g._id.toString()] || 0 }))
    .sort((a, b) => b.revenue - a.revenue)

  const ops = ranked.map((g, idx) => ({
    updateOne: {
      filter: { zone: 'live', gameId: g.gameId },
      update: { zone: 'live', gameId: g.gameId, rank: idx + 1, score: g.revenue, metrics: { revenueLast7Days: g.revenue }, computedAt: new Date() },
      upsert: true,
    },
  }))
  if (ops.length > 0) await GameRankingModel.bulkWrite(ops)
  await GameRankingModel.deleteMany({ zone: 'live', gameId: { $nin: ranked.map(g => g.gameId) } })
}

async function updateBetaRanking() {
  const games = await GameModel.find({ status: 'published', serviceType: 'beta', isDeleted: { $ne: true } })
    .select('_id rating playCount maxTesters')
    .lean()
  if (games.length === 0) {
    await GameRankingModel.deleteMany({ zone: 'beta' })
    return
  }

  const gameIds = games.map(g => g._id)
  const reviewAgg = await ReviewModel.aggregate([
    { $match: { gameId: { $in: gameIds }, isBlocked: { $ne: true } } },
    { $group: { _id: '$gameId', count: { $sum: 1 } } },
  ])
  const reviewCountMap = Object.fromEntries(reviewAgg.map(r => [r._id.toString(), r.count as number]))

  const postAgg = await PostModel.aggregate([
    { $match: { gameId: { $in: gameIds }, status: 'active', isPublished: { $ne: false }, deletedAt: null } },
    { $group: { _id: '$gameId', count: { $sum: 1 } } },
  ])
  const communityCountMap = Object.fromEntries(postAgg.map(p => [p._id.toString(), p.count as number]))

  // Q&A 질문 수 + 개발사 답변률(answeredAt이 있으면 답변 완료로 판단)
  const qnaAgg = await GameQAModel.aggregate([
    { $match: { gameId: { $in: gameIds }, isPublic: { $ne: false } } },
    { $group: { _id: '$gameId', count: { $sum: 1 }, answered: { $sum: { $cond: [{ $ifNull: ['$answeredAt', false] }, 1, 0] } } } },
  ])
  const qnaCountMap = Object.fromEntries(qnaAgg.map(q => [q._id.toString(), q.count as number]))
  const qnaAnsweredMap = Object.fromEntries(qnaAgg.map(q => [q._id.toString(), q.answered as number]))

  // 질문이 하나도 없는 게임은 답변률을 0/1로 극단적으로 매기지 않고, 질문이 있는 게임들의 평균 답변률로 완충
  const gamesWithQna = qnaAgg.filter(q => q.count > 0)
  const globalAvgAnswerRate = gamesWithQna.length > 0
    ? gamesWithQna.reduce((sum, q) => sum + q.answered / q.count, 0) / gamesWithQna.length
    : 0

  const raw = games.map(g => {
    const qnaCount = qnaCountMap[g._id.toString()] || 0
    const qnaAnswered = qnaAnsweredMap[g._id.toString()] || 0
    return {
      gameId: g._id,
      rating: g.rating || 0,
      playCount: g.playCount || 0,
      maxTesters: g.maxTesters || 0,
      reviewCount: reviewCountMap[g._id.toString()] || 0,
      communityCount: communityCountMap[g._id.toString()] || 0,
      qnaCount,
      qnaAnswerRate: qnaCount > 0 ? qnaAnswered / qnaCount : globalAvgAnswerRate,
    }
  })

  // 전체 평균은 리뷰 없는(평점 0인) 게임을 빼고 계산 — 안 그러면 평균 자체가 0쪽으로 왜곡됨
  const ratedGames = raw.filter(g => g.reviewCount > 0)
  const globalAvgRating = ratedGames.length > 0
    ? ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length
    : 3 // 리뷰가 하나도 없을 때 기본값(1~5점 척도의 중간값)

  const bayesianRatings = raw.map(g => bayesianRating(g.rating, g.reviewCount, globalAvgRating))
  const playRates = raw.map(g => g.playCount / (g.maxTesters > 0 ? g.maxTesters : DEFAULT_MAX_TESTERS))

  const playRatePct = percentileRank(playRates)
  const ratingPct = percentileRank(bayesianRatings)
  const reviewCountPct = percentileRank(raw.map(g => g.reviewCount))
  const communityCountPct = percentileRank(raw.map(g => g.communityCount))
  const qnaCountPct = percentileRank(raw.map(g => g.qnaCount))
  const qnaAnswerRatePct = percentileRank(raw.map(g => g.qnaAnswerRate))

  const ranked = raw
    .map((g, idx) => ({
      ...g,
      bayesianRating: bayesianRatings[idx],
      playRate: playRates[idx],
      score:
        playRatePct[idx] * BETA_WEIGHTS.playRate +
        ratingPct[idx] * BETA_WEIGHTS.rating +
        reviewCountPct[idx] * BETA_WEIGHTS.reviewCount +
        qnaAnswerRatePct[idx] * BETA_WEIGHTS.qnaAnswerRate +
        qnaCountPct[idx] * BETA_WEIGHTS.qnaCount +
        communityCountPct[idx] * BETA_WEIGHTS.communityCount,
    }))
    .sort((a, b) => b.score - a.score)

  const ops = ranked.map((g, idx) => ({
    updateOne: {
      filter: { zone: 'beta', gameId: g.gameId },
      update: {
        zone: 'beta',
        gameId: g.gameId,
        rank: idx + 1,
        score: g.score,
        metrics: {
          rating: g.rating, bayesianRating: g.bayesianRating,
          playCount: g.playCount, maxTesters: g.maxTesters, playRate: g.playRate,
          reviewCount: g.reviewCount, communityCount: g.communityCount,
          qnaCount: g.qnaCount, qnaAnswerRate: g.qnaAnswerRate,
        },
        computedAt: new Date(),
      },
      upsert: true,
    },
  }))
  if (ops.length > 0) await GameRankingModel.bulkWrite(ops)
  await GameRankingModel.deleteMany({ zone: 'beta', gameId: { $nin: ranked.map(g => g.gameId) } })
}

async function runUpdateZoneRankings() {
  try {
    await Promise.all([updateLiveRanking(), updateBetaRanking()])
    console.log('[zone-ranking] 베타존/라이브존 순위 갱신 완료')
  } catch (e) {
    console.error('[zone-ranking] 순위 갱신 실패:', e)
  }
}

// 09:00 KST(UTC+9) === 00:00 UTC 이므로, 다음 UTC 자정까지 대기하면 된다
function msUntilNext9amKst() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1)
  return next.getTime() - now.getTime()
}

export function startZoneRankingJob() {
  // 서버 시작 시 1회 즉시 계산(순위가 비어있지 않도록) 후, 매일 오전 9시(KST)마다 재계산
  runUpdateZoneRankings()
  setTimeout(function scheduleNext() {
    runUpdateZoneRankings()
    setInterval(runUpdateZoneRankings, 24 * 60 * 60 * 1000)
  }, msUntilNext9amKst())
}
