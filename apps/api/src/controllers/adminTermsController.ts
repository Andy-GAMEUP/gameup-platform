import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { TermsModel } from '@gameup/db'

export const getTerms = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query
    const filter: Record<string, unknown> = {}
    if (type) filter.type = type
    const terms = await TermsModel.find(filter).populate('updatedBy', 'username email')
    res.json({ terms })
  } catch {
    res.status(500).json({ message: '약관 조회 실패' })
  }
}

export const updateTerms = async (req: AuthRequest, res: Response) => {
  try {
    const { type, content } = req.body
    if (!type || !content) {
      return res.status(400).json({ message: 'type과 content는 필수입니다' })
    }
    if (!['privacy', 'service'].includes(type)) {
      return res.status(400).json({ message: 'type은 privacy 또는 service여야 합니다' })
    }

    const adminId = req.user?.id
    const terms = await TermsModel.findOneAndUpdate(
      { type },
      { content, updatedBy: adminId },
      { upsert: true, new: true }
    ).populate('updatedBy', 'username email')

    res.json({ message: '약관이 업데이트되었습니다', terms })
  } catch {
    res.status(500).json({ message: '약관 업데이트 실패' })
  }
}
