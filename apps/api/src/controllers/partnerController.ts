import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { PartnerModel as Partner, TopicGroupModel as TopicGroup } from '@gameup/db'

// ── 파트너 신청 ───────────────────────────────────────────────────
export const applyPartner = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { introduction, activityPlan, slogan, externalUrl, selectedTopics, profileImage } = req.body

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
    })
    await partner.save()

    res.status(201).json({ message: '파트너 신청이 완료되었습니다', partner })
  } catch {
    res.status(500).json({ message: '파트너 신청 실패' })
  }
}

// ── 내 파트너 상태 조회 ───────────────────────────────────────────
export const getMyPartnerStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const partner = await Partner.findOne({ userId })
    if (!partner) {
      return res.status(404).json({ message: '파트너 신청 내역이 없습니다' })
    }
    res.json({ partner })
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
