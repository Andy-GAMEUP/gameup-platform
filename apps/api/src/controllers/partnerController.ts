import mongoose from 'mongoose'
import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { PartnerModel as Partner, PartnerPostModel as PartnerPost, TopicGroupModel as TopicGroup, UserModel as User, MiniHomeGameModel as MiniHomeGame, PartnerMessageModel as PartnerMessage, PartnerMessageThreadModel as PartnerMessageThread } from '@gameup/db'

// the (unordered) pair of participants in a conversation, normalized so both resolve to the
// same value regardless of who is the caller
function userPair(userIdA: string, userIdB: string) {
  const [userLow, userHigh] = [String(userIdA), String(userIdB)].sort()
  return { userLow, userHigh }
}

// ── 파트너 신청 ───────────────────────────────────────────────────
export const applyPartner = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const {
      introduction, slogan, externalUrl, selectedTopics, profileImage,
      techStack, portfolioUrls,
      careerYears, completedProjectCount, teamSize, genres,
      preferredProjectSize, contractTypes, budgetRange, availableDuration, workStyle,
    } = req.body

    if (!introduction) {
      return res.status(400).json({ message: '자기소개는 필수입니다' })
    }

    const existing = await Partner.findOne({ userId })
    if (existing) {
      return res.status(409).json({ message: '이미 파트너 신청이 존재합니다', status: existing.status })
    }

    const partner = new Partner({
      userId,
      introduction,
      slogan: slogan || '',
      externalUrl: externalUrl || '',
      selectedTopics: selectedTopics || [],
      profileImage: profileImage || '',
      status: 'approved',
      approvedAt: new Date(),
      techStack: techStack || [],
      portfolioUrls: portfolioUrls || [],
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
      const user = await User.findById(userId).select('memberType companyInfo email username')
      if (user?.memberType === 'corporate' && (user as any).companyInfo?.approvalStatus === 'approved') {
        const companyInfo = (user as any).companyInfo
        partner = await Partner.create({
          userId,
          status: 'approved',
          approvedAt: new Date(),
          website: companyInfo?.homepageUrl || '',
          contactEmail: companyInfo?.companyEmail || user.email,
          contactPhone: companyInfo?.phone || '',
        })
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

// ── 내 파트너 프로필 수정 (기본정보/포트폴리오/게임 외) ───────
export const updateMyPartnerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const partner = await Partner.findOne({ userId })
    if (!partner) return res.status(404).json({ message: '파트너 정보를 찾을 수 없습니다' })

    const editable = [
      'introduction', 'slogan', 'externalUrl', 'selectedTopics', 'profileImage',
      'techStack', 'portfolioUrls', 'careerYears', 'teamSize', 'genres',
      'preferredProjectSize', 'contractTypes', 'budgetRange', 'availableDuration', 'workStyle',
      'displayNameOverride', 'coverImage', 'website', 'tags', 'keywords',
      'hourlyRate', 'location',
      'portfolio', 'history', 'skills', 'contactEmail', 'contactPhone',
    ] as const

    for (const key of editable) {
      if (req.body[key] !== undefined) (partner as any)[key] = req.body[key]
    }
    await partner.save()

    res.json({ message: '파트너 프로필이 업데이트되었습니다', partner })
  } catch {
    res.status(500).json({ message: '파트너 프로필 업데이트 실패' })
  }
}

// ── 파트너 채널 이미지 업로드 (소개 에디터용) ─────────────
export const uploadPartnerImages = async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return res.status(400).json({ message: '업로드할 이미지를 선택해주세요' })
    }
    const images = files.map(f => `/uploads/partner/${f.filename}`)
    res.json({ success: true, images })
  } catch {
    res.status(500).json({ message: '이미지 업로드 실패' })
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
      .populate('userId', 'username role profileImage memberType createdAt companyInfo.companyName companyInfo.companyCategory companyInfo.companyType')
      .populate('teamMembers.userId', 'username role profileImage')
      .populate('representativeGameId')
    if (!partner) {
      return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    }

    if (!partner.isProfilePublic) {
      const userId = req.user?.id
      const isOwner = !!userId && String((partner.userId as any)?._id ?? partner.userId) === userId
      const isTeamMember = !!userId && partner.teamMembers.some((tm) => String((tm.userId as any)?._id ?? tm.userId) === userId)
      const isAdmin = req.user?.role === 'admin'
      if (!isOwner && !isTeamMember && !isAdmin) {
        return res.status(403).json({ message: '비공개로 전환된 채널입니다' })
      }
    }

    const games = await MiniHomeGame.find({ partnerId: partner._id, status: 'active' }).sort({ sortOrder: 1 })
    res.json({ partner, games })
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

    res.json({ success: true, isProfilePublic: partner.isProfilePublic })
  } catch {
    res.status(500).json({ message: '공개 설정 변경 실패' })
  }
}

// ── 내 파트너 채널 게임 추가 ──────────────────────────────────────
export const addPartnerGame = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const partner = await Partner.findOne({ userId })
    if (!partner) return res.status(404).json({ message: '파트너 정보를 찾을 수 없습니다' })

    const { title, genre, description, iconUrl, coverUrl, screenshots, platforms } = req.body
    if (!title) return res.status(400).json({ message: '게임 제목은 필수입니다' })

    const game = await MiniHomeGame.create({
      partnerId: partner._id,
      title,
      genre: genre || '',
      description: description || '',
      iconUrl: iconUrl || '',
      coverUrl: coverUrl || '',
      screenshots: screenshots || [],
      platforms: platforms || [],
    })
    res.status(201).json({ message: '게임이 등록되었습니다', game })
  } catch {
    res.status(500).json({ message: '게임 등록 실패' })
  }
}

// ── 내 파트너 채널 게임 수정 ──────────────────────────────────────
export const updatePartnerGame = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { gameId } = req.params
    const partner = await Partner.findOne({ userId })
    if (!partner) return res.status(404).json({ message: '파트너 정보를 찾을 수 없습니다' })

    const { title, genre, description, iconUrl, coverUrl, screenshots, platforms, status } = req.body
    const update: Record<string, unknown> = {}
    if (title !== undefined) update.title = title
    if (genre !== undefined) update.genre = genre
    if (description !== undefined) update.description = description
    if (iconUrl !== undefined) update.iconUrl = iconUrl
    if (coverUrl !== undefined) update.coverUrl = coverUrl
    if (screenshots !== undefined) update.screenshots = screenshots
    if (platforms !== undefined) update.platforms = platforms
    if (status !== undefined) update.status = status

    const game = await MiniHomeGame.findOneAndUpdate({ _id: gameId, partnerId: partner._id }, update, { new: true })
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    res.json({ message: '게임이 수정되었습니다', game })
  } catch {
    res.status(500).json({ message: '게임 수정 실패' })
  }
}

// ── 내 파트너 채널 게임 삭제 ──────────────────────────────────────
export const removePartnerGame = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { gameId } = req.params
    const partner = await Partner.findOne({ userId })
    if (!partner) return res.status(404).json({ message: '파트너 정보를 찾을 수 없습니다' })

    const game = await MiniHomeGame.findOneAndDelete({ _id: gameId, partnerId: partner._id })
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })

    if (String(partner.representativeGameId) === String(gameId)) {
      partner.representativeGameId = null
      await partner.save()
    }

    res.json({ message: '게임이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '게임 삭제 실패' })
  }
}

// ── 대표 게임 설정 ────────────────────────────────────────────────
export const setPartnerRepresentativeGame = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { gameId } = req.params
    const partner = await Partner.findOne({ userId })
    if (!partner) return res.status(404).json({ message: '파트너 정보를 찾을 수 없습니다' })

    const game = await MiniHomeGame.findOne({ _id: gameId, partnerId: partner._id })
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })

    partner.representativeGameId = game._id as any
    await partner.save()

    res.json({ message: '대표 게임이 설정되었습니다', representativeGameId: game._id })
  } catch {
    res.status(500).json({ message: '대표 게임 설정 실패' })
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

// ── 파트너 채널에 메시지 보내기 ───────────────────────────────────
export const sendPartnerMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { partnerId } = req.params
    const { content } = req.body

    if (!content?.trim()) {
      return res.status(400).json({ message: '메시지 내용을 입력해주세요' })
    }

    const partner = await Partner.findOne({ _id: partnerId, status: 'approved' })
    if (!partner) {
      return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    }
    if (String(partner.userId) === String(userId)) {
      return res.status(400).json({ message: '본인 채널에는 메시지를 보낼 수 없습니다' })
    }

    // every "연락하기" starts a brand new conversation with its own rootId (self-referencing) —
    // this is what makes it show up as its own card instead of folding into any earlier
    // conversation with the same counterpart, and it can never inherit a stale closed/deleted
    // state since no thread doc can exist yet for a rootId that didn't exist until now
    const messageId = new mongoose.Types.ObjectId()
    const message = await PartnerMessage.create({
      _id: messageId,
      rootId: messageId,
      partnerId,
      senderId: userId,
      recipientUserId: partner.userId,
      content: content.trim(),
    })
    await message.populate('senderId', 'username profileImage')

    res.status(201).json({ message: '메시지를 보냈습니다', data: message })
  } catch {
    res.status(500).json({ message: '메시지 전송 실패' })
  }
}

// ── 메시지 답장 ───────────────────────────────────────────────────
export const replyToPartnerMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { messageId } = req.params
    const { content } = req.body

    if (!content?.trim()) {
      return res.status(400).json({ message: '메시지 내용을 입력해주세요' })
    }

    const original = await PartnerMessage.findById(messageId)
    if (!original) {
      return res.status(404).json({ message: '원본 메시지를 찾을 수 없습니다' })
    }
    if (String(original.recipientUserId) !== String(userId)) {
      return res.status(403).json({ message: '이 메시지에 답장할 권한이 없습니다' })
    }

    const rootId = original.rootId || original._id
    const thread = await PartnerMessageThread.findOne({ rootId })
    if (thread && thread.status !== 'open') {
      return res.status(403).json({ message: '상대방이 대화를 종료하여 답장을 보낼 수 없습니다' })
    }

    const reply = await PartnerMessage.create({
      partnerId: original.partnerId,
      senderId: userId,
      recipientUserId: original.senderId,
      parentId: original._id,
      rootId,
      content: content.trim(),
    })
    await reply.populate('senderId', 'username profileImage')

    res.status(201).json({ message: '답장을 보냈습니다', data: reply })
  } catch {
    res.status(500).json({ message: '답장 전송 실패' })
  }
}

// ── 내가 받은 메시지 목록 ─────────────────────────────────────────
export const getReceivedMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const messages = await PartnerMessage.find({ recipientUserId: userId })
      .populate('senderId', 'username profileImage companyInfo')
      .sort({ createdAt: -1 })

    const senderIds = [...new Set(messages.map((m) => String((m.senderId as any)?._id || m.senderId)))]
    const senderPartners = await Partner.find({ userId: { $in: senderIds }, status: 'approved' })
      .select('_id userId displayNameOverride')
      .lean()
    const senderPartnerMap = new Map(
      senderPartners.map((p) => [String(p.userId), { channelId: String(p._id), displayName: p.displayNameOverride }])
    )

    // one card per conversation (rootId), not per counterpart — the same two people can have
    // several independent "연락하기" conversations, each tracked separately
    const rootIds = [...new Set(messages.map((m) => String(m.rootId || m._id)))]
    const threads = await PartnerMessageThread.find({ rootId: { $in: rootIds } }).lean()
    const threadMap = new Map(
      threads.map((t) => {
        const counterpartId = String(t.userLow) === String(userId) ? String(t.userHigh) : String(t.userLow)
        return [String(t.rootId), {
          status: t.status,
          closedByMe: String(t.actionByUserId) === String(userId),
          permanentlyDeletedByMe: (t.permanentlyDeletedBy || []).some((u) => String(u) === String(userId)),
          counterpartPermanentlyDeleted: (t.permanentlyDeletedBy || []).some((u) => String(u) === counterpartId),
        }]
      })
    )

    const result = messages.map((m) => {
      const obj: any = m.toObject()
      const senderIdStr = String(obj.senderId?._id || obj.senderId)
      const senderPartner = senderPartnerMap.get(senderIdStr)
      obj.senderId.partnerChannelId = senderPartner?.channelId || null
      obj.senderId.companyName = senderPartner?.displayName || obj.senderId?.companyInfo?.companyName || null
      const rootId = String(obj.rootId || obj._id)
      obj.rootId = rootId
      const thread = threadMap.get(rootId)
      obj.threadStatus = thread?.status || 'open'
      obj.threadClosedByMe = thread?.closedByMe || false
      obj.permanentlyDeletedByMe = thread?.permanentlyDeletedByMe || false
      obj.counterpartPermanentlyDeleted = thread?.counterpartPermanentlyDeleted || false
      return obj
    })

    res.json({ messages: result })
  } catch {
    res.status(500).json({ message: '메시지 목록 조회 실패' })
  }
}

// ── 특정 대화(rootId)의 메시지 스레드 ────────────────────────────────
export const getMessageThread = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { rootId } = req.params

    const messages = await PartnerMessage.find({ $or: [{ rootId }, { _id: rootId }] })
      .populate('senderId', 'username profileImage')
      .sort({ createdAt: 1 })

    if (messages.length === 0) {
      return res.status(404).json({ message: '대화를 찾을 수 없습니다' })
    }
    const isParticipant = messages.some((m) => {
      const senderIdStr = String((m.senderId as any)?._id || m.senderId)
      return senderIdStr === String(userId) || String(m.recipientUserId) === String(userId)
    })
    if (!isParticipant) {
      return res.status(403).json({ message: '이 대화를 조회할 권한이 없습니다' })
    }

    res.json({ messages })
  } catch {
    res.status(500).json({ message: '메시지 스레드 조회 실패' })
  }
}

// ── 메시지 대화 종료(휴지통으로 이동) ────────────────────────────────
export const closeMessageThread = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { rootId } = req.params

    const root = await PartnerMessage.findById(rootId)
    if (!root) {
      return res.status(404).json({ message: '대화를 찾을 수 없습니다' })
    }
    if (String(root.senderId) !== String(userId) && String(root.recipientUserId) !== String(userId)) {
      return res.status(403).json({ message: '권한이 없습니다' })
    }
    const counterpartId = String(root.senderId) === String(userId) ? String(root.recipientUserId) : String(root.senderId)

    await PartnerMessageThread.findOneAndUpdate(
      { rootId },
      { $set: { status: 'closed', actionByUserId: userId }, $setOnInsert: { rootId, ...userPair(String(userId), counterpartId) } },
      { upsert: true }
    )
    res.json({ message: '대화를 종료했습니다' })
  } catch {
    res.status(500).json({ message: '대화 종료 실패' })
  }
}

// ── 메시지 대화 복원(휴지통에서 꺼내기) ──────────────────────────────
export const restoreMessageThread = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { rootId } = req.params

    const thread = await PartnerMessageThread.findOne({ rootId })
    if (!thread || thread.status !== 'closed' || String(thread.actionByUserId) !== String(userId)) {
      return res.status(403).json({ message: '복원할 수 없습니다' })
    }
    thread.status = 'open'
    await thread.save()
    res.json({ message: '대화를 복원했습니다' })
  } catch {
    res.status(500).json({ message: '대화 복원 실패' })
  }
}

// ── 메시지 대화 완전 삭제(복원 불가) ─────────────────────────────────
export const deleteMessageThread = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { rootId } = req.params

    const thread = await PartnerMessageThread.findOne({ rootId })
    if (thread && thread.status === 'closed' && String(thread.actionByUserId) === String(userId)) {
      // I'm the one who closed this conversation — end it permanently for both sides
      thread.status = 'deleted'
      await thread.save()
    } else {
      // this conversation isn't mine to end (it's open, or the other party closed/deleted
      // it) — just erase my own copy without touching their reply-blocking state
      const root = await PartnerMessage.findById(rootId)
      if (!root) {
        return res.status(404).json({ message: '대화를 찾을 수 없습니다' })
      }
      if (String(root.senderId) !== String(userId) && String(root.recipientUserId) !== String(userId)) {
        return res.status(403).json({ message: '권한이 없습니다' })
      }
      const counterpartId = String(root.senderId) === String(userId) ? String(root.recipientUserId) : String(root.senderId)
      await PartnerMessageThread.findOneAndUpdate(
        { rootId },
        { $addToSet: { permanentlyDeletedBy: userId }, $setOnInsert: { rootId, ...userPair(String(userId), counterpartId) } },
        { upsert: true }
      )
    }
    res.json({ message: '대화를 완전히 삭제했습니다' })
  } catch {
    res.status(500).json({ message: '대화 삭제 실패' })
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
