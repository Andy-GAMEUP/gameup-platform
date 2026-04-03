import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { EventBannerModel, EventRegistrationModel } from '@gameup/db'

// ── 공개 API ──────────────────────────────────────────────────────

/** GET /api/event-banners — 활성 이벤트 배너 목록 (공개) */
export const getActiveEventBanners = async (_req: Request, res: Response) => {
  try {
    const banners = await EventBannerModel.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .select('title description imageUrl linkUrl')
    res.json({ banners })
  } catch {
    res.status(500).json({ message: '이벤트 배너 조회 실패' })
  }
}

/** POST /api/event-banners/:id/register — 이벤트 참가 신청 */
export const registerForEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, email, phone, userId } = req.body

    if (!name || !email || !phone) {
      return res.status(400).json({ message: '이름, 이메일, 전화번호는 필수입니다' })
    }

    const banner = await EventBannerModel.findById(id)
    if (!banner || !banner.isActive) {
      return res.status(404).json({ message: '유효하지 않은 이벤트입니다' })
    }

    // 중복 신청 체크
    const existing = await EventRegistrationModel.findOne({ eventBanner: id, email })
    if (existing) {
      return res.status(409).json({ message: '이미 해당 이벤트에 신청하셨습니다' })
    }

    const registration = await EventRegistrationModel.create({
      eventBanner: id,
      userId: userId || null,
      name,
      email,
      phone,
    })

    res.status(201).json({ message: '이벤트 신청이 완료되었습니다', registration })
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ message: '이미 해당 이벤트에 신청하셨습니다' })
    }
    res.status(500).json({ message: '이벤트 신청 실패' })
  }
}

// ── 관리자 API ────────────────────────────────────────────────────

/** GET /api/admin/event-banners — 전체 이벤트 배너 목록 */
export const getAllEventBanners = async (_req: AuthRequest, res: Response) => {
  try {
    const banners = await EventBannerModel.find().sort({ sortOrder: 1 })
    res.json({ banners })
  } catch {
    res.status(500).json({ message: '이벤트 배너 조회 실패' })
  }
}

/** POST /api/admin/event-banners — 이벤트 배너 생성 */
export const createEventBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, linkUrl } = req.body
    if (!title || !imageUrl) {
      return res.status(400).json({ message: '제목과 이미지는 필수입니다' })
    }

    const count = await EventBannerModel.countDocuments()
    const banner = await EventBannerModel.create({
      title,
      description: description || '',
      imageUrl,
      linkUrl: linkUrl || '',
      sortOrder: count,
    })
    res.status(201).json({ banner })
  } catch {
    res.status(500).json({ message: '이벤트 배너 생성 실패' })
  }
}

/** PUT /api/admin/event-banners/:id — 이벤트 배너 수정 */
export const updateEventBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, imageUrl, linkUrl, isActive } = req.body

    const banner = await EventBannerModel.findByIdAndUpdate(
      id,
      { title, description, imageUrl, linkUrl, isActive },
      { new: true, runValidators: true }
    )
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ banner })
  } catch {
    res.status(500).json({ message: '이벤트 배너 수정 실패' })
  }
}

/** DELETE /api/admin/event-banners/:id — 이벤트 배너 삭제 */
export const deleteEventBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const banner = await EventBannerModel.findByIdAndDelete(id)
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    // 관련 신청도 삭제
    await EventRegistrationModel.deleteMany({ eventBanner: id })
    res.json({ message: '삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '이벤트 배너 삭제 실패' })
  }
}

/** PUT /api/admin/event-banners/reorder — 순서 변경 */
export const reorderEventBanners = async (req: AuthRequest, res: Response) => {
  try {
    const { banners } = req.body // [{ _id, sortOrder }]
    if (!Array.isArray(banners)) return res.status(400).json({ message: 'banners 배열이 필요합니다' })

    await Promise.all(
      banners.map((b: { _id: string; sortOrder: number }) =>
        EventBannerModel.findByIdAndUpdate(b._id, { sortOrder: b.sortOrder })
      )
    )
    res.json({ message: '순서가 변경되었습니다' })
  } catch {
    res.status(500).json({ message: '순서 변경 실패' })
  }
}

/** GET /api/admin/event-registrations — 이벤트 신청 목록 조회 */
export const getEventRegistrations = async (req: AuthRequest, res: Response) => {
  try {
    const { eventBannerId, page = '1', limit = '20' } = req.query
    const filter: Record<string, unknown> = {}
    if (eventBannerId) filter.eventBanner = eventBannerId

    const skip = (Number(page) - 1) * Number(limit)
    const [registrations, total] = await Promise.all([
      EventRegistrationModel.find(filter)
        .populate('eventBanner', 'title')
        .populate('userId', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      EventRegistrationModel.countDocuments(filter),
    ])

    res.json({
      registrations,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch {
    res.status(500).json({ message: '이벤트 신청 목록 조회 실패' })
  }
}
