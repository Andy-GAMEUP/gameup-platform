import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  PublishingModel,
  PublishingBannerModel,
  PublishingTabModel,
  PublishingSuggestModel,
  GameModel,
} from '@gameup/db'

export const getPublishingLanding = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    const [publishing, banners, tabs] = await Promise.all([
      PublishingModel.findOne({ type, isActive: true }),
      PublishingBannerModel.find({ publishingType: type, isActive: true }).sort({ sortOrder: 1 }),
      PublishingTabModel.find({ publishingType: type, isActive: true }).sort({ sortOrder: 1 }),
    ])
    const featuredGames = await GameModel.find({ status: 'active' })
      .populate('developerId', 'username')
      .sort({ createdAt: -1 })
      .limit(8)
    res.json({ publishing, banners, tabs, featuredGames })
  } catch {
    res.status(500).json({ message: '퍼블리싱 랜딩 조회 실패' })
  }
}

export const getPublishingGame = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const game = await GameModel.findById(gameId).populate('developerId', 'username')
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    res.json({ game })
  } catch {
    res.status(500).json({ message: '게임 상세 조회 실패' })
  }
}

export const getMyGames = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { type } = req.params
    const suggests = await PublishingSuggestModel.find({
      userId: req.user.id,
      publishingType: type,
    }).sort({ createdAt: -1 })
    res.json({ suggests })
  } catch {
    res.status(500).json({ message: '내 게임 목록 조회 실패' })
  }
}

export const createSuggest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const {
      publishingType,
      gameName,
      gameDescription,
      appIcon,
      coverImage,
      screenshots,
      buildUrl,
      additionalServices,
    } = req.body
    if (!gameName || !gameDescription) {
      return res.status(400).json({ message: '게임 이름과 설명은 필수입니다' })
    }
    const suggest = new PublishingSuggestModel({
      publishingType,
      userId: req.user.id,
      gameName,
      gameDescription,
      appIcon: appIcon || '',
      coverImage: coverImage || '',
      screenshots: screenshots || [],
      buildUrl: buildUrl || '',
      additionalServices: additionalServices || [],
      status: 'pending',
    })
    await suggest.save()
    res.status(201).json({ message: '게임 제안이 생성되었습니다', suggest })
  } catch {
    res.status(500).json({ message: '게임 제안 생성 실패' })
  }
}

export const getMySuggests = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { page = 1, limit = 20, publishingType } = req.query
    const filter: Record<string, unknown> = { userId: req.user.id }
    if (publishingType) filter.publishingType = publishingType
    const total = await PublishingSuggestModel.countDocuments(filter)
    const suggests = await PublishingSuggestModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ suggests, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '내 제안 목록 조회 실패' })
  }
}

export const getSuggests = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, publishingType } = req.query
    const filter: Record<string, unknown> = {}
    if (status && status !== 'all') filter.status = status
    if (publishingType) filter.publishingType = publishingType
    const total = await PublishingSuggestModel.countDocuments(filter)
    const suggests = await PublishingSuggestModel.find(filter)
      .populate('userId', 'username email profileImage')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ suggests, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '제안 목록 조회 실패' })
  }
}

export const getSuggestDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const suggest = await PublishingSuggestModel.findById(id).populate(
      'userId',
      'username email profileImage'
    )
    if (!suggest) return res.status(404).json({ message: '제안을 찾을 수 없습니다' })
    res.json({ suggest })
  } catch {
    res.status(500).json({ message: '제안 상세 조회 실패' })
  }
}

export const updateSuggestStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, adminNote } = req.body
    const suggest = await PublishingSuggestModel.findByIdAndUpdate(
      id,
      { status, adminNote },
      { new: true }
    ).populate('userId', 'username email')
    if (!suggest) return res.status(404).json({ message: '제안을 찾을 수 없습니다' })
    res.json({ message: '제안 상태가 업데이트되었습니다', suggest })
  } catch {
    res.status(500).json({ message: '제안 상태 업데이트 실패' })
  }
}

export const deleteSuggest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const suggest = await PublishingSuggestModel.findByIdAndDelete(id)
    if (!suggest) return res.status(404).json({ message: '제안을 찾을 수 없습니다' })
    res.json({ message: '제안이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '제안 삭제 실패' })
  }
}

export const getBanners = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    const banners = await PublishingBannerModel.find({ publishingType: type }).sort({ sortOrder: 1 })
    res.json({ banners })
  } catch {
    res.status(500).json({ message: '배너 조회 실패' })
  }
}

export const createBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    const { title, imageUrl, linkUrl, isActive } = req.body
    const maxOrder = await PublishingBannerModel.findOne({ publishingType: type })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
    const banner = new PublishingBannerModel({
      publishingType: type,
      title,
      imageUrl,
      linkUrl,
      isActive,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
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
    const banner = await PublishingBannerModel.findByIdAndUpdate(id, req.body, { new: true })
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ message: '배너가 업데이트되었습니다', banner })
  } catch {
    res.status(500).json({ message: '배너 업데이트 실패' })
  }
}

export const deleteBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const banner = await PublishingBannerModel.findByIdAndDelete(id)
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
        PublishingBannerModel.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ message: '순서가 업데이트되었습니다' })
  } catch {
    res.status(500).json({ message: '배너 순서 업데이트 실패' })
  }
}

export const getTabs = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    const tabs = await PublishingTabModel.find({ publishingType: type }).sort({ sortOrder: 1 })
    res.json({ tabs })
  } catch {
    res.status(500).json({ message: '탭 조회 실패' })
  }
}

export const createTab = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    const { name, content, isActive } = req.body
    const maxOrder = await PublishingTabModel.findOne({ publishingType: type })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
    const tab = new PublishingTabModel({
      publishingType: type,
      name,
      content,
      isActive,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
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
    const tab = await PublishingTabModel.findByIdAndUpdate(id, req.body, { new: true })
    if (!tab) return res.status(404).json({ message: '탭을 찾을 수 없습니다' })
    res.json({ message: '탭이 업데이트되었습니다', tab })
  } catch {
    res.status(500).json({ message: '탭 업데이트 실패' })
  }
}

export const deleteTab = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const tab = await PublishingTabModel.findByIdAndDelete(id)
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
        PublishingTabModel.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ message: '순서가 업데이트되었습니다' })
  } catch {
    res.status(500).json({ message: '탭 순서 업데이트 실패' })
  }
}
