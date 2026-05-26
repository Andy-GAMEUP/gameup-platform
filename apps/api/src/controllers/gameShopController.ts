import { Response } from 'express'
import { GameShopItemModel, GameModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

const verifyGameOwner = async (gameId: string, userId: string) => {
  const game = await GameModel.findById(gameId)
  if (!game) return null
  if (game.developerId.toString() !== userId) return null
  return game
}

export const getGameShopItems = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { sort = 'default', period } = req.query

    const filter: Record<string, unknown> = { gameId }

    if (period && period !== 'all') {
      const now = new Date()
      let from: Date
      if (period === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1)
      } else if (period === 'last_month') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        filter.createdAt = { $gte: from, $lt: new Date(now.getFullYear(), now.getMonth(), 1) }
      } else if (period === '3months') {
        from = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      } else {
        from = new Date(0)
      }
      if (period !== 'last_month') filter.createdAt = { $gte: from }
    }

    const sortOption: Record<string, 1 | -1> =
      sort === 'price_high' ? { price: -1 }
      : sort === 'price_low' ? { price: 1 }
      : sort === 'sales_high' ? { sales: -1 }
      : sort === 'sales_low' ? { sales: 1 }
      : { createdAt: 1 }

    const items = await GameShopItemModel.find(filter).sort(sortOption)
    res.json({ success: true, items })
  } catch (error) {
    console.error('Get shop items error:', error)
    res.status(500).json({ message: '아이템 조회에 실패했습니다' })
  }
}

export const createGameShopItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId } = req.params
    const { name, price, currency, type, stock, description } = req.body

    if (!name?.trim()) return res.status(400).json({ message: '아이템명을 입력해주세요' })
    if (price === undefined || price === '') return res.status(400).json({ message: '가격을 입력해주세요' })

    const game = await verifyGameOwner(gameId, req.user.id)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const item = await GameShopItemModel.create({
      gameId,
      developerId: req.user.id,
      name: name.trim(),
      price: Math.max(0, Number(price)),
      currency: currency || 'KRW',
      type: type || '패키지',
      stock: stock || '무제한',
      description: description?.trim() || '',
    })

    res.status(201).json({ success: true, item })
  } catch (error) {
    console.error('Create shop item error:', error)
    res.status(500).json({ message: '아이템 등록에 실패했습니다' })
  }
}

export const updateGameShopItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId, itemId } = req.params

    const game = await verifyGameOwner(gameId, req.user.id)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const item = await GameShopItemModel.findOne({ _id: itemId, gameId })
    if (!item) return res.status(404).json({ message: '아이템을 찾을 수 없습니다' })

    const { name, price, currency, type, stock, description, active } = req.body
    if (name !== undefined) item.name = name.trim()
    if (price !== undefined) item.price = Math.max(0, Number(price))
    if (currency !== undefined) item.currency = currency
    if (type !== undefined) item.type = type
    if (stock !== undefined) item.stock = stock
    if (description !== undefined) item.description = description.trim()
    if (active !== undefined) item.active = active === true || active === 'true'

    await item.save()
    res.json({ success: true, item })
  } catch (error) {
    console.error('Update shop item error:', error)
    res.status(500).json({ message: '아이템 수정에 실패했습니다' })
  }
}

export const deleteGameShopItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId, itemId } = req.params

    const game = await verifyGameOwner(gameId, req.user.id)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const item = await GameShopItemModel.findOne({ _id: itemId, gameId })
    if (!item) return res.status(404).json({ message: '아이템을 찾을 수 없습니다' })

    await item.deleteOne()
    res.json({ success: true, message: '삭제되었습니다' })
  } catch (error) {
    console.error('Delete shop item error:', error)
    res.status(500).json({ message: '아이템 삭제에 실패했습니다' })
  }
}
