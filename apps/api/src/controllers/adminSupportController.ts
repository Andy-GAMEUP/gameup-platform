import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { SeasonModel, GameApplicationModel, SupportBannerModel, SupportTabModel } from '@gameup/db'

export const getSeasons = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const total = await SeasonModel.countDocuments()
    const seasons = await SeasonModel.find()
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ seasons, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '시즌 목록 조회 실패' })
  }
}

export const createSeason = async (req: AuthRequest, res: Response) => {
  try {
    const season = new SeasonModel({ ...req.body, status: 'draft' })
    await season.save()
    res.status(201).json({ message: '시즌이 생성되었습니다', season })
  } catch {
    res.status(500).json({ message: '시즌 생성 실패' })
  }
}

export const updateSeason = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const season = await SeasonModel.findByIdAndUpdate(id, req.body, { new: true })
    if (!season) return res.status(404).json({ message: '시즌을 찾을 수 없습니다' })
    res.json({ message: '시즌이 업데이트되었습니다', season })
  } catch {
    res.status(500).json({ message: '시즌 업데이트 실패' })
  }
}

export const updateSeasonStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const season = await SeasonModel.findByIdAndUpdate(id, { status }, { new: true })
    if (!season) return res.status(404).json({ message: '시즌을 찾을 수 없습니다' })
    res.json({ message: '시즌 상태가 업데이트되었습니다', season })
  } catch {
    res.status(500).json({ message: '시즌 상태 업데이트 실패' })
  }
}

export const deleteSeason = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const season = await SeasonModel.findByIdAndDelete(id)
    if (!season) return res.status(404).json({ message: '시즌을 찾을 수 없습니다' })
    res.json({ message: '시즌이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '시즌 삭제 실패' })
  }
}

export const getApplications = async (req: AuthRequest, res: Response) => {
  try {
    const { seasonId, status, page = 1, limit = 20 } = req.query
    const filter: Record<string, unknown> = {}
    if (seasonId) filter.seasonId = seasonId
    if (status && status !== 'all') filter.status = status
    const total = await GameApplicationModel.countDocuments(filter)
    const applications = await GameApplicationModel.find(filter)
      .populate('userId', 'username email profileImage')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ applications, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '신청 목록 조회 실패' })
  }
}

export const getApplicationDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const application = await GameApplicationModel.findById(id)
      .populate('userId', 'username email profileImage createdAt')
      .populate('minihomeId')
    if (!application) return res.status(404).json({ message: '신청을 찾을 수 없습니다' })
    res.json({ application })
  } catch {
    res.status(500).json({ message: '신청 상세 조회 실패' })
  }
}

export const updateApplicationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, adminNote } = req.body
    const update: Record<string, unknown> = {}
    if (status) update.status = status
    if (adminNote !== undefined) update.adminNote = adminNote
    if (status === 'selected') update.selectedAt = new Date()
    const application = await GameApplicationModel.findByIdAndUpdate(id, update, { new: true }).populate(
      'userId',
      'username email'
    )
    if (!application) return res.status(404).json({ message: '신청을 찾을 수 없습니다' })
    res.json({ message: '신청 상태가 업데이트되었습니다', application })
  } catch {
    res.status(500).json({ message: '신청 상태 업데이트 실패' })
  }
}

export const confirmApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const application = await GameApplicationModel.findByIdAndUpdate(
      id,
      { isConfirmed: true },
      { new: true }
    )
    if (!application) return res.status(404).json({ message: '신청을 찾을 수 없습니다' })
    res.json({ message: '신청이 확정되었습니다', application })
  } catch {
    res.status(500).json({ message: '신청 확정 실패' })
  }
}

export const scoreApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { gameplay, design, sound, business } = req.body
    const total = Math.round((gameplay + design + sound + business) / 4)
    const application = await GameApplicationModel.findByIdAndUpdate(
      id,
      { score: { gameplay, design, sound, business, total } },
      { new: true }
    )
    if (!application) return res.status(404).json({ message: '신청을 찾을 수 없습니다' })
    res.json({ message: '점수가 업데이트되었습니다', application })
  } catch {
    res.status(500).json({ message: '점수 업데이트 실패' })
  }
}

export const updateMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { milestones } = req.body
    const application = await GameApplicationModel.findByIdAndUpdate(
      id,
      { milestones },
      { new: true }
    )
    if (!application) return res.status(404).json({ message: '신청을 찾을 수 없습니다' })
    res.json({ message: '마일스톤이 업데이트되었습니다', application })
  } catch {
    res.status(500).json({ message: '마일스톤 업데이트 실패' })
  }
}

export const deleteApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const application = await GameApplicationModel.findByIdAndDelete(id)
    if (!application) return res.status(404).json({ message: '신청을 찾을 수 없습니다' })
    res.json({ message: '신청이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '신청 삭제 실패' })
  }
}

export const getBanners = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query
    const filter: Record<string, unknown> = {}
    if (category) filter.category = category
    const banners = await SupportBannerModel.find(filter).sort({ sortOrder: 1 })
    res.json({ banners })
  } catch {
    res.status(500).json({ message: '배너 목록 조회 실패' })
  }
}

export const createBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { category, title, imageUrl, linkUrl, isActive } = req.body
    if (!category || !title || !imageUrl)
      return res.status(400).json({ message: '카테고리, 제목, 이미지 URL은 필수입니다' })
    const maxOrder = await SupportBannerModel.findOne({ category }).sort({ sortOrder: -1 }).select('sortOrder')
    const banner = new SupportBannerModel({
      category,
      title,
      imageUrl,
      linkUrl: linkUrl || '',
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      isActive: isActive !== undefined ? isActive : true,
    })
    await banner.save()
    res.status(201).json({ message: '배너가 생성되었습니다', banner })
  } catch {
    res.status(500).json({ message: '배너 생성 실패' })
  }
}

export const updateBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, imageUrl, linkUrl, isActive, category } = req.body
    const update: Record<string, unknown> = {}
    if (title !== undefined) update.title = title
    if (imageUrl !== undefined) update.imageUrl = imageUrl
    if (linkUrl !== undefined) update.linkUrl = linkUrl
    if (isActive !== undefined) update.isActive = isActive
    if (category !== undefined) update.category = category
    const banner = await SupportBannerModel.findByIdAndUpdate(id, update, { new: true })
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ message: '배너가 업데이트되었습니다', banner })
  } catch {
    res.status(500).json({ message: '배너 업데이트 실패' })
  }
}

export const deleteBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const banner = await SupportBannerModel.findByIdAndDelete(id)
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ message: '배너가 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '배너 삭제 실패' })
  }
}

export const reorderBanners = async (req: AuthRequest, res: Response) => {
  try {
    const { banners } = req.body
    if (!Array.isArray(banners)) return res.status(400).json({ message: 'banners 배열이 필요합니다' })
    await Promise.all(
      banners.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        SupportBannerModel.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ message: '배너 순서가 업데이트되었습니다' })
  } catch {
    res.status(500).json({ message: '배너 순서 업데이트 실패' })
  }
}

export const getTabs = async (req: AuthRequest, res: Response) => {
  try {
    const tabs = await SupportTabModel.find().sort({ sortOrder: 1 })
    res.json({ tabs })
  } catch {
    res.status(500).json({ message: '탭 목록 조회 실패' })
  }
}

export const createTab = async (req: AuthRequest, res: Response) => {
  try {
    const { name, content, isActive } = req.body
    if (!name) return res.status(400).json({ message: '탭 이름은 필수입니다' })
    const maxOrder = await SupportTabModel.findOne().sort({ sortOrder: -1 }).select('sortOrder')
    const tab = new SupportTabModel({
      name,
      content: content || '',
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      isActive: isActive !== undefined ? isActive : true,
    })
    await tab.save()
    res.status(201).json({ message: '탭이 생성되었습니다', tab })
  } catch {
    res.status(500).json({ message: '탭 생성 실패' })
  }
}

export const updateTab = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, content, isActive } = req.body
    const update: Record<string, unknown> = {}
    if (name !== undefined) update.name = name
    if (content !== undefined) update.content = content
    if (isActive !== undefined) update.isActive = isActive
    const tab = await SupportTabModel.findByIdAndUpdate(id, update, { new: true })
    if (!tab) return res.status(404).json({ message: '탭을 찾을 수 없습니다' })
    res.json({ message: '탭이 업데이트되었습니다', tab })
  } catch {
    res.status(500).json({ message: '탭 업데이트 실패' })
  }
}

export const deleteTab = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const tab = await SupportTabModel.findByIdAndDelete(id)
    if (!tab) return res.status(404).json({ message: '탭을 찾을 수 없습니다' })
    res.json({ message: '탭이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '탭 삭제 실패' })
  }
}

export const reorderTabs = async (req: AuthRequest, res: Response) => {
  try {
    const { tabs } = req.body
    if (!Array.isArray(tabs)) return res.status(400).json({ message: 'tabs 배열이 필요합니다' })
    await Promise.all(
      tabs.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        SupportTabModel.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ message: '탭 순서가 업데이트되었습니다' })
  } catch {
    res.status(500).json({ message: '탭 순서 업데이트 실패' })
  }
}
