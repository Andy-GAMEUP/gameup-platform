import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { FollowModel as Follow } from '@gameup/db'

async function getFollowCounts(userId: string) {
  return Promise.all([
    Follow.countDocuments({ followingId: userId }),
    Follow.countDocuments({ followerId: userId }),
  ])
}

export const toggleFollow = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const followerId = req.user!.id

    if (followerId === userId) {
      return res.status(400).json({ message: '자기 자신을 팔로우할 수 없습니다' })
    }

    const existing = await Follow.findOne({ followerId, followingId: userId })

    if (existing) {
      await Follow.deleteOne({ followerId, followingId: userId })
      const [followerCount, followingCount] = await getFollowCounts(userId)
      return res.json({ following: false, followerCount, followingCount })
    }

    await Follow.create({ followerId, followingId: userId })
    const [followerCount, followingCount] = await getFollowCounts(userId)
    res.status(201).json({ following: true, followerCount, followingCount })
  } catch {
    res.status(500).json({ message: '팔로우 처리 실패' })
  }
}

export const getFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query

    const total = await Follow.countDocuments({ followingId: userId })
    const follows = await Follow.find({ followingId: userId })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('followerId', 'username role profileImage')

    const followers = follows.map((f) => f.followerId)
    res.json({ followers, total })
  } catch {
    res.status(500).json({ message: '팔로워 조회 실패' })
  }
}

export const getFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query

    const total = await Follow.countDocuments({ followerId: userId })
    const follows = await Follow.find({ followerId: userId })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('followingId', 'username role profileImage')

    const following = follows.map((f) => f.followingId)
    res.json({ following, total })
  } catch {
    res.status(500).json({ message: '팔로잉 조회 실패' })
  }
}

export const checkFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const followerId = req.user!.id

    const [isFollowingDoc, [followerCount, followingCount]] = await Promise.all([
      Follow.findOne({ followerId, followingId: userId }),
      getFollowCounts(userId),
    ])

    res.json({
      isFollowing: !!isFollowingDoc,
      followerCount,
      followingCount,
    })
  } catch {
    res.status(500).json({ message: '팔로우 상태 확인 실패' })
  }
}

export const getMyFollowStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const [followerCount, followingCount] = await getFollowCounts(userId)

    res.json({ followerCount, followingCount })
  } catch {
    res.status(500).json({ message: '팔로우 통계 조회 실패' })
  }
}
