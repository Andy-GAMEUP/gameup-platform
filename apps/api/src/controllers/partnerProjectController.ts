import { Response } from 'express'
import mongoose from 'mongoose'
import {
  PartnerProjectModel as PartnerProject,
  PartnerProjectApplicationModel as ProjectApplication,
  PartnerProjectInquiryModel as ProjectInquiry,
  PartnerProjectDeletionLogModel as PartnerProjectDeletionLog,
  UserModel as User,
  PartnerModel,
  PartnerMessageModel as PartnerMessage,
  NotificationModel,
} from '@gameup/db'
import { AuthRequest } from '../middleware/auth'
import { containsContactInfo } from '../utils/contactInfoFilter'

// 알림 수신자의 지원자 목록(프로젝트 소유자) 또는 내가한 지원(지원자) 화면으로 바로 이동할
// 수 있는 링크 — 받는 사람이 자기 소유 파트너 채널이 없으면(아직 파트너 신청을 안 한 유저)
// 알림에 링크를 달지 않는다
async function projectManageLinkUrl(recipientUserId: string, tab: 'applicants' | 'applications') {
  const recipientPartner = await PartnerModel.findOne({ userId: recipientUserId }).select('_id').lean()
  return recipientPartner ? `/partner/${recipientPartner._id}/manage/projects/${tab}` : ''
}

// 메시지 알림에 표시할 발신자 쪽 회사 이름 — 파트너 채널의 대표 이름 우선, 없으면 계정에
// 등록된 회사명, 그마저 없으면 유저명으로 대체
async function getCompanyDisplayName(userId: string) {
  const partner = await PartnerModel.findOne({ userId, status: 'approved' }).select('displayNameOverride').lean()
  if (partner?.displayNameOverride) return partner.displayNameOverride
  const user = await User.findById(userId).select('companyInfo.companyName username').lean()
  return user?.companyInfo?.companyName || user?.username || '상대방'
}

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

    // 이미 지원 이력(거절 포함)이 있으면 재지원할 수 없으므로, 프론트에서 지원하기 버튼을
    // 비활성화할 수 있도록 현재 로그인 사용자의 지원 여부를 함께 내려준다
    const hasApplied = req.user
      ? !!(await ProjectApplication.exists({ projectId: id, applicantId: req.user.id }))
      : false

    res.json({
      success: true,
      project,
      partnerChannelId: partnerChannel?._id ?? null,
      partnerChannelPublic: partnerChannel?.isProfilePublic ?? false,
      hasApplied,
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

    // 지원 기업명을 눌러 새 탭에서 그 회사의 파트너 채널로 이동할 수 있게, 승인된 채널이
    // 있는 지원자에 한해 채널 id(=Partner._id)를 붙여준다
    const applicantUserIds = [...new Set(applicants.map((a) => String((a.applicantId as any)?._id)).filter(Boolean))]
    const applicantPartners = await PartnerModel.find({ userId: { $in: applicantUserIds }, status: 'approved' })
      .select('_id userId')
      .lean()
    const partnerChannelByUserId = new Map(applicantPartners.map((p) => [String(p.userId), String(p._id)]))
    const applicantsWithChannel = applicants.map((a) => {
      const obj = a.toObject() as any
      if (obj.applicantId && typeof obj.applicantId === 'object') {
        obj.applicantId.partnerChannelId = partnerChannelByUserId.get(String(obj.applicantId._id)) || null
      }
      return obj
    })

    res.json({ success: true, applicants: applicantsWithChannel })
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

    const validStatuses = ['pending', 'approved', 'on-hold', 'rejected', 'confirmed']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 상태입니다' })
    }

    const existingApplication = await ProjectApplication.findById(appId)
    if (!existingApplication) {
      return res.status(404).json({ message: '지원서를 찾을 수 없습니다' })
    }

    // 확정(confirmed)은 영구적인 최종 결정 — 한 번 확정되면 그 어떤 상태로도 다시 바꿀 수 없다
    if (existingApplication.status === 'confirmed') {
      return res.status(400).json({ message: '확정된 지원 건은 상태를 변경할 수 없습니다' })
    }

    // 거절(rejected)도 최종 결정 — 다시 승인 등으로 되돌릴 수 없다
    if (existingApplication.status === 'rejected') {
      return res.status(400).json({ message: '거절된 지원 건은 상태를 변경할 수 없습니다' })
    }

    // 승인 전 단계에서는 여러 명을 동시에 승인해둘 수 있으므로, 마감 후에는 아직 확정되지
    // 않은 지원서에 대한 신규 승인/거절만 막는다 (확정 자체는 마감 여부와 무관하게 항상 허용)
    const isExpired = !!project.applicationDeadline && project.applicationDeadline < new Date()
    if (isExpired && (status === 'approved' || status === 'rejected')) {
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

    // 승인(approved)은 매칭 후보를 여러 명 동시에 표시하는 단계일 뿐이라 프로젝트 상태나
    // 다른 지원서에 영향을 주지 않는다 — 실제 매칭은 아래 confirmed에서 확정되며, 확정은
    // 위에서 영구적으로 고정되므로 프로젝트가 다시 매칭 이전 상태로 되돌아갈 일은 없다
    if (status === 'confirmed') {
      await ProjectApplication.updateMany(
        { projectId: id, _id: { $ne: appId }, status: { $ne: 'confirmed' } },
        { status: 'rejected' }
      )
      if (project.status !== 'matched') {
        await PartnerProject.findByIdAndUpdate(id, { status: 'matched' })
      }

      await NotificationModel.create({
        userId: application.applicantId,
        type: 'proposal',
        title: '매칭이 확정되었습니다',
        content: `[${project.title}] 지원 건의 매칭이 확정되었습니다`,
        linkUrl: await projectManageLinkUrl(String(application.applicantId), 'applications'),
      }).catch(() => {})
    }

    res.json({ success: true, application })
  } catch (error) {
    console.error('Update application status error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 지원 취소 (지원자 본인) — 확정(confirmed) 전까지는 승인/거절 여부와 무관하게 언제든 취소 가능하며,
// 취소하면 지원서 자체가 삭제되어 같은 프로젝트에 다시 지원할 수 있게 된다
export const cancelApplication = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { appId } = req.params
    const application = await ProjectApplication.findById(appId)
    if (!application) {
      return res.status(404).json({ message: '지원서를 찾을 수 없습니다' })
    }

    if (application.applicantId.toString() !== req.user.id) {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    if (application.status === 'confirmed') {
      return res.status(400).json({ message: '확정된 지원 건은 취소할 수 없습니다' })
    }

    await ProjectApplication.findByIdAndDelete(appId)
    await PartnerProject.findByIdAndUpdate(application.projectId, { $inc: { applicantCount: -1 } })

    res.json({ success: true, message: '지원을 취소했습니다' })
  } catch (error) {
    console.error('Cancel application error:', error)
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
      .populate({
        path: 'projectId',
        select: 'title category status budget duration ownerId',
        populate: { path: 'ownerId', select: 'username email companyInfo.companyName companyInfo.phone contactPerson.phone' },
      })
      .sort({ createdAt: -1 })

    // 등록 기업명을 눌러 새 탭에서 그 회사의 파트너 채널로 이동할 수 있게, 승인된 채널이
    // 있는 소유자에 한해 채널 id(=Partner._id)를 붙여준다
    const ownerUserIds = [...new Set(
      applications.map((a) => String((a.projectId as any)?.ownerId?._id)).filter((v) => v !== 'undefined')
    )]
    const ownerPartners = await PartnerModel.find({ userId: { $in: ownerUserIds }, status: 'approved' })
      .select('_id userId')
      .lean()
    const partnerChannelByOwnerId = new Map(ownerPartners.map((p) => [String(p.userId), String(p._id)]))

    // 매칭 확정 전에는 프로젝트 소유자의 이메일/연락처를 노출하지 않음 — 확정된 지원 건만 공개
    const sanitized = applications.map((application) => {
      const obj = application.toObject() as any
      if (obj.projectId?.ownerId) {
        obj.projectId.ownerId.partnerChannelId = partnerChannelByOwnerId.get(String(obj.projectId.ownerId._id)) || null
        if (obj.status !== 'confirmed') {
          delete obj.projectId.ownerId.email
          if (obj.projectId.ownerId.companyInfo) delete obj.projectId.ownerId.companyInfo.phone
          delete obj.projectId.ownerId.contactPerson
        }
      }
      return obj
    })

    res.json({ success: true, applications: sanitized })
  } catch (error) {
    console.error('Get my applications error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 지원 건의 프로젝트 소유자 <-> 지원자 메시지 보내기 — 승인 여부와 무관하게 언제든 가능
export const sendApplicationMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { appId } = req.params
    const { content } = req.body
    if (!content?.trim()) {
      return res.status(400).json({ message: '메시지 내용을 입력해주세요' })
    }
    if (containsContactInfo(content)) {
      return res.status(400).json({ message: '이메일 주소, 전화번호 등 연락처는 메시지에 포함할 수 없습니다' })
    }

    const application = await ProjectApplication.findById(appId).populate('projectId', 'ownerId')
    if (!application) {
      return res.status(404).json({ message: '지원서를 찾을 수 없습니다' })
    }

    const project = application.projectId as any
    const userId = req.user.id
    let recipientUserId: string
    if (String(project.ownerId) === String(userId)) {
      recipientUserId = String(application.applicantId)
    } else if (String(application.applicantId) === String(userId)) {
      recipientUserId = String(project.ownerId)
    } else {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    if (String(application.applicantId) === String(userId)) {
      // 거절된 지원 건은 지원자 쪽에서 더 이상 협의할 수 없다
      if (application.status === 'rejected') {
        return res.status(403).json({ message: '거절된 지원 건은 더 이상 협의할 수 없습니다' })
      }
      // 지원자는 프로젝트 담당자가 먼저 연락하기 전까지는 대화를 먼저 시작할 수 없다 —
      // 이 지원 건과 무관하게 두 사람 사이에 주고받은 메시지가 하나라도 있으면 허용
      const hasPriorMessage = await PartnerMessage.exists({
        $or: [
          { senderId: userId, recipientUserId },
          { senderId: recipientUserId, recipientUserId: userId },
        ],
      })
      if (!hasPriorMessage) {
        return res.status(403).json({ message: '담당자가 먼저 메시지를 보내야 대화를 시작할 수 있습니다' })
      }
    }

    // 매칭된 지원 건에서 처음 보내는 연락은 매번 새 대화(rootId 자기참조)로 시작 —
    // "연락하기" 방식과 동일하게 이 지원 건에 대해 여러 번 눌러도 각각 독립된 대화 카드가 됨
    const messageId = new mongoose.Types.ObjectId()
    const message = await PartnerMessage.create({
      _id: messageId,
      rootId: messageId,
      senderId: userId,
      recipientUserId,
      applicationId: application._id,
      content: content.trim(),
    })
    await message.populate('senderId', 'username profileImage')

    const recipientTab = String(project.ownerId) === recipientUserId ? 'applicants' : 'applications'
    const senderCompanyName = await getCompanyDisplayName(userId)
    await NotificationModel.create({
      userId: recipientUserId,
      type: 'proposal',
      title: '파트너 라운지 새 메시지 도착',
      content: `[${senderCompanyName}] 메시지를 확인하세요`,
      linkUrl: await projectManageLinkUrl(recipientUserId, recipientTab),
    }).catch(() => {})

    // 대화가 시작되면(첫 메시지) 검토중(pending)에서 협의 중(approved)으로 자동 전환 —
    // 이미 최종 결정(거절/확정)된 지원 건은 건드리지 않음
    if (application.status === 'pending') {
      await ProjectApplication.findByIdAndUpdate(application._id, { status: 'approved' })
    }

    res.status(201).json({ message: '메시지를 보냈습니다', data: message })
  } catch (error) {
    console.error('Send application message error:', error)
    res.status(500).json({ message: '메시지 전송 실패' })
  }
}

// 지원 건 단위 메시지 히스토리 — 같은 상대와 다른 프로젝트에서 나눈 무관한 대화가 섞이지
// 않도록, 이 지원 건(applicationId)에 연결된 메시지만 가져온다
export const getMessageThreadByApplication = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { appId } = req.params
    const application = await ProjectApplication.findById(appId).populate('projectId', 'ownerId')
    if (!application) {
      return res.status(404).json({ message: '지원서를 찾을 수 없습니다' })
    }

    const project = application.projectId as any
    const userId = req.user.id
    if (String(project.ownerId) !== String(userId) && String(application.applicantId) !== String(userId)) {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const messages = await PartnerMessage.find({ applicationId: appId })
      .populate('senderId', 'username profileImage')
      .sort({ createdAt: 1 })

    res.json({ messages })
  } catch (error) {
    console.error('Get message thread by application error:', error)
    res.status(500).json({ message: '메시지 히스토리 조회 실패' })
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

    const confirmedApplications = await ProjectApplication.find({ applicantId: userId, status: 'confirmed' })
      .populate('projectId', 'status')

    const participatingCount = confirmedApplications.length
    const completedCount = confirmedApplications.filter(
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
