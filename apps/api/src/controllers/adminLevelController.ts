import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { LevelModel, UserModel } from '@gameup/db'

export const getLevels = async (req: AuthRequest, res: Response) => {
  try {
    const levels = await LevelModel.find().sort({ level: 1 })
    res.json({ levels })
  } catch {
    res.status(500).json({ message: '레벨 목록 조회 실패' })
  }
}

export const updateLevels = async (req: AuthRequest, res: Response) => {
  try {
    const { levels } = req.body
    if (!Array.isArray(levels) || levels.length === 0) {
      return res.status(400).json({ message: 'levels 배열이 필요합니다' })
    }

    await Promise.all(
      levels.map(
        (item: { level: number; name: string; icon?: string; requiredScore: number }) =>
          LevelModel.findOneAndUpdate(
            { level: item.level },
            { name: item.name, icon: item.icon, requiredScore: item.requiredScore },
            { upsert: true, new: true }
          )
      )
    )

    const allLevels = await LevelModel.find().sort({ level: 1 })

    await Promise.all(
      allLevels.map(async (levelDoc) => {
        const nextLevel = allLevels.find((l) => l.level === levelDoc.level + 1)
        const memberCount = await UserModel.countDocuments(
          nextLevel
            ? {
                activityScore: { $gte: levelDoc.requiredScore, $lt: nextLevel.requiredScore },
              }
            : {
                activityScore: { $gte: levelDoc.requiredScore },
              }
        )
        await LevelModel.findByIdAndUpdate(levelDoc._id, { memberCount })
      })
    )

    const updatedLevels = await LevelModel.find().sort({ level: 1 })
    res.json({ message: '레벨 설정이 업데이트되었습니다', levels: updatedLevels })
  } catch {
    res.status(500).json({ message: '레벨 설정 업데이트 실패' })
  }
}
