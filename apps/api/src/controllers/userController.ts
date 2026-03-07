import { Response } from 'express'
import { UserModel as User, FavoriteModel as Favorite, PlayerActivityModel as PlayerActivity, ReviewModel as Review } from '@gameup/db'
import { hashPassword, comparePassword, generateToken } from '../services/authService'
import { AuthRequest } from '../middleware/auth'

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, username, role } = req.body

    if (!email || !password || !username) {
      return res.status(400).json({ 
        message: '이메일, 비밀번호, 사용자명은 필수입니다' 
      })
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: '비밀번호는 최소 6자 이상이어야 합니다' 
      })
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    })

    if (existingUser) {
      return res.status(400).json({ 
        message: '이미 존재하는 이메일 또는 사용자명입니다' 
      })
    }

    const hashedPassword = await hashPassword(password)

    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      role: role || 'player'
    })

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role as 'developer' | 'player' | 'admin'
    })

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      token
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ 
        message: '이메일과 비밀번호는 필수입니다' 
      })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ 
        message: '이메일 또는 비밀번호가 올바르지 않습니다' 
      })
    }

    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: '이메일 또는 비밀번호가 올바르지 않습니다' 
      })
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role as 'developer' | 'player' | 'admin'
    })

    res.json({
      success: true,
      message: '로그인 성공',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const user = await User.findById(req.user.id).select('-password')

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        bio: user.bio || '',
        favoriteGenres: user.favoriteGenres || [],
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { username, bio, favoriteGenres } = req.body

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ message: '사용자명은 2자 이상이어야 합니다' })
    }
    if (username.trim().length > 20) {
      return res.status(400).json({ message: '사용자명은 20자 이하여야 합니다' })
    }

    const duplicate = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.user.id }
    })
    if (duplicate) {
      return res.status(400).json({ message: '이미 사용 중인 사용자명입니다' })
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { username: username.trim(), bio: bio?.trim() || '', favoriteGenres: favoriteGenres || [] },
      { new: true }
    ).select('-password')

    if (!updated) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    res.json({
      success: true,
      message: '프로필이 수정되었습니다',
      user: {
        id: updated._id,
        email: updated.email,
        username: updated.username,
        role: updated.role,
        bio: (updated as any).bio,
        favoriteGenres: (updated as any).favoriteGenres,
        createdAt: updated.createdAt,
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: '새 비밀번호는 8자 이상이어야 합니다' })
    }

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    const isValid = await comparePassword(currentPassword, user.password)
    if (!isValid) {
      return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다' })
    }

    user.password = await hashPassword(newPassword)
    await user.save()

    res.json({ success: true, message: '비밀번호가 변경되었습니다' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { password } = req.body
    if (!password) return res.status(400).json({ message: '비밀번호를 입력해주세요' })

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    const isValid = await comparePassword(password, user.password)
    if (!isValid) return res.status(401).json({ message: '비밀번호가 올바르지 않습니다' })

    await Promise.all([
      Favorite.deleteMany({ userId: req.user.id }),
      PlayerActivity.deleteMany({ userId: req.user.id }),
      Review.deleteMany({ userId: req.user.id }),
      User.findByIdAndDelete(req.user.id)
    ])

    res.json({ success: true, message: '계정이 삭제되었습니다' })
  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}
