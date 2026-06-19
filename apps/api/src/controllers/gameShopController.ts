import { Response } from 'express'
import { GameShopItemModel, GameModel, UserModel, PointHistoryModel } from '@gameup/db'
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
    const { name, price, currency, type, paymentType, currencyName, currencyType, currencyId, currencyAmount, bonusAmount, stock, description, itemId, names, currencyNames } = req.body

    if (!name?.trim()) return res.status(400).json({ message: '아이템명을 입력해주세요' })

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const count = await GameShopItemModel.countDocuments({ gameId })

    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    const imageUrl = files?.shopItemImage?.[0] ? `/uploads/shop-items/${files.shopItemImage[0].filename}` : ''
    const specialImageUrl = files?.specialItemImage?.[0] ? `/uploads/shop-items/${files.specialItemImage[0].filename}` : ''
    const currencyIconUrl = files?.currencyIcon?.[0] ? `/uploads/shop-items/${files.currencyIcon[0].filename}` : ''
    const capcoinIconUrl = files?.capcoinIcon?.[0] ? `/uploads/shop-items/${files.capcoinIcon[0].filename}` : ''

    const parsedNames = names ? (typeof names === 'string' ? JSON.parse(names) : names) : {}
    const parsedCurrencyNames = currencyNames ? (typeof currencyNames === 'string' ? JSON.parse(currencyNames) : currencyNames) : {}

    const item = await GameShopItemModel.create({
      gameId,
      developerId: req.user.id,
      name: name.trim(),
      description: description?.trim() || '',
      imageUrl,
      price: Math.max(0, Number(price) || 0),
      currency: currency || 'KRW',
      type: type || '패키지',
      paymentType: paymentType || 'cash',
      currencyName: currencyName?.trim() || '',
      currencyIconUrl,
      currencyType: currencyType?.trim() || '',
      currencyId: currencyId || 'main',
      currencyAmount: Math.max(0, Number(currencyAmount) || 0),
      bonusAmount: Math.max(0, Number(bonusAmount) || 0),
      stock: stock || '무제한',
      itemId: itemId?.trim() || '',
      names: parsedNames,
      currencyNames: parsedCurrencyNames,
      capcoinPrice: Math.max(0, Number(req.body.capcoinPrice) || 0),
      capcoinName: req.body.capcoinName?.trim() || '',
      capcoinIconUrl,
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

    const { name, price, currency, type, paymentType, currencyName, currencyType, currencyId, currencyAmount, bonusAmount, stock, description, active, sortOrder, itemId: newItemId } = req.body

    const isContentUpdate = name !== undefined || price !== undefined || currency !== undefined || type !== undefined || paymentType !== undefined || currencyName !== undefined || currencyType !== undefined || currencyId !== undefined || currencyAmount !== undefined || bonusAmount !== undefined || stock !== undefined || description !== undefined || req.body.names !== undefined || req.body.currencyNames !== undefined || req.body.isSpecial !== undefined
    const hasFileUpdate = !!(req.files && Object.keys(req.files as object).length > 0)
    if ((isContentUpdate || hasFileUpdate) && item.saleStatus === 'on_sale' && req.user.role !== 'admin') {
      return res.status(400).json({ message: '판매 중인 상품은 수정할 수 없습니다' })
    }

    if (name !== undefined) item.name = name.trim()
    if (description !== undefined) item.description = description.trim()
    if (price !== undefined) item.price = Math.max(0, Number(price))
    if (currency !== undefined) item.currency = currency
    if (type !== undefined) item.type = type
    if (paymentType !== undefined) item.paymentType = paymentType
    if (currencyName !== undefined) item.currencyName = currencyName.trim()
    if (currencyType !== undefined) item.currencyType = currencyType.trim()
    if (currencyId !== undefined) (item as any).currencyId = currencyId
    if (currencyAmount !== undefined) item.currencyAmount = Math.max(0, Number(currencyAmount))
    if (bonusAmount !== undefined) item.bonusAmount = Math.max(0, Number(bonusAmount))
    if (stock !== undefined) item.stock = stock
    if (active !== undefined) item.active = active === true || active === 'true'
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder)
    if (req.body.isSpecial !== undefined) item.isSpecial = req.body.isSpecial === 'true'
    if (newItemId !== undefined && !item.itemId) {
      const sanitized = String(newItemId).replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 32)
      if (sanitized) {
        item.itemId = sanitized
        item.markModified('itemId')
      }
    }
    if (req.body.names !== undefined) {
      const parsed = typeof req.body.names === 'string' ? JSON.parse(req.body.names) : req.body.names
      item.names = parsed
      item.markModified('names')
    }
    if (req.body.currencyNames !== undefined) {
      const parsed = typeof req.body.currencyNames === 'string' ? JSON.parse(req.body.currencyNames) : req.body.currencyNames
      item.currencyNames = parsed
      item.markModified('currencyNames')
    }

    if (req.body.capcoinPrice !== undefined) item.capcoinPrice = Math.max(0, Number(req.body.capcoinPrice) || 0)
    if (req.body.capcoinName !== undefined) item.capcoinName = req.body.capcoinName.trim()

    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    if (files?.shopItemImage?.[0]) item.imageUrl = `/uploads/shop-items/${files.shopItemImage[0].filename}`
    if (files?.specialItemImage?.[0]) item.specialImageUrl = `/uploads/shop-items/${files.specialItemImage[0].filename}`
    if (files?.currencyIcon?.[0]) item.currencyIconUrl = `/uploads/shop-items/${files.currencyIcon[0].filename}`
    if (files?.capcoinIcon?.[0]) item.capcoinIconUrl = `/uploads/shop-items/${files.capcoinIcon[0].filename}`

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
    const { shopCurrencyName, shopCurrencyNames, shopPaymentType } = req.body
    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })
    if (shopCurrencyName !== undefined) game.shopCurrencyName = shopCurrencyName?.trim() || ''
    if (shopCurrencyNames && typeof shopCurrencyNames === 'object') {
      game.shopCurrencyNames = shopCurrencyNames
    }
    if (shopPaymentType === 'cash' || shopPaymentType === 'capcoin') {
      (game as any).shopPaymentType = shopPaymentType
    }
    await game.save()
    res.json({ success: true, shopCurrencyName: game.shopCurrencyName, shopCurrencyNames: Object.fromEntries((game.shopCurrencyNames as unknown as Map<string, string>) ?? new Map()), shopPaymentType: (game as any).shopPaymentType ?? 'cash' })
  } catch (error) {
    console.error('Update shop currency name error:', error)
    res.status(500).json({ message: '재화 이름 저장에 실패했습니다' })
  }
}

/** POST /games/:gameId/currencies — 추가 재화 등록 */
export const addAdditionalCurrency = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { gameId } = req.params
    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const file = req.file
    if (!file) return res.status(400).json({ message: '아이콘 파일을 선택해주세요' })

    const { name, names, paymentType } = req.body
    const parsedNames = names ? (typeof names === 'string' ? JSON.parse(names) : names) : {}
    const iconUrl = `/uploads/shop-items/${file.filename}`;

    (game as any).additionalCurrencies = [...((game as any).additionalCurrencies ?? []), { name: name?.trim() || '', names: parsedNames, iconUrl, paymentType: paymentType || 'cash' }]
    await game.save()
    const added = (game as any).additionalCurrencies.at(-1)
    res.json({ success: true, currency: added, additionalCurrencies: (game as any).additionalCurrencies })
  } catch (error) {
    console.error('Add currency error:', error)
    res.status(500).json({ message: '재화 등록에 실패했습니다' })
  }
}

/** PATCH /games/:gameId/currencies/:currencyId — 추가 재화 수정 */
export const updateAdditionalCurrency = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { gameId, currencyId } = req.params
    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const currencies: any[] = (game as any).additionalCurrencies ?? []
    const target = currencies.find((c: any) => c._id.toString() === currencyId)
    if (!target) return res.status(404).json({ message: '재화를 찾을 수 없습니다' })

    const { name, names, paymentType } = req.body
    const parsedNames = names ? (typeof names === 'string' ? JSON.parse(names) : names) : target.names

    if (req.file) {
      if (target.iconUrl?.startsWith('/uploads/')) {
        const p = path.join(process.cwd(), target.iconUrl.slice(1))
        if (fs.existsSync(p)) fs.unlinkSync(p)
      }
      target.iconUrl = `/uploads/shop-items/${req.file.filename}`
    }

    if (name !== undefined) target.name = name.trim()
    target.names = parsedNames
    if (paymentType) target.paymentType = paymentType

    await game.save()
    res.json({ success: true, additionalCurrencies: (game as any).additionalCurrencies })
  } catch (error) {
    console.error('Update currency error:', error)
    res.status(500).json({ message: '재화 수정에 실패했습니다' })
  }
}

/** DELETE /games/:gameId/currencies/:currencyId — 추가 재화 삭제 */
export const deleteAdditionalCurrency = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { gameId, currencyId } = req.params
    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const currencies: any[] = (game as any).additionalCurrencies ?? []
    const target = currencies.find((c: any) => c._id.toString() === currencyId)
    if (!target) return res.status(404).json({ message: '재화를 찾을 수 없습니다' })

    if (target.iconUrl?.startsWith('/uploads/')) {
      const p = path.join(process.cwd(), target.iconUrl.slice(1))
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }

    (game as any).additionalCurrencies = currencies.filter((c: any) => c._id.toString() !== currencyId)
    await game.save()
    res.json({ success: true, additionalCurrencies: (game as any).additionalCurrencies })
  } catch (error) {
    console.error('Delete currency error:', error)
    res.status(500).json({ message: '재화 삭제에 실패했습니다' })
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

export const copyGameShopItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId, itemId } = req.params

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const original = await GameShopItemModel.findOne({ _id: itemId, gameId })
    if (!original) return res.status(404).json({ message: '상품을 찾을 수 없습니다' })

    const count = await GameShopItemModel.countDocuments({ gameId })

    const baseName = original.name.replace(/ \(복사(?:_\d+)?\)$/, '')
    const siblings = await GameShopItemModel.find({ gameId, name: new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(복사(?:_\\d+)?\\)$`) })
    const maxNum = siblings.reduce((max, s) => {
      const m = s.name.match(/\(복사_(\d+)\)$/)
      return m ? Math.max(max, parseInt(m[1])) : Math.max(max, 0)
    }, 0)
    const copyName = `${baseName} (복사_${maxNum + 1})`

    const copy = await GameShopItemModel.create({
      gameId: original.gameId,
      developerId: req.user.id,
      name: copyName,
      description: original.description,
      imageUrl: original.imageUrl,
      price: original.price,
      currency: original.currency,
      type: original.type,
      paymentType: original.paymentType,
      currencyName: original.currencyName,
      currencyIconUrl: original.currencyIconUrl,
      currencyType: original.currencyType,
      currencyAmount: original.currencyAmount,
      bonusAmount: original.bonusAmount,
      stock: original.stock,
      capcoinPrice: original.capcoinPrice,
      capcoinName: original.capcoinName,
      capcoinIconUrl: original.capcoinIconUrl,
      itemId: '',
      isSpecial: false,
      active: false,
      saleStatus: 'registering',
      sortOrder: count,
    })

    res.status(201).json({ success: true, item: copy })
  } catch (error) {
    console.error('Copy shop item error:', error)
    res.status(500).json({ message: '복사에 실패했습니다' })
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

export const purchaseWithCapcoin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId, itemId } = req.params
    const { gameUserId, qty = 1 } = req.body

    if (!gameUserId) return res.status(400).json({ message: 'gameUserId는 필수입니다' })

    const item = await GameShopItemModel.findOne({ _id: itemId, gameId, active: true, saleStatus: 'on_sale' })
    if (!item) return res.status(404).json({ message: '상품을 찾을 수 없습니다' })

    const totalCost = item.currencyAmount * Number(qty)

    const user = await UserModel.findById(req.user.id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    const currentPoints = user.points ?? 0
    if (currentPoints < totalCost) return res.status(400).json({ message: '잔액이 부족합니다' })

    const newBalance = currentPoints - totalCost

    await PointHistoryModel.create({
      userId: user._id,
      amount: -totalCost,
      balance: newBalance,
      reason: `${item.name}${Number(qty) > 1 ? ` × ${qty}` : ''} 구매 (게임ID: ${gameUserId})`,
      type: 'purchase',
    })

    user.points = newBalance
    await user.save()

    res.json({ success: true, newBalance })
  } catch (error) {
    console.error('캡코인 구매 오류:', error)
    res.status(500).json({ message: '서버 오류' })
  }
}
