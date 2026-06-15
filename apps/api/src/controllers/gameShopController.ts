import { Response } from 'express'
import { GameShopItemModel, GameModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'
import fs from 'fs'
import path from 'path'

const verifyGameOwner = async (gameId: string, userId: string, role?: string) => {
  const game = await GameModel.findById(gameId)
  if (!game) return null
  if (role !== 'admin' && game.developerId.toString() !== userId) return null
  return game
}

export const getPublicGameShopItems = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const items = await GameShopItemModel.find({ gameId, active: true, saleStatus: 'on_sale' }).sort({ sortOrder: 1, createdAt: 1 })
    res.json({ success: true, items })
  } catch (error) {
    console.error('Get public shop items error:', error)
    res.status(500).json({ message: '아이템 조회에 실패했습니다' })
  }
}

export const getGameShopItems = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { sort = 'default', period } = req.query

    const filter: Record<string, unknown> = { gameId }

    if (period && period !== 'all') {
      const now = new Date()
      let from: Date
      if (period === 'last_month') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        filter.createdAt = { $gte: from, $lt: new Date(now.getFullYear(), now.getMonth(), 1) }
      } else {
        if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1)
        else from = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        filter.createdAt = { $gte: from }
      }
    }

    const sortOption: Record<string, 1 | -1> =
      sort === 'price_high' ? { price: -1 }
      : sort === 'price_low' ? { price: 1 }
      : sort === 'sales_high' ? { sales: -1 }
      : sort === 'sales_low' ? { sales: 1 }
      : { sortOrder: 1, createdAt: 1 }

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
    const { name, price, currency, type, currencyType, currencyAmount, bonusAmount, stock, description, itemId } = req.body

    if (!name?.trim()) return res.status(400).json({ message: '아이템명을 입력해주세요' })
    if (price === undefined || price === '') return res.status(400).json({ message: '가격을 입력해주세요' })

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const count = await GameShopItemModel.countDocuments({ gameId })

    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    const imageUrl = files?.shopItemImage?.[0] ? `/uploads/shop-items/${files.shopItemImage[0].filename}` : ''
    const specialImageUrl = files?.specialItemImage?.[0] ? `/uploads/shop-items/${files.specialItemImage[0].filename}` : ''

    const item = await GameShopItemModel.create({
      gameId,
      developerId: req.user.id,
      name: name.trim(),
      description: description?.trim() || '',
      imageUrl,
      price: Math.max(0, Number(price)),
      currency: currency || 'KRW',
      type: type || '패키지',
      currencyType: currencyType?.trim() || '',
      currencyAmount: Math.max(0, Number(currencyAmount) || 0),
      bonusAmount: Math.max(0, Number(bonusAmount) || 0),
      stock: stock || '무제한',
      itemId: itemId?.trim() || '',
      isSpecial: req.body.isSpecial === 'true',
      specialImageUrl,
      sortOrder: count,
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

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const item = await GameShopItemModel.findOne({ _id: itemId, gameId })
    if (!item) return res.status(404).json({ message: '아이템을 찾을 수 없습니다' })

    const { name, price, currency, type, currencyType, currencyAmount, bonusAmount, stock, description, active, sortOrder } = req.body

    if (name !== undefined) item.name = name.trim()
    if (description !== undefined) item.description = description.trim()
    if (price !== undefined) item.price = Math.max(0, Number(price))
    if (currency !== undefined) item.currency = currency
    if (type !== undefined) item.type = type
    if (currencyType !== undefined) item.currencyType = currencyType.trim()
    if (currencyAmount !== undefined) item.currencyAmount = Math.max(0, Number(currencyAmount))
    if (bonusAmount !== undefined) item.bonusAmount = Math.max(0, Number(bonusAmount))
    if (stock !== undefined) item.stock = stock
    if (active !== undefined) item.active = active === true || active === 'true'
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder)
    if (req.body.isSpecial !== undefined) item.isSpecial = req.body.isSpecial === 'true'

    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    if (files?.shopItemImage?.[0]) item.imageUrl = `/uploads/shop-items/${files.shopItemImage[0].filename}`
    if (files?.specialItemImage?.[0]) item.specialImageUrl = `/uploads/shop-items/${files.specialItemImage[0].filename}`

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

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
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

export const updateShopCurrencyIcon = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { gameId } = req.params
    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const file = req.file
    if (!file) return res.status(400).json({ message: '이미지 파일을 선택해주세요' })

    // 기존 아이콘 삭제
    if (game.shopCurrencyIconUrl) {
      const oldPath = path.join(process.cwd(), 'uploads', game.shopCurrencyIconUrl.replace('/uploads/', ''))
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    game.shopCurrencyIconUrl = `/uploads/shop-items/${file.filename}`
    await game.save()
    res.json({ success: true, shopCurrencyIconUrl: game.shopCurrencyIconUrl })
  } catch (error) {
    console.error('Update shop currency icon error:', error)
    res.status(500).json({ message: '아이콘 업로드에 실패했습니다' })
  }
}

export const updateShopCurrencyName = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { gameId } = req.params
    const { shopCurrencyName, shopCurrencyNames } = req.body
    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })
    if (shopCurrencyName !== undefined) game.shopCurrencyName = shopCurrencyName?.trim() || ''
    if (shopCurrencyNames && typeof shopCurrencyNames === 'object') {
      game.shopCurrencyNames = shopCurrencyNames
    }
    await game.save()
    res.json({ success: true, shopCurrencyName: game.shopCurrencyName, shopCurrencyNames: Object.fromEntries((game.shopCurrencyNames as unknown as Map<string, string>) ?? new Map()) })
  } catch (error) {
    console.error('Update shop currency name error:', error)
    res.status(500).json({ message: '재화 이름 저장에 실패했습니다' })
  }
}

export const reorderGameShopItems = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId } = req.params
    const { items } = req.body // [{ _id, sortOrder }]

    if (!Array.isArray(items)) return res.status(400).json({ message: 'items 배열이 필요합니다' })

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    await Promise.all(
      items.map((i: { _id: string; sortOrder: number }) =>
        GameShopItemModel.findOneAndUpdate({ _id: i._id, gameId }, { sortOrder: i.sortOrder })
      )
    )

    res.json({ success: true, message: '순서가 변경되었습니다' })
  } catch (error) {
    console.error('Reorder shop items error:', error)
    res.status(500).json({ message: '순서 변경에 실패했습니다' })
  }
}

export const submitShopReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId } = req.params

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const result = await GameShopItemModel.updateMany(
      { gameId, saleStatus: { $in: ['registering', 'rejected'] } },
      { saleStatus: 'reviewing' }
    )

    res.json({ success: true, updated: result.modifiedCount })
  } catch (error) {
    console.error('Submit shop review error:', error)
    res.status(500).json({ message: '심사 요청에 실패했습니다' })
  }
}
