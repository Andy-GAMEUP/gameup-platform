import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  PartnerModel as Partner,
  PartnerPostModel as PartnerPost,
  TopicGroupModel as TopicGroup,
  UserModel as User,
  PartnerProjectModel as PartnerProject,
  PartnerProjectApplicationModel as PartnerProjectApplication,
  MiniHomeModel as MiniHome,
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
    const { page = 1, limit = 20, search, sort = 'latest', status } = req.query
    const filter: Record<string, unknown> = {}
    if (status && status !== 'all') {
      filter.status = status
    } else {
      filter.status = { $in: ['approved', 'suspended'] }
    }
    if (search) {
      const users = await User.find({ username: { $regex: search, $options: 'i' } }).select('_id')
      const userIds = users.map((u) => u._id)
      filter.userId = { $in: userIds }
    }
    const total = await Partner.countDocuments(filter)
    let sortOption: Record<string, 1 | -1> = { approvedAt: -1 }
    if (sort === 'oldest') sortOption = { createdAt: 1 }
    else if (sort === 'popular') sortOption = { postCount: -1, approvedAt: -1 }
    else if (sort === 'username') sortOption = { createdAt: -1 }

    const partners = await Partner.find(filter)
      .populate('userId', 'username email profileImage createdAt companyInfo contactPerson')
      .sort(sortOption)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    // MiniHome 정보를 같이 조회 (isPublic, companyName, skills, expertiseArea 등)
    const partnerUserIds = partners.map((p) => p.userId?._id || p.userId).filter(Boolean)
    const minihomes = await MiniHome.find({ userId: { $in: partnerUserIds } })
      .select('userId companyName introduction isPublic expertiseArea skills availability location contactEmail contactPhone website hourlyRate rating reviewCount completedProjectCount isVerified')
    const minihomeMap = new Map(minihomes.map((m) => [String(m.userId), m]))

    const enriched = partners.map((p) => {
      const pObj = p.toObject()
      const uid = String(p.userId?._id || p.userId)
      const mh = minihomeMap.get(uid)
      return { ...pObj, minihome: mh ? mh.toObject() : null }
    })

    res.json({ partners: enriched, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '파트너 목록 조회 실패' })
  }
}

export const togglePartnerProfileVisibility = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    // id는 partner _id → userId를 찾아서 MiniHome의 isPublic을 토글
    const partner = await Partner.findById(id)
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    const minihome = await MiniHome.findOne({ userId: partner.userId })
    if (minihome) {
      minihome.isPublic = !minihome.isPublic
      await minihome.save()
      return res.json({ isPublic: minihome.isPublic })
    }
    // MiniHome이 없는 경우 Partner의 isProfilePublic 토글
    partner.isProfilePublic = !partner.isProfilePublic
    await partner.save()
    res.json({ isPublic: partner.isProfilePublic })
  } catch {
    res.status(500).json({ message: '프로필 공개 설정 변경 실패' })
  }
}

export const updatePartnerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { slogan, introduction, externalUrl, selectedTopics, profileImage,
      companyName, skills, expertiseArea, availability, location,
      contactEmail, contactPhone, website, hourlyRate } = req.body
    const partner = await Partner.findById(id)
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })

    // Partner 필드 업데이트
    if (slogan !== undefined) partner.slogan = slogan
    if (introduction !== undefined) partner.introduction = introduction
    if (externalUrl !== undefined) partner.externalUrl = externalUrl
    if (selectedTopics !== undefined) partner.selectedTopics = selectedTopics
    if (profileImage !== undefined) partner.profileImage = profileImage
    await partner.save()

    // MiniHome 필드 업데이트 (기업프로필 세부정보)
    const minihome = await MiniHome.findOne({ userId: partner.userId })
    if (minihome) {
      if (companyName !== undefined) minihome.companyName = companyName
      if (introduction !== undefined) minihome.introduction = introduction
      if (skills !== undefined) minihome.skills = skills
      if (expertiseArea !== undefined) minihome.expertiseArea = expertiseArea
      if (availability !== undefined) minihome.availability = availability
      if (location !== undefined) minihome.location = location
      if (contactEmail !== undefined) minihome.contactEmail = contactEmail
      if (contactPhone !== undefined) minihome.contactPhone = contactPhone
      if (website !== undefined) minihome.website = website
      if (hourlyRate !== undefined) minihome.hourlyRate = hourlyRate
      await minihome.save()
    }

    const updated = await Partner.findById(id).populate('userId', 'username email profileImage createdAt companyInfo contactPerson')
    const updatedMh = await MiniHome.findOne({ userId: partner.userId })
      .select('userId companyName introduction isPublic expertiseArea skills availability location contactEmail contactPhone website hourlyRate rating reviewCount completedProjectCount isVerified')
    const result = { ...updated?.toObject(), minihome: updatedMh?.toObject() || null }
    res.json({ partner: result })
  } catch {
    res.status(500).json({ message: '파트너 프로필 수정 실패' })
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

// ── 프로젝트 관리 ──

export const getAdminProjects = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      sort = 'latest',
    } = req.query

    const filter: Record<string, unknown> = {}

    if (status && status !== 'all') filter.status = status
    if (category && category !== 'all') filter.category = category
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await PartnerProject.countDocuments(filter)

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 }
    switch (sort) {
      case 'deadline':
        sortOption = { applicationDeadline: 1 }
        break
      case 'popular':
        sortOption = { applicantCount: -1 }
        break
      case 'oldest':
        sortOption = { createdAt: 1 }
        break
      default:
        sortOption = { createdAt: -1 }
    }

    const projects = await PartnerProject.find(filter)
      .populate('ownerId', 'username email companyInfo profileImage')
      .sort(sortOption)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    res.json({
      projects,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    })
  } catch {
    res.status(500).json({ message: '프로젝트 목록 조회 실패' })
  }
}

export const getAdminProjectStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [total, recruiting, ongoing, completed, cancelled] = await Promise.all([
      PartnerProject.countDocuments(),
      PartnerProject.countDocuments({ status: 'recruiting' }),
      PartnerProject.countDocuments({ status: 'ongoing' }),
      PartnerProject.countDocuments({ status: 'completed' }),
      PartnerProject.countDocuments({ status: 'cancelled' }),
    ])

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newThisWeek = await PartnerProject.countDocuments({ createdAt: { $gte: oneWeekAgo } })

    const totalApplicants = await PartnerProjectApplication.countDocuments()

    const deadlineSoon = await PartnerProject.countDocuments({
      status: 'recruiting',
      applicationDeadline: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })

    const popularProjects = await PartnerProject.find({ status: { $in: ['recruiting', 'ongoing'] } })
      .populate('ownerId', 'username companyInfo')
      .sort({ applicantCount: -1 })
      .limit(5)
      .select('title category status applicantCount applicationDeadline createdAt')

    res.json({
      total,
      recruiting,
      ongoing,
      completed,
      cancelled,
      newThisWeek,
      totalApplicants,
      deadlineSoon,
      popularProjects,
    })
  } catch {
    res.status(500).json({ message: '프로젝트 통계 조회 실패' })
  }
}

export const updateAdminProjectStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!['draft', 'recruiting', 'ongoing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 상태입니다' })
    }
    const project = await PartnerProject.findByIdAndUpdate(id, { status }, { new: true })
      .populate('ownerId', 'username email companyInfo')
    if (!project) return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    res.json({ message: '프로젝트 상태가 변경되었습니다', project })
  } catch {
    res.status(500).json({ message: '프로젝트 상태 변경 실패' })
  }
}

export const getAdminProjectApplicants = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const project = await PartnerProject.findById(id).populate('ownerId', 'username companyInfo')
    if (!project) return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })

    const applicants = await PartnerProjectApplication.find({ projectId: id })
      .populate('applicantId', 'username email companyInfo profileImage')
      .sort({ createdAt: -1 })

    res.json({ project, applicants })
  } catch {
    res.status(500).json({ message: '지원자 조회 실패' })
  }
}
