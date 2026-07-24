import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  PartnerModel as Partner,
  PartnerPostModel as PartnerPost,
  TopicGroupModel as TopicGroup,
  UserModel as User,
  PartnerProjectModel as PartnerProject,
  PartnerProjectApplicationModel as PartnerProjectApplication,
  PartnerProjectDeletionLogModel as PartnerProjectDeletionLog,
} from '@gameup/db'

export const getPartnerRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, from, to, search, companyType } = req.query
    const filter: Record<string, unknown> = {}
    if (status && status !== 'all') filter.status = status
    if (from || to) {
      filter.createdAt = {}
      if (from) (filter.createdAt as Record<string, unknown>).$gte = new Date(from as string)
      if (to) (filter.createdAt as Record<string, unknown>).$lte = new Date(to as string)
    }
    if (search || companyType) {
      const userFilter: Record<string, unknown> = {}
      if (search) {
        userFilter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { 'companyInfo.companyName': { $regex: search, $options: 'i' } },
        ]
      }
      if (companyType === 'developer') {
        userFilter.$or = [
          { 'companyInfo.companyCategory': 'developer' },
          { 'companyInfo.companyCategory': { $exists: false }, 'companyInfo.companyType': 'developer' },
        ]
      } else if (companyType === 'partner') {
        userFilter.$and = [
          { memberType: 'corporate' },
          { $or: [
            { 'companyInfo.companyCategory': 'partner' },
            { 'companyInfo.companyCategory': { $exists: false }, 'companyInfo.companyType': { $nin: ['developer'] } },
          ]},
        ]
      }
      const matchedUsers = await User.find(userFilter).select('_id')
      filter.userId = { $in: matchedUsers.map((u) => u._id) }
    }
    const total = await Partner.countDocuments(filter)
    const requests = await Partner.find(filter)
      .populate('userId', 'username email level profileImage companyInfo memberType')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ requests, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '파트너 신청 목록 조회 실패' })
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

    res.json({ partners, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '파트너 목록 조회 실패' })
  }
}

export const togglePartnerProfileVisibility = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const partner = await Partner.findById(id)
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
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
      displayNameOverride, location,
      contactEmail, contactPhone, website, hourlyRate } = req.body
    const partner = await Partner.findById(id)
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })

    if (slogan !== undefined) partner.slogan = slogan
    if (introduction !== undefined) partner.introduction = introduction
    if (externalUrl !== undefined) partner.externalUrl = externalUrl
    if (selectedTopics !== undefined) partner.selectedTopics = selectedTopics
    if (profileImage !== undefined) partner.profileImage = profileImage
    if (displayNameOverride !== undefined) partner.displayNameOverride = displayNameOverride
    if (location !== undefined) partner.location = location
    if (contactEmail !== undefined) partner.contactEmail = contactEmail
    if (contactPhone !== undefined) partner.contactPhone = contactPhone
    if (website !== undefined) partner.website = website
    if (hourlyRate !== undefined) partner.hourlyRate = hourlyRate
    await partner.save()

    const updated = await Partner.findById(id).populate('userId', 'username email profileImage createdAt companyInfo contactPerson')
    res.json({ partner: updated })
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
    const [total, recruiting, matched, unmatched] = await Promise.all([
      PartnerProject.countDocuments(),
      PartnerProject.countDocuments({ status: 'recruiting' }),
      PartnerProject.countDocuments({ status: 'matched' }),
      PartnerProject.countDocuments({ status: 'unmatched' }),
    ])

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newThisWeek = await PartnerProject.countDocuments({ createdAt: { $gte: oneWeekAgo } })

    const totalApplicants = await PartnerProjectApplication.countDocuments()

    const deadlineSoon = await PartnerProject.countDocuments({
      status: 'recruiting',
      applicationDeadline: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })

    const popularProjects = await PartnerProject.find({ status: { $in: ['recruiting', 'matched', 'unmatched'] } })
      .populate('ownerId', 'username companyInfo')
      .sort({ applicantCount: -1 })
      .limit(5)
      .select('title category status applicantCount applicationDeadline createdAt')

    res.json({
      total,
      recruiting,
      matched,
      unmatched,
      newThisWeek,
      totalApplicants,
      deadlineSoon,
      popularProjects,
    })
  } catch {
    res.status(500).json({ message: '프로젝트 통계 조회 실패' })
  }
}

// ── 삭제된 프로젝트 조회 & 복구 (매칭/삭제는 자동 전환·소유자 본인만 가능, 관리자는 조회/복구만) ──

export const getDeletedAdminProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 15, search } = req.query
    const pageNum = Number(page)
    const limitNum = Number(limit)

    const query: Record<string, unknown> = { restoredAt: { $exists: false } }
    if (search) {
      query.title = { $regex: search, $options: 'i' }
    }

    const [logs, total] = await Promise.all([
      PartnerProjectDeletionLog.find(query)
        .sort({ deletedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      PartnerProjectDeletionLog.countDocuments(query),
    ])

    res.json({ logs, total, page: pageNum, limit: limitNum })
  } catch {
    res.status(500).json({ message: '삭제된 프로젝트 목록 조회 실패' })
  }
}

export const restoreAdminProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const log = await PartnerProjectDeletionLog.findById(id)
    if (!log) return res.status(404).json({ message: '삭제 로그를 찾을 수 없습니다' })
    if (log.restoredAt) return res.status(400).json({ message: '이미 복구된 프로젝트입니다' })

    const snapshot = log.projectSnapshot as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, ...projectData } = snapshot
    await PartnerProject.create(projectData)

    await PartnerProjectDeletionLog.findByIdAndUpdate(id, {
      restoredAt: new Date(),
      restoredBy: req.user!.id,
    })

    res.json({ success: true, message: '프로젝트가 복구되었습니다' })
  } catch {
    res.status(500).json({ message: '프로젝트 복구 실패' })
  }
}

export const deleteAdminProjectLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const log = await PartnerProjectDeletionLog.findById(id)
    if (!log) return res.status(404).json({ message: '삭제 로그를 찾을 수 없습니다' })
    await PartnerProjectDeletionLog.findByIdAndDelete(id)
    res.json({ success: true, message: '완전 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '완전 삭제 실패' })
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

export const adminAddTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params
    const { userId } = req.body

    const partner = await Partner.findById(partnerId)
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })

    const targetUser = await User.findById(userId)
    if (!targetUser) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    if (targetUser.memberType === 'corporate')
      return res.status(400).json({ message: '기업회원은 팀원으로 추가할 수 없습니다' })
    if (String(targetUser._id) === String(partner.userId))
      return res.status(400).json({ message: '채널 소유자는 팀원으로 추가할 수 없습니다' })

    const alreadyMember = partner.teamMembers.some(m => String(m.userId) === String(userId))
    if (alreadyMember) return res.status(409).json({ message: '이미 팀원으로 등록된 사용자입니다' })

    partner.teamMembers.push({ userId: targetUser._id as any, addedAt: new Date() })
    await partner.save()
    res.json({ message: '팀원이 추가되었습니다' })
  } catch {
    res.status(500).json({ message: '팀원 추가 실패' })
  }
}

export const adminRemoveTeamMemberByUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params

    const partner = await Partner.findOne({ 'teamMembers.userId': userId })
    if (!partner) return res.status(404).json({ message: '소속된 기업을 찾을 수 없습니다' })

    const idx = partner.teamMembers.findIndex(m => String(m.userId) === String(userId))
    if (idx >= 0) {
      partner.teamMembers.splice(idx, 1)
      await partner.save()
    }
    res.json({ message: '기업 소속이 해제되었습니다' })
  } catch {
    res.status(500).json({ message: '소속 해제 실패' })
  }
}
