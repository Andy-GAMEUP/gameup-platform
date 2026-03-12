import { Request, Response } from 'express'
import { UserModel as User } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

export const oauthCallback = async (req: Request, res: Response) => {
  try {
    const { provider, providerId, email, name, image } = req.body

    if (!provider || !providerId) {
      return res.status(400).json({ message: 'provider와 providerId는 필수입니다' })
    }

    let user = await User.findOne({
      'oauthProviders.provider': provider,
      'oauthProviders.providerId': providerId,
    })

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() })
      if (user) {
        user.oauthProviders = user.oauthProviders || []
        user.oauthProviders.push({ provider, providerId, connectedAt: new Date() })
        await user.save()
      }
    }

    if (!user) {
      const baseUsername = name
        ? name.replace(/\s+/g, '').toLowerCase()
        : provider + '_' + providerId.slice(0, 8)
      let username = baseUsername
      let counter = 1
      while (await User.findOne({ username })) {
        username = baseUsername + counter
        counter++
      }

      user = await User.create({
        email: email || `${provider}_${providerId}@oauth.gameup`,
        username,
        role: 'player',
        profileImage: image || undefined,
        oauthProviders: [{ provider, providerId, connectedAt: new Date() }],
      })
    }

    return res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        memberType: user.memberType || 'individual',
        companyInfo: user.companyInfo,
      },
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    return res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const linkOAuth = async (req: AuthRequest, res: Response) => {
  try {
    const { provider, providerId } = req.body

    if (!provider || !providerId) {
      return res.status(400).json({ message: 'provider와 providerId는 필수입니다' })
    }

    const existing = await User.findOne({
      'oauthProviders.provider': provider,
      'oauthProviders.providerId': providerId,
    })

    if (existing && existing._id.toString() !== req.user!.id) {
      return res.status(409).json({ message: '이미 다른 계정에 연결된 OAuth 계정입니다' })
    }

    const user = await User.findById(req.user!.id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    const alreadyLinked = user.oauthProviders?.some(
      (p: { provider: string; providerId: string }) => p.provider === provider && p.providerId === providerId
    )
    if (!alreadyLinked) {
      user.oauthProviders = user.oauthProviders || []
      user.oauthProviders.push({ provider, providerId, connectedAt: new Date() })
      await user.save()
    }

    return res.json({ message: 'OAuth 연동이 완료되었습니다' })
  } catch (error) {
    return res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const unlinkOAuth = async (req: AuthRequest, res: Response) => {
  try {
    const { provider } = req.params

    const user = await User.findById(req.user!.id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    if (!user.password && (user.oauthProviders?.length ?? 0) <= 1) {
      return res.status(400).json({ message: '마지막 로그인 수단은 제거할 수 없습니다' })
    }

    user.oauthProviders = (user.oauthProviders || []).filter((p: { provider: string }) => p.provider !== provider)
    await user.save()

    return res.json({ message: 'OAuth 연동이 해제되었습니다' })
  } catch (error) {
    return res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}
