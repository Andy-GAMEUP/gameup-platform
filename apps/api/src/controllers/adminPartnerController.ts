import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  PartnerModel as Partner,
  PartnerPostModel as PartnerPost,
  TopicGroupModel as TopicGroup,
  UserModel as User,
} from '@gameup/db'

export const getPartnerRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, from, to } = req.query
    const filter: Record<string, unknown> = {}
    if (status && status !== 'all') filter.status = status
    if (from || to) {
      filter.createdAt = {}
      if (from) (filter.createdAt as Record<string, unknown>).$gte = new Date(from as string)
      if (to) (filter.createdAt as Record<string, unknown>).$lte = new Date(to as string)
    }
    const total = await Partner.countDocuments(filter)
    const requests = await Partner.find(filter)
      .populate('userId', 'username email level profileImage')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ requests, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '파트너 신청 목록 조회 실패' })
  }
}

export const getPartnerRequestDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const partner = await Partner.findById(id).populate('userId', 'username email level profileImage createdAt')
    if (!partner) return res.status(404).json({ message: '신청 내역을 찾을 수 없습니다' })
    res.json({ partner })
  } catch {
    res.status(500).json({ message: '파트너 신청 상세 조회 실패' })
  }
}

export const updatePartnerRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, rejectedReason } = req.body
    const update: Record<string, unknown> = { status }
    if (status === 'approved') update.approvedAt = new Date()
    if (status === 'rejected' && rejectedReason) update.rejectedReason = rejectedReason
    const partner = await Partner.findByIdAndUpdate(id, update, { new: true }).populate('userId', 'username email')
    if (!partner) return res.status(404).json({ message: '신청 내역을 찾을 수 없습니다' })
    res.json({ message: '파트너 신청이 업데이트되었습니다', partner })
  } catch {
    res.status(500).json({ message: '파트너 신청 업데이트 실패' })
  }
}

export const deletePartnerRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const partner = await Partner.findByIdAndDelete(id)
    if (!partner) return res.status(404).json({ message: '신청 내역을 찾을 수 없습니다' })
    res.json({ message: '파트너 신청이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '파트너 신청 삭제 실패' })
  }
}

export const getPartners = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const filter: Record<string, unknown> = { status: 'approved' }
    const total = await Partner.countDocuments(filter)
    let query = Partner.find(filter).populate('userId', 'username email profileImage')
    if (search) {
      const users = await User.find({ username: { $regex: search, $options: 'i' } }).select('_id')
      const userIds = users.map((u) => u._id)
      filter.userId = { $in: userIds }
    }
    const partners = await query
      .sort({ approvedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ partners, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '파트너 목록 조회 실패' })
  }
}

export const getPartnerDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const partner = await Partner.findById(id).populate('userId', 'username email profileImage createdAt')
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    const postCount = await PartnerPost.countDocuments({ partnerId: id, status: 'active' })
    res.json({ partner, postCount })
  } catch {
    res.status(500).json({ message: '파트너 상세 조회 실패' })
  }
}

export const updatePartnerStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!['approved', 'suspended'].includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 상태입니다' })
    }
    const partner = await Partner.findByIdAndUpdate(id, { status }, { new: true }).populate('userId', 'username email')
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    res.json({ message: '파트너 상태가 변경되었습니다', partner })
  } catch {
    res.status(500).json({ message: '파트너 상태 변경 실패' })
  }
}

export const getPartnerPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params
    const { page = 1, limit = 20 } = req.query
    const filter = { partnerId, status: { $ne: 'deleted' } }
    const total = await PartnerPost.countDocuments(filter)
    const posts = await PartnerPost.find(filter)
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ posts, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '파트너 포스트 조회 실패' })
  }
}

export const deletePartnerPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const post = await PartnerPost.findByIdAndUpdate(id, { status: 'deleted' }, { new: true })
    if (!post) return res.status(404).json({ message: '포스트를 찾을 수 없습니다' })
    res.json({ message: '포스트가 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '포스트 삭제 실패' })
  }
}

export const getTopicGroups = async (_req: AuthRequest, res: Response) => {
  try {
    const groups = await TopicGroup.find().sort({ sortOrder: 1 })
    res.json({ groups })
  } catch {
    res.status(500).json({ message: '주제 그룹 조회 실패' })
  }
}

export const createTopicGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, topics, sortOrder } = req.body
    if (!name) return res.status(400).json({ message: '그룹 이름은 필수입니다' })
    const maxOrder = await TopicGroup.findOne().sort({ sortOrder: -1 }).select('sortOrder')
    const group = new TopicGroup({
      name,
      topics: topics || [],
      sortOrder: sortOrder ?? ((maxOrder?.sortOrder ?? -1) + 1),
    })
    await group.save()
    res.status(201).json({ message: '주제 그룹이 생성되었습니다', group })
  } catch {
    res.status(500).json({ message: '주제 그룹 생성 실패' })
  }
}

export const updateTopicGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, topics, sortOrder } = req.body
    const group = await TopicGroup.findByIdAndUpdate(id, { name, topics, sortOrder }, { new: true })
    if (!group) return res.status(404).json({ message: '주제 그룹을 찾을 수 없습니다' })
    res.json({ message: '주제 그룹이 업데이트되었습니다', group })
  } catch {
    res.status(500).json({ message: '주제 그룹 업데이트 실패' })
  }
}

export const deleteTopicGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const group = await TopicGroup.findByIdAndDelete(id)
    if (!group) return res.status(404).json({ message: '주제 그룹을 찾을 수 없습니다' })
    res.json({ message: '주제 그룹이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '주제 그룹 삭제 실패' })
  }
}

export const reorderTopicGroups = async (req: AuthRequest, res: Response) => {
  try {
    const { groups } = req.body
    if (!Array.isArray(groups)) return res.status(400).json({ message: 'groups 배열이 필요합니다' })
    await Promise.all(
      groups.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        TopicGroup.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ message: '순서가 업데이트되었습니다' })
  } catch {
    res.status(500).json({ message: '순서 업데이트 실패' })
  }
}

export const reorderPartnerPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { posts } = req.body
    await Promise.all(
      posts.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        PartnerPost.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ success: true })
  } catch {
    res.status(500).json({ message: '정렬 변경 실패' })
  }
}
