import mongoose from 'mongoose'
import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { PartnerModel as Partner, PartnerPostModel as PartnerPost, TopicGroupModel as TopicGroup, UserModel as User, MiniHomeModel as MiniHome } from '@gameup/db'

// ── 파트너 신청 ───────────────────────────────────────────────────
export const applyPartner = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const {
      introduction, activityPlan, slogan, externalUrl, selectedTopics, profileImage,
      techStack, portfolioUrls, availability,
      careerYears, completedProjectCount, teamSize, genres,
      preferredProjectSize, contractTypes, budgetRange, availableDuration, workStyle,
    } = req.body

    if (!introduction || !activityPlan) {
      return res.status(400).json({ message: '자기소개와 활동 계획은 필수입니다' })
    }

    const existing = await Partner.findOne({ userId })
    if (existing) {
      return res.status(409).json({ message: '이미 파트너 신청이 존재합니다', status: existing.status })
    }

    const partner = new Partner({
      userId,
      introduction,
      activityPlan,
      slogan: slogan || '',
      externalUrl: externalUrl || '',
      selectedTopics: selectedTopics || [],
      profileImage: profileImage || '',
      status: 'approved',
      approvedAt: new Date(),
      techStack: techStack || [],
      portfolioUrls: portfolioUrls || [],
      availability: availability || 'available',
      careerYears: careerYears ?? undefined,
      completedProjectCount: completedProjectCount || 0,
      teamSize: teamSize || undefined,
      genres: genres || [],
      preferredProjectSize: preferredProjectSize || undefined,
      contractTypes: contractTypes || [],
      budgetRange: budgetRange || '',
      availableDuration: availableDuration || '',
      workStyle: workStyle || undefined,
    })
    await partner.save()

    res.status(201).json({ message: '파트너 프로필이 등록되었습니다', partner })
  } catch {
    res.status(500).json({ message: '파트너 신청 실패' })
  }
}

// ── 내 파트너 상태 조회 ───────────────────────────────────────────
export const getMyPartnerStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    let partner = await Partner.findOne({ userId })
    let isTeamMember = false

    if (!partner) {
      const user = await User.findById(userId).select('memberType companyInfo')
      if (user?.memberType === 'corporate' && (user as any).companyInfo?.approvalStatus === 'approved') {
        partner = await Partner.create({ userId, status: 'approved', approvedAt: new Date() })
      } else {
        // 팀원 여부 확인
        partner = await Partner.findOne({
          status: 'approved',
          'teamMembers.userId': new mongoose.Types.ObjectId(userId),
        })
        if (partner) {
          isTeamMember = true
        } else {
          return res.status(404).json({ message: '파트너 신청 내역이 없습니다' })
        }
      }
    }

    res.json({ partner, isTeamMember })
  } catch {
    res.status(500).json({ message: '파트너 상태 조회 실패' })
  }
}

// ── 파트너 슬로건 조회 ────────────────────────────────────────────
export const getPartnerSlogan = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params
    const partner = await Partner.findById(partnerId).select('slogan status userId')
    if (!partner || partner.status !== 'approved') {
      return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    }
    res.json({ slogan: partner.slogan })
  } catch {
    res.status(500).json({ message: '슬로건 조회 실패' })
  }
}

// ── 슬로건 업데이트 ───────────────────────────────────────────────
export const updateSlogan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { slogan } = req.body

    const partner = await Partner.findOne({ userId })
    if (!partner) {
      return res.status(404).json({ message: '파트너 정보를 찾을 수 없습니다' })
    }
    if (partner.status !== 'approved') {
      return res.status(403).json({ message: '승인된 파트너만 슬로건을 수정할 수 있습니다' })
    }

    partner.slogan = slogan || ''
    await partner.save()

    res.json({ message: '슬로건이 업데이트되었습니다', slogan: partner.slogan })
  } catch {
    res.status(500).json({ message: '슬로건 업데이트 실패' })
  }
}

// ── 주제 그룹 목록 조회 ───────────────────────────────────────────
export const getTopics = async (_req: AuthRequest, res: Response) => {
  try {
    const groups = await TopicGroup.find().sort({ sortOrder: 1 })
    res.json({ groups })
  } catch {
    res.status(500).json({ message: '주제 조회 실패' })
  }
}

// ── 공개 파트너 목록 조회 ─────────────────────────────────────────
export const getPartners = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const skip = (page - 1) * limit

    const [partners, total] = await Promise.all([
      Partner.find({ status: 'approved', isProfilePublic: true })
        .populate('userId', 'username role profileImage')
        .sort({ approvedAt: -1 })
        .skip(skip)
        .limit(limit),
      Partner.countDocuments({ status: 'approved', isProfilePublic: true }),
    ])

    res.json({ partners, total, page, totalPages: Math.ceil(total / limit) })
  } catch {
    res.status(500).json({ message: '파트너 목록 조회 실패' })
  }
}

// ── 단일 파트너 채널 조회 ─────────────────────────────────────────
export const getPartnerChannel = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params
    const partner = await Partner.findOne({ _id: partnerId, status: 'approved' })
      .populate('userId', 'username role profileImage memberType companyInfo contactPerson createdAt')
      .populate('teamMembers.userId', 'username role profileImage')
    if (!partner) {
      return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    }
    res.json({ partner })
  } catch {
    res.status(500).json({ message: '파트너 채널 조회 실패' })
  }
}

// ── 파트너 디렉토리 공개 토글 ─────────────────────────────────────
export const toggleProfileVisibility = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params
    const partner = await Partner.findById(partnerId)
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    if (String(partner.userId) !== req.user!.id) {
      return res.status(403).json({ message: '본인 채널만 수정할 수 있습니다' })
    }

    partner.isProfilePublic = !partner.isProfilePublic
    await partner.save()

    // MiniHome 디렉토리 연동
    const user = await User.findById(partner.userId).select('companyInfo').lean()
    const companyName = (user as unknown as { companyInfo?: { companyName?: string } })?.companyInfo?.companyName || '이름 없음'
    const existing = await MiniHome.findOne({ userId: partner.userId })
    if (existing) {
      await MiniHome.updateOne({ userId: partner.userId }, { isPublic: partner.isProfilePublic })
    } else if (partner.isProfilePublic) {
      await MiniHome.create({ userId: partner.userId, companyName, isPublic: true })
    }

    res.json({ success: true, isProfilePublic: partner.isProfilePublic })
  } catch {
    res.status(500).json({ message: '공개 설정 변경 실패' })
  }
}

// ── 파트너 채널 게시글 목록 ───────────────────────────────────────
export const getPartnerPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 15
    const topic = req.query.topic as string | undefined
    const sort = (req.query.sort as string) || 'latest'
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = { partnerId, status: 'active' }
    if (topic) filter.topic = topic

    const sortOption: Record<string, 1 | -1> =
      sort === 'popular' ? { likeCount: -1, createdAt: -1 } : { createdAt: -1 }

    const [posts, total] = await Promise.all([
      PartnerPost.find(filter)
        .populate('author', 'username role profileImage')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean()
        .then(docs => docs.map(d => ({ ...d, likeCount: (d.likes as unknown[]).length }))),
      PartnerPost.countDocuments(filter),
    ])

    res.json({ posts, total, page, totalPages: Math.ceil(total / limit) })
  } catch {
    res.status(500).json({ message: '게시글 목록 조회 실패' })
  }
}

// ── 단일 파트너 게시글 조회 ───────────────────────────────────────
export const getPartnerPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const post = await PartnerPost.findOne({ _id: id, status: 'active' })
      .populate('author', 'username role profileImage')
      .populate({ path: 'partnerId', populate: { path: 'userId', select: 'username role profileImage' } })
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    }
    post.views += 1
    await post.save()
    const postObj = post.toObject()
    res.json({ post: { ...postObj, likeCount: post.likes.length } })
  } catch {
    res.status(500).json({ message: '게시글 조회 실패' })
  }
}

// ── 파트너 게시글 작성 ────────────────────────────────────────────
export const createPartnerPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { partnerId: reqPartnerId } = req.body

    // 소유자 확인
    let partner = await Partner.findOne({ userId, status: 'approved' })
    // 팀원인 경우 - partnerId 필수
    if (!partner && reqPartnerId) {
      partner = await Partner.findOne({
        _id: reqPartnerId,
        status: 'approved',
        'teamMembers.userId': new mongoose.Types.ObjectId(userId),
      })
    }
    if (!partner) {
      return res.status(403).json({ message: '채널에 글을 작성할 권한이 없습니다' })
    }

    const { title, content, topicGroup, topic, images, tags } = req.body
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용은 필수입니다' })
    }

    const post = new PartnerPost({
      partnerId: partner._id,
      author: userId,
      title,
      content,
      topicGroup: topicGroup || '',
      topic: topic || '',
      images: images || [],
      tags: tags || [],
    })
    await post.save()
    partner.postCount += 1
    await partner.save()

    await post.populate('author', 'username role profileImage')
    res.status(201).json({ post })
  } catch {
    res.status(500).json({ message: '게시글 작성 실패' })
  }
}

// ── 파트너 게시글 수정 ────────────────────────────────────────────
export const updatePartnerPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const post = await PartnerPost.findById(id)
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    }
    if (String(post.author) !== String(userId)) {
      return res.status(403).json({ message: '수정 권한이 없습니다' })
    }

    const { title, content, topicGroup, topic, images, tags } = req.body
    if (title !== undefined) post.title = title
    if (content !== undefined) post.content = content
    if (topicGroup !== undefined) post.topicGroup = topicGroup
    if (topic !== undefined) post.topic = topic
    if (images !== undefined) post.images = images
    if (tags !== undefined) post.tags = tags

    await post.save()
    await post.populate('author', 'username role profileImage')
    res.json({ post })
  } catch {
    res.status(500).json({ message: '게시글 수정 실패' })
  }
}

// ── 파트너 게시글 삭제 ────────────────────────────────────────────
export const deletePartnerPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const userRole = req.user!.role
    const { id } = req.params
    const post = await PartnerPost.findById(id)
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    }
    if (String(post.author) !== String(userId) && userRole !== 'admin') {
      return res.status(403).json({ message: '삭제 권한이 없습니다' })
    }

    post.status = 'deleted'
    await post.save()

    const partner = await Partner.findById(post.partnerId)
    if (partner && partner.postCount > 0) {
      partner.postCount -= 1
      await partner.save()
    }

    res.json({ message: '삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '게시글 삭제 실패' })
  }
}

// ── 파트너 게시글 좋아요 토글 ─────────────────────────────────────
export const togglePartnerPostLike = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const post = await PartnerPost.findOne({ _id: id, status: 'active' })
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    }

    const userObjId = new mongoose.Types.ObjectId(userId)
    const idx = post.likes.findIndex(l => l.equals(userObjId))
    let liked: boolean
    if (idx >= 0) {
      post.likes.splice(idx, 1)
      liked = false
    } else {
      post.likes.push(userObjId)
      liked = true
    }
    await post.save()
    res.json({ liked, likeCount: post.likes.length })
  } catch {
    res.status(500).json({ message: '좋아요 처리 실패' })
  }
}

// ── 팀원 추가용 게임회원 검색 ─────────────────────────────────────
export const searchGameUsers = async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q || q.length < 1) return res.json({ users: [] })

    const users = await User.find({
      memberType: { $ne: 'corporate' },
      role: { $ne: 'admin' },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username email profileImage')
      .limit(8)
      .lean()

    res.json({ users })
  } catch {
    res.status(500).json({ message: '검색 실패' })
  }
}

// ── 팀원 목록 조회 ────────────────────────────────────────────────
export const getTeamMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params
    const partner = await Partner.findById(partnerId)
      .populate('teamMembers.userId', 'username email role profileImage')
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    res.json({ teamMembers: partner.teamMembers })
  } catch {
    res.status(500).json({ message: '팀원 목록 조회 실패' })
  }
}

// ── 팀원 추가 ─────────────────────────────────────────────────────
export const addTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { partnerId } = req.params
    const { username } = req.body

    const partner = await Partner.findById(partnerId)
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    if (String(partner.userId) !== String(userId))
      return res.status(403).json({ message: '채널 소유자만 팀원을 추가할 수 있습니다' })

    const targetUser = await User.findOne({ $or: [{ username }, { email: username }] })
    if (!targetUser) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    if (targetUser.memberType === 'corporate')
      return res.status(400).json({ message: '기업회원은 팀원으로 추가할 수 없습니다' })
    if (String(targetUser._id) === String(partner.userId))
      return res.status(400).json({ message: '채널 소유자는 팀원으로 추가할 수 없습니다' })

    const alreadyMember = partner.teamMembers.some(m => String(m.userId) === String(targetUser._id))
    if (alreadyMember) return res.status(409).json({ message: '이미 팀원으로 등록된 사용자입니다' })

    partner.teamMembers.push({ userId: targetUser._id as any, addedAt: new Date() })
    await partner.save()
    await partner.populate('teamMembers.userId', 'username email role profileImage')

    res.json({ message: '팀원이 추가되었습니다', teamMembers: partner.teamMembers })
  } catch {
    res.status(500).json({ message: '팀원 추가 실패' })
  }
}

// ── 팀원 제거 ─────────────────────────────────────────────────────
export const removeTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { partnerId, memberId } = req.params

    const partner = await Partner.findById(partnerId)
    if (!partner) return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    if (String(partner.userId) !== String(userId))
      return res.status(403).json({ message: '채널 소유자만 팀원을 제거할 수 있습니다' })

    const idx = partner.teamMembers.findIndex(m => String(m.userId) === String(memberId))
    if (idx < 0) return res.status(404).json({ message: '팀원을 찾을 수 없습니다' })

    partner.teamMembers.splice(idx, 1)
    await partner.save()

    res.json({ message: '팀원이 제거되었습니다' })
  } catch {
    res.status(500).json({ message: '팀원 제거 실패' })
  }
}
