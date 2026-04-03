import { Response } from 'express'
import {
  PartnerProjectModel as PartnerProject,
  PartnerProjectApplicationModel as ProjectApplication,
  UserModel as User,
} from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

// 프로젝트 목록
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, status, tab, page = 1, limit = 12 } = req.query

    const filter: Record<string, unknown> = {
      status: { $in: ['recruiting', 'ongoing'] },
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
    } else if (tab === 'ongoing') {
      filter.status = 'ongoing'
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
      status: { $in: ['recruiting', 'ongoing'] },
    })
    const recruiting = await PartnerProject.countDocuments({ status: 'recruiting' })

    const applicantResult = await PartnerProject.aggregate([
      { $match: { status: { $in: ['recruiting', 'ongoing'] } } },
      { $group: { _id: null, totalApplicants: { $sum: '$applicantCount' } } },
    ])
    const totalApplicants = applicantResult.length > 0 ? applicantResult[0].totalApplicants : 0

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newThisWeek = await PartnerProject.countDocuments({
      createdAt: { $gte: oneWeekAgo },
      status: { $in: ['recruiting', 'ongoing'] },
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

    res.json({ success: true, project })
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

    const updated = await PartnerProject.findByIdAndUpdate(id, req.body, { new: true })
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

    await PartnerProject.findByIdAndUpdate(id, { status: 'cancelled' })
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

    const application = await ProjectApplication.create({
      projectId: id,
      applicantId: req.user.id,
      ...req.body,
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

    const application = await ProjectApplication.findByIdAndUpdate(
      appId,
      { status },
      { new: true }
    )

    if (!application) {
      return res.status(404).json({ message: '지원서를 찾을 수 없습니다' })
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

// 파트너라운지 활동 이력 확인
export const getPartnerActivity = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const userId = req.user.id
    const hasProjects = await PartnerProject.exists({ ownerId: userId })
    const hasApplications = await ProjectApplication.exists({ applicantId: userId })

    res.json({
      success: true,
      hasActivity: !!(hasProjects || hasApplications),
    })
  } catch (error) {
    console.error('Get partner activity error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}
