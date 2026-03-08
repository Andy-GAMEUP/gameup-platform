import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  PublishingBannerModel as PublishingBanner,
  PublishingTabModel as PublishingTab,
  PublishingSuggestModel as PublishingSuggest,
} from '@gameup/db'

type PublishingType = 'hms' | 'hk'

const isValidType = (type: string): type is PublishingType =>
  type === 'hms' || type === 'hk'

export const getSuggests = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    if (!isValidType(type)) return res.status(400).json({ message: '유효하지 않은 플랫폼 타입입니다' })

    const { page = 1, limit = 20, status } = req.query
    const filter: Record<string, unknown> = { publishingType: type }
    if (status && status !== 'all') filter.status = status

    const total = await PublishingSuggest.countDocuments(filter)
    const suggests = await PublishingSuggest.find(filter)
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
    const suggest = await PublishingSuggest.findById(id).populate('userId', 'username email profileImage createdAt')
    if (!suggest) return res.status(404).json({ message: '제안을 찾을 수 없습니다' })
    res.json({ suggest })
  } catch {
    res.status(500).json({ message: '제안 상세 조회 실패' })
  }
}

export const updateSuggest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, adminNote } = req.body
    const update: Record<string, unknown> = {}
    if (status) update.status = status
    if (adminNote !== undefined) update.adminNote = adminNote

    const suggest = await PublishingSuggest.findByIdAndUpdate(id, update, { new: true }).populate('userId', 'username email')
    if (!suggest) return res.status(404).json({ message: '제안을 찾을 수 없습니다' })
    res.json({ message: '제안이 업데이트되었습니다', suggest })
  } catch {
    res.status(500).json({ message: '제안 업데이트 실패' })
  }
}

export const deleteSuggest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const suggest = await PublishingSuggest.findByIdAndDelete(id)
    if (!suggest) return res.status(404).json({ message: '제안을 찾을 수 없습니다' })
    res.json({ message: '제안이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '제안 삭제 실패' })
  }
}

export const getBanners = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    if (!isValidType(type)) return res.status(400).json({ message: '유효하지 않은 플랫폼 타입입니다' })

    const banners = await PublishingBanner.find({ publishingType: type }).sort({ sortOrder: 1 })
    res.json({ banners })
  } catch {
    res.status(500).json({ message: '배너 목록 조회 실패' })
  }
}

export const createBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    if (!isValidType(type)) return res.status(400).json({ message: '유효하지 않은 플랫폼 타입입니다' })

    const { title, imageUrl, linkUrl, isActive } = req.body
    if (!title || !imageUrl) return res.status(400).json({ message: '제목과 이미지 URL은 필수입니다' })

    const maxOrder = await PublishingBanner.findOne({ publishingType: type }).sort({ sortOrder: -1 }).select('sortOrder')
    const banner = new PublishingBanner({
      publishingType: type,
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
    const { title, imageUrl, linkUrl, isActive } = req.body
    const update: Record<string, unknown> = {}
    if (title !== undefined) update.title = title
    if (imageUrl !== undefined) update.imageUrl = imageUrl
    if (linkUrl !== undefined) update.linkUrl = linkUrl
    if (isActive !== undefined) update.isActive = isActive

    const banner = await PublishingBanner.findByIdAndUpdate(id, update, { new: true })
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ message: '배너가 업데이트되었습니다', banner })
  } catch {
    res.status(500).json({ message: '배너 업데이트 실패' })
  }
}

export const deleteBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const banner = await PublishingBanner.findByIdAndDelete(id)
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ message: '배너가 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '배너 삭제 실패' })
  }
}

export const reorderBanners = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    if (!isValidType(type)) return res.status(400).json({ message: '유효하지 않은 플랫폼 타입입니다' })

    const { banners } = req.body
    if (!Array.isArray(banners)) return res.status(400).json({ message: 'banners 배열이 필요합니다' })

    await Promise.all(
      banners.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        PublishingBanner.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ message: '배너 순서가 업데이트되었습니다' })
  } catch {
    res.status(500).json({ message: '배너 순서 업데이트 실패' })
  }
}

export const getTabs = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    if (!isValidType(type)) return res.status(400).json({ message: '유효하지 않은 플랫폼 타입입니다' })

    const tabs = await PublishingTab.find({ publishingType: type }).sort({ sortOrder: 1 })
    res.json({ tabs })
  } catch {
    res.status(500).json({ message: '탭 목록 조회 실패' })
  }
}

export const createTab = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    if (!isValidType(type)) return res.status(400).json({ message: '유효하지 않은 플랫폼 타입입니다' })

    const { name, content, isActive } = req.body
    if (!name) return res.status(400).json({ message: '탭 이름은 필수입니다' })

    const maxOrder = await PublishingTab.findOne({ publishingType: type }).sort({ sortOrder: -1 }).select('sortOrder')
    const tab = new PublishingTab({
      publishingType: type,
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

    const tab = await PublishingTab.findByIdAndUpdate(id, update, { new: true })
    if (!tab) return res.status(404).json({ message: '탭을 찾을 수 없습니다' })
    res.json({ message: '탭이 업데이트되었습니다', tab })
  } catch {
    res.status(500).json({ message: '탭 업데이트 실패' })
  }
}

export const deleteTab = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const tab = await PublishingTab.findByIdAndDelete(id)
    if (!tab) return res.status(404).json({ message: '탭을 찾을 수 없습니다' })
    res.json({ message: '탭이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '탭 삭제 실패' })
  }
}

export const reorderTabs = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params
    if (!isValidType(type)) return res.status(400).json({ message: '유효하지 않은 플랫폼 타입입니다' })

    const { tabs } = req.body
    if (!Array.isArray(tabs)) return res.status(400).json({ message: 'tabs 배열이 필요합니다' })

    await Promise.all(
      tabs.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        PublishingTab.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ message: '탭 순서가 업데이트되었습니다' })
  } catch {
    res.status(500).json({ message: '탭 순서 업데이트 실패' })
  }
}
