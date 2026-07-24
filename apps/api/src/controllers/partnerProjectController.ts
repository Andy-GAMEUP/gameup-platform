import { Response } from 'express'
import {
  PartnerProjectModel as PartnerProject,
  PartnerProjectApplicationModel as ProjectApplication,
  PartnerProjectInquiryModel as ProjectInquiry,
  PartnerProjectDeletionLogModel as PartnerProjectDeletionLog,
  UserModel as User,
  PartnerModel,
} from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

// 프로젝트 목록
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, status, tab, page = 1, limit = 12 } = req.query

    const filter: Record<string, unknown> = {
      status: { $in: ['recruiting', 'matched', 'unmatched'] },
    }

    if (search) {
      const safeSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
      ]
    }

    if (category && category !== 'all') {
      filter.category = category
    }

    if (tab === 'recruiting') {
      filter.status = 'recruiting'
    } else if (tab === 'matched') {
      filter.status = 'matched'
    } else if (tab === 'unmatched') {
      filter.status = 'unmatched'
    }

    if (status && status !== 'all') {
      filter.status = status
    }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const projects = await PartnerProject.find(filter)
      .populate('ownerId', 'username companyInfo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)

    const total = await PartnerProject.countDocuments(filter)

    res.json({
      success: true,
      projects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Get projects error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 프로젝트 통계
export const getProjectStats = async (req: AuthRequest, res: Response) => {
  try {
    const total = await PartnerProject.countDocuments({
      status: { $in: ['recruiting', 'matched', 'unmatched'] },
    })
    const recruiting = await PartnerProject.countDocuments({ status: 'recruiting' })

    const applicantResult = await PartnerProject.aggregate([
      { $match: { status: { $in: ['recruiting', 'matched', 'unmatched'] } } },
      { $group: { _id: null, totalApplicants: { $sum: '$applicantCount' } } },
    ])
    const totalApplicants = applicantResult.length > 0 ? applicantResult[0].totalApplicants : 0

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newThisWeek = await PartnerProject.countDocuments({
      createdAt: { $gte: oneWeekAgo },
      status: { $in: ['recruiting', 'matched', 'unmatched'] },
    })

    res.json({
      success: true,
      stats: { total, recruiting, totalApplicants, newThisWeek },
    })
  } catch (error) {
    console.error('Get project stats error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 프로젝트 상세
export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    const project = await PartnerProject.findById(id)
      .populate('ownerId', 'username companyInfo memberType')

    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    const partnerChannel = await PartnerModel.findOne({ userId: (project.ownerId as any)._id }).select('_id isProfilePublic').lean()

    res.json({
      success: true,
      project,
      partnerChannelId: partnerChannel?._id ?? null,
      partnerChannelPublic: partnerChannel?.isProfilePublic ?? false,
    })
  } catch (error) {
    console.error('Get project by id error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 프로젝트 등록
export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const user = await User.findById(req.user.id)
    if (!user || user.memberType !== 'corporate') {
      return res.status(403).json({ message: '기업회원만 프로젝트를 등록할 수 있습니다' })
    }

    const project = await PartnerProject.create({
      ownerId: req.user.id,
      ...req.body,
      status: 'recruiting',
    })

    res.status(201).json({ success: true, project })
  } catch (error) {
    console.error('Create project error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 프로젝트 수정
export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const project = await PartnerProject.findById(id)
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    if (project.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: '프로젝트 소유자만 수정할 수 있습니다' })
    }

    const update = { ...req.body }
    if (project.status === 'unmatched' && update.applicationDeadline) {
      const newDeadline = new Date(update.applicationDeadline)
      if (newDeadline > new Date()) {
        update.status = 'recruiting'
      }
    }

    const updated = await PartnerProject.findByIdAndUpdate(id, update, { new: true })
    res.json({ success: true, project: updated })
  } catch (error) {
    console.error('Update project error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 프로젝트 삭제
export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const project = await PartnerProject.findById(id)
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    if (project.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: '프로젝트 소유자만 삭제할 수 있습니다' })
    }

    const owner = await User.findById(req.user.id).select('username')

    await PartnerProjectDeletionLog.create({
      projectId: project._id,
      title: project.title,
      category: project.category,
      status: project.status,
      ownerId: project.ownerId,
      ownerUsername: owner?.username,
      applicantCount: project.applicantCount,
      createdAt: project.createdAt,
      deletedBy: req.user.id,
      deletedByUsername: owner?.username,
      projectSnapshot: project.toObject(),
    })

    await PartnerProject.findByIdAndDelete(id)
    res.json({ success: true, message: '프로젝트가 삭제되었습니다' })
  } catch (error) {
    console.error('Delete project error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 프로젝트 지원
export const applyToProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { id } = req.params
    const project = await PartnerProject.findById(id)
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    if (project.status !== 'recruiting') {
      return res.status(400).json({ message: '모집 중인 프로젝트가 아닙니다' })
    }

    const existingApp = await ProjectApplication.findOne({
      projectId: id,
      applicantId: req.user.id,
    })
    if (existingApp) {
      return res.status(400).json({ message: '이미 지원한 프로젝트입니다' })
    }

    const { title, content } = req.body
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: '제목을 입력해주세요' })
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: '내용을 입력해주세요' })
    }

    const applicant = await User.findById(req.user.id).select('username email companyInfo contactPerson')
    if (!applicant) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    }

    // 지원자 정보/제안 금액은 계정 정보에서 채우거나 비워두며, 지원자가 직접 입력/조작할 수 없다
    const application = await ProjectApplication.create({
      projectId: id,
      applicantId: req.user.id,
      applicantName: (applicant as any).companyInfo?.companyName || applicant.username,
      email: applicant.email,
      phone: (applicant as any).companyInfo?.phone || (applicant as any).contactPerson?.phone || '',
      title: String(title).trim(),
      content: String(content).trim(),
    })

    await PartnerProject.findByIdAndUpdate(id, { $inc: { applicantCount: 1 } })

    res.status(201).json({ success: true, application })
  } catch (error) {
    console.error('Apply to project error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 지원자 목록 (프로젝트 소유자용)
export const getProjectApplicants = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const project = await PartnerProject.findById(id)
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    if (project.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const applicants = await ProjectApplication.find({ projectId: id })
      .populate('applicantId', 'username companyInfo memberType')
      .sort({ createdAt: -1 })

    res.json({ success: true, applicants })
  } catch (error) {
    console.error('Get project applicants error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 내 프로젝트 전체 지원자 목록 (프로젝트 소유자용)
export const getMyProjectApplicants = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const projects = await PartnerProject.find({ ownerId: req.user.id }).select('_id')
    const projectIds = projects.map((p) => p._id)

    const applicants = await ProjectApplication.find({ projectId: { $in: projectIds } })
      .populate('applicantId', 'username companyInfo memberType')
      .populate('projectId', 'title category applicationDeadline')
      .sort({ createdAt: -1 })

    res.json({ success: true, applicants })
  } catch (error) {
    console.error('Get my project applicants error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 지원 상태 변경
export const updateApplicationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id, appId } = req.params
    const { status } = req.body

    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const project = await PartnerProject.findById(id)
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    if (project.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const validStatuses = ['pending', 'approved', 'on-hold', 'rejected']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 상태입니다' })
    }

    const existingApplication = await ProjectApplication.findById(appId)
    if (!existingApplication) {
      return res.status(404).json({ message: '지원서를 찾을 수 없습니다' })
    }

    const isExpired = !!project.applicationDeadline && project.applicationDeadline < new Date()
    const isNewDecision = existingApplication.status !== 'approved'
    if (isExpired && isNewDecision && (status === 'approved' || status === 'rejected')) {
      return res.status(400).json({ message: '마감된 프로젝트는 지원자를 승인/거절할 수 없습니다' })
    }

    const application = await ProjectApplication.findByIdAndUpdate(
      appId,
      { status },
      { new: true }
    )

    if (!application) {
      return res.status(404).json({ message: '지원서를 찾을 수 없습니다' })
    }

    if (status === 'approved') {
      await ProjectApplication.updateMany(
        { projectId: id, _id: { $ne: appId }, status: { $ne: 'approved' } },
        { status: 'rejected' }
      )
      if (project.status !== 'matched') {
        await PartnerProject.findByIdAndUpdate(id, { status: 'matched' })
      }
    } else if (project.status === 'matched') {
      const stillHasApproved = await ProjectApplication.exists({ projectId: id, status: 'approved' })
      if (!stillHasApproved) {
        const isExpired = !!project.applicationDeadline && project.applicationDeadline < new Date()
        await PartnerProject.findByIdAndUpdate(id, { status: isExpired ? 'unmatched' : 'recruiting' })
      }
    }

    res.json({ success: true, application })
  } catch (error) {
    console.error('Update application status error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 내 지원 목록
export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const applications = await ProjectApplication.find({ applicantId: req.user.id })
      .populate('projectId', 'title category status budget duration')
      .sort({ createdAt: -1 })

    res.json({ success: true, applications })
  } catch (error) {
    console.error('Get my applications error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 내 프로젝트 목록
export const getMyProjects = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const projects = await PartnerProject.find({ ownerId: req.user.id })
      .sort({ createdAt: -1 })

    res.json({ success: true, projects })
  } catch (error) {
    console.error('Get my projects error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 특정 유저의 프로젝트 목록 (프로필 페이지용)
export const getProjectsByUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: '유효하지 않은 유저 ID입니다' })
    }

    const projects = await PartnerProject.find({
      ownerId: userId,
      status: { $in: ['recruiting', 'matched', 'unmatched'] },
    }).sort({ createdAt: -1 })

    res.json({ success: true, projects })
  } catch (error) {
    console.error('Get projects by user error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 특정 유저의 지원 현황 통계 (프로필 홈 공개 카드용 — 개인정보 없이 집계만 반환)
export const getApplicationStatsByUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: '유효하지 않은 유저 ID입니다' })
    }

    const approvedApplications = await ProjectApplication.find({ applicantId: userId, status: 'approved' })
      .populate('projectId', 'status')

    const participatingCount = approvedApplications.length
    const completedCount = approvedApplications.filter(
      (app: any) => app.projectId?.status === 'matched'
    ).length

    res.json({ success: true, participatingCount, completedCount })
  } catch (error) {
    console.error('Get application stats by user error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 파트너라운지 활동 이력 확인
export const getPartnerActivity = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const userId = req.user.id
    const hasPartnerProfile = await PartnerModel.exists({ userId })
    const hasProjects = await PartnerProject.exists({ ownerId: userId })
    const hasApplications = await ProjectApplication.exists({ applicantId: userId })

    res.json({
      success: true,
      hasActivity: !!(hasPartnerProfile || hasProjects || hasApplications),
    })
  } catch (error) {
    console.error('Get partner activity error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 문의 목록 조회
export const getProjectInquiries = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const project = await PartnerProject.findById(id).select('ownerId')
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    const viewerId = req.user?.id
    const isProjectOwner = !!viewerId && String(project.ownerId) === String(viewerId)

    const rows = await ProjectInquiry.find({ projectId: id })
      .populate('authorId', 'username')
      .sort({ createdAt: 1 })

    const authorIds = [...new Set(rows.map((row) => String(row.authorId?._id || row.authorId)))]
    const partnerChannels = await PartnerModel.find({ userId: { $in: authorIds } }).select('_id userId').lean()
    const partnerChannelMap = new Map(partnerChannels.map((p) => [String(p.userId), String(p._id)]))

    const inquiries = rows
      .filter((row) => {
        if (!row.isHidden) return true
        const isAuthor = !!viewerId && String(row.authorId?._id || row.authorId) === String(viewerId)
        return isProjectOwner || isAuthor
      })
      .map((row) => {
        const isAuthor = !!viewerId && String(row.authorId?._id || row.authorId) === String(viewerId)
        const canSeeSecret = isProjectOwner || isAuthor
        const obj = row.toObject()
        if (obj.isSecret && !canSeeSecret) {
          obj.content = '비밀글입니다'
        }
        const authorObjId = String((obj.authorId as any)?._id || obj.authorId)
        ;(obj.authorId as any).partnerChannelId = partnerChannelMap.get(authorObjId) || null
        return obj
      })

    res.json({ success: true, inquiries })
  } catch (error) {
    console.error('Get project inquiries error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 문의 등록 (답글은 parentId 포함)
export const createProjectInquiry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { id } = req.params
    const { content, parentId, isSecret } = req.body

    if (!content?.trim()) {
      return res.status(400).json({ message: '내용을 입력해주세요' })
    }

    const project = await PartnerProject.findById(id)
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    if (parentId) {
      const parent = await ProjectInquiry.findOne({ _id: parentId, projectId: id })
      if (!parent) {
        return res.status(404).json({ message: '원본 문의를 찾을 수 없습니다' })
      }
    }

    const inquiry = await ProjectInquiry.create({
      projectId: id,
      authorId: req.user.id,
      content: content.trim(),
      parentId: parentId || null,
      isSecret: !!isSecret,
    })
    await inquiry.populate('authorId', 'username')

    res.status(201).json({ success: true, inquiry })
  } catch (error) {
    console.error('Create project inquiry error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 문의 삭제 (작성자 본인만)
export const deleteProjectInquiry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { id, inquiryId } = req.params
    const inquiry = await ProjectInquiry.findOne({ _id: inquiryId, projectId: id })
    if (!inquiry) {
      return res.status(404).json({ message: '문의를 찾을 수 없습니다' })
    }

    if (String(inquiry.authorId) !== String(req.user.id)) {
      return res.status(403).json({ message: '본인이 작성한 문의만 삭제할 수 있습니다' })
    }

    const idsToDelete = [String(inquiryId)]
    let frontier = [String(inquiryId)]
    while (frontier.length > 0) {
      const children = await ProjectInquiry.find({ parentId: { $in: frontier } }).select('_id').lean()
      const childIds = children.map((c) => String(c._id))
      if (childIds.length === 0) break
      idsToDelete.push(...childIds)
      frontier = childIds
    }

    await ProjectInquiry.deleteMany({ _id: { $in: idsToDelete } })

    res.json({ success: true })
  } catch (error) {
    console.error('Delete project inquiry error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 문의 숨기기/숨김 해제 (프로젝트 등록자 전용)
export const hideProjectInquiry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { id, inquiryId } = req.params
    const project = await PartnerProject.findById(id).select('ownerId')
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' })
    }

    if (String(project.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: '프로젝트 등록자만 숨길 수 있습니다' })
    }

    const inquiry = await ProjectInquiry.findOne({ _id: inquiryId, projectId: id })
    if (!inquiry) {
      return res.status(404).json({ message: '문의를 찾을 수 없습니다' })
    }

    inquiry.isHidden = !inquiry.isHidden
    await inquiry.save()

    res.json({ success: true, isHidden: inquiry.isHidden })
  } catch (error) {
    console.error('Hide project inquiry error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}
