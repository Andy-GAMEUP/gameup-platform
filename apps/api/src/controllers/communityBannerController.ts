import { Request, Response } from 'express'
import { CommunityBannerModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

/** GET /api/admin/community/banners (공개) — 활성 배너 목록 */
export const getCommunityBanners = async (req: Request, res: Response) => {
  try {
    const position = (req.query.position as string) || 'community'
    const banners = await CommunityBannerModel.find({ isActive: true, position })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select('imageUrl linkUrl title createdAt position')
    res.json({ banners })
  } catch {
    res.status(500).json({ message: '배너 조회 실패' })
  }
}

/** GET /api/admin/community/banners/all — 전체 목록 (관리자) */
export const getAllCommunityBanners = async (req: AuthRequest, res: Response) => {
  try {
    const position = (req.query.position as string) || 'community'
    const banners = await CommunityBannerModel.find({ position })
      .sort({ sortOrder: 1, createdAt: 1 })
    res.json({ banners })
  } catch {
    res.status(500).json({ message: '배너 조회 실패' })
  }
}

/** POST /api/admin/community/banners — 배너 추가 (위치별 최대 5개) */
export const uploadCommunityBanner = async (req: AuthRequest, res: Response) => {
  try {
    const allowed = ['community', 'main', 'event']
    const position = allowed.includes(req.body.position) ? req.body.position : 'community'
    const count = await CommunityBannerModel.countDocuments({ position })
    if (count >= 5) return res.status(400).json({ message: '배너는 최대 5개까지 등록 가능합니다' })

    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    const file = files?.bannerImage?.[0]
    if (!file) return res.status(400).json({ message: '이미지 파일을 선택해주세요' })

    const { linkUrl, title } = req.body
    const banner = await CommunityBannerModel.create({
      imageUrl: `/uploads/banners/${file.filename}`,
      linkUrl: linkUrl?.trim() || '',
      title: title?.trim() || '',
      sortOrder: count,
      position,
    })
    res.status(201).json({ banner })
  } catch {
    res.status(500).json({ message: '배너 업로드 실패' })
  }
}

/** PATCH /api/admin/community/banners/:id — 배너 수정 */
export const updateCommunityBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { linkUrl, title, isActive, sortOrder } = req.body
    const update: Record<string, unknown> = {}
    if (linkUrl !== undefined) update.linkUrl = linkUrl.trim()
    if (title !== undefined) update.title = title.trim()
    if (isActive !== undefined) update.isActive = isActive
    if (sortOrder !== undefined) update.sortOrder = Number(sortOrder)

    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    const file = files?.bannerImage?.[0]
    if (file) update.imageUrl = `/uploads/banners/${file.filename}`

    const banner = await CommunityBannerModel.findByIdAndUpdate(id, update, { new: true })
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ banner })
  } catch {
    res.status(500).json({ message: '배너 수정 실패' })
  }
}

/** DELETE /api/admin/community/banners/:id — 배너 삭제 */
export const deleteCommunityBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const banner = await CommunityBannerModel.findByIdAndDelete(id)
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ message: '삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '배너 삭제 실패' })
  }
}
