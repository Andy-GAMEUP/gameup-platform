import { Response } from 'express'
import fs from 'fs'
import path from 'path'
import { UserModel as User, ScrapModel as Scrap, PlayerActivityModel as PlayerActivity, ReviewModel as Review, UserDeletionLogModel } from '@gameup/db'
import { hashPassword, comparePassword, generateToken } from '../services/authService'
import { verifyTurnstileToken } from '../services/turnstileService'
import { checkBusinessNumber } from '../services/businessNumberService'
import { AuthRequest } from '../middleware/auth'

const BUSINESS_NUMBER_REGEX = /^\d{3}-\d{2}-\d{5}$/

// 비밀번호 정책: 8자 이상 + 영문/숫자/특수문자 모두 포함
const isValidPassword = (password: string) =>
  password.length >= 8 &&
  /[a-zA-Z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^a-zA-Z0-9]/.test(password)

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, username, role, memberType, companyInfo, contactPerson, turnstileToken } = req.body

    if (!email || !password || !username) {
      return res.status(400).json({
        message: '이메일, 비밀번호, 사용자명은 필수입니다'
      })
    }

    const isHuman = await verifyTurnstileToken(turnstileToken, req.ip)
    if (!isHuman) {
      return res.status(400).json({ message: '캡차 인증에 실패했습니다. 다시 시도해주세요.' })
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: '비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다'
      })
    }

    // 기업회원 필수 필드 검증
    if (memberType === 'corporate') {
      if (!companyInfo?.companyName) {
        return res.status(400).json({ message: '회사명은 필수입니다' })
      }
      if (!companyInfo?.companyCategory) {
        return res.status(400).json({ message: '기업 유형(개발사/파트너)을 선택해주세요' })
      }
      if (!companyInfo?.companyType || companyInfo.companyType.length === 0) {
        return res.status(400).json({ message: '기업 형태를 선택해주세요' })
      }
      if (!contactPerson?.phone) {
        return res.status(400).json({ message: '담당자 연락처는 필수입니다' })
      }
      if (!companyInfo?.businessNumber || !BUSINESS_NUMBER_REGEX.test(companyInfo.businessNumber)) {
        return res.status(400).json({ message: '사업자 등록번호를 올바른 형식(123-45-67890)으로 입력해주세요' })
      }
      const bizCheck = await checkBusinessNumber(companyInfo.businessNumber)
      if (!bizCheck.valid) {
        const reasonMsg = bizCheck.reason === 'closed' ? ' (폐업 상태)'
          : bizCheck.reason === 'suspended' ? ' (휴업 상태)'
          : ''
        return res.status(400).json({ message: `사업자 등록번호를 확인할 수 없습니다${reasonMsg}. 다시 확인해주세요.` })
      }
      if (companyInfo?.homepageUrl) {
        try {
          new URL(companyInfo.homepageUrl)
        } catch {
          return res.status(400).json({ message: '회사 웹사이트를 올바른 URL 형식으로 입력해주세요 (예: https://company.com)' })
        }
      }
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        message: '이미 존재하는 이메일 또는 사용자명입니다'
      })
    }

    // 기업당 하나의 계정만 허용
    if (memberType === 'corporate') {
      const existingCompany = await User.findOne({
        'companyInfo.companyName': companyInfo.companyName,
        memberType: 'corporate',
        approvalStatus: { $in: ['pending', 'approved'] },
      })
      if (existingCompany) {
        return res.status(400).json({ message: '이미 등록된 회사명입니다. 회사당 하나의 계정만 가입할 수 있습니다.' })
      }
    }

    const hashedPassword = await hashPassword(password)

    const userData: any = {
      email,
      username,
      password: hashedPassword,
      role: role || 'player',
      memberType: memberType || 'individual',
      approvalStatus: memberType === 'corporate' ? 'pending' : 'approved',
    }

    // 기업회원 정보 설정
    if (memberType === 'corporate') {
      userData.companyInfo = {
        companyName: companyInfo.companyName,
        companyCategory: companyInfo.companyCategory,
        companyType: companyInfo.companyType,
        businessNumber: companyInfo.businessNumber,
        businessType: companyInfo.businessType === 'individual' ? 'individual' : 'corporation',
        homepageUrl: companyInfo.homepageUrl || undefined,
        isApproved: false,
        approvalStatus: 'pending',
      }
      userData.contactPerson = {
        name: contactPerson.name,
        phone: contactPerson.phone,
        email: contactPerson.email || undefined,
      }
    }

    const user = await User.create(userData)

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role as 'developer' | 'player' | 'admin'
    })

    res.status(201).json({
      success: true,
      message: memberType === 'corporate'
        ? '기업회원 가입 신청이 완료되었습니다. 관리자 승인 후 기업 기능을 이용하실 수 있습니다.'
        : '회원가입이 완료되었습니다',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        memberType: user.memberType,
        companyInfo: user.companyInfo,
      },
      token
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 가입 화면에서 사업자 등록번호 입력 중 실시간 확인용 (공개 API)
export const verifyBusinessNumber = async (req: AuthRequest, res: Response) => {
  try {
    const { businessNumber } = req.body
    if (!businessNumber || !BUSINESS_NUMBER_REGEX.test(businessNumber)) {
      return res.status(400).json({ valid: false, message: '올바른 형식(123-45-67890)이 아닙니다' })
    }
    const result = await checkBusinessNumber(businessNumber)
    if (result.valid) return res.json(result)

    const reasonMsg = result.reason === 'closed' ? '폐업 상태인 사업자번호입니다'
      : result.reason === 'suspended' ? '휴업 상태인 사업자번호입니다'
      : '확인되지 않는 사업자번호입니다'
    res.json({ ...result, message: reasonMsg })
  } catch {
    res.status(500).json({ valid: false, message: '확인 중 오류가 발생했습니다' })
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

    const isPasswordValid = await comparePassword(password, user.password!)

    if (!isPasswordValid) {
      return res.status(401).json({
        message: '이메일 또는 비밀번호가 올바르지 않습니다'
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: '계정이 중지된 상태입니다. 관리자에게 문의하세요.'
      })
    }

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role as 'developer' | 'player' | 'admin',
      adminLevel: user.adminLevel || null,
    })

    res.json({
      success: true,
      message: '로그인 성공',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        adminLevel: user.adminLevel || null,
        memberType: user.memberType || 'individual',
        approvalStatus: user.approvalStatus || 'pending',
        companyInfo: user.companyInfo,
        contactPerson: user.contactPerson,
        level: user.level || 1,
        activityScore: user.activityScore || 0,
        profileImage: user.profileImage || null,
        bookmarkedTabs: user.bookmarkedTabs || [],
        bio: user.bio || '',
        favoriteGenres: user.favoriteGenres || [],
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
        memberType: user.memberType || 'individual',
        bio: user.bio || '',
        favoriteGenres: user.favoriteGenres || [],
        isActive: user.isActive,
        companyInfo: user.companyInfo,
        contactPerson: user.contactPerson,
        level: user.level || 1,
        activityScore: user.activityScore || 0,
        points: user.points || 0,
        profileImage: user.profileImage || null,
        bookmarkedTabs: user.bookmarkedTabs || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const toggleBookmarkedTab = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { key, label, channel, gameId } = req.body
    if (!key || !label) return res.status(400).json({ message: 'key와 label은 필수입니다' })

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    const existingIndex = (user.bookmarkedTabs || []).findIndex(t => t.key === key)
    let bookmarked: boolean
    if (existingIndex >= 0) {
      user.bookmarkedTabs!.splice(existingIndex, 1)
      bookmarked = false
    } else {
      user.bookmarkedTabs = [...(user.bookmarkedTabs || []), { key, label, channel, gameId }]
      bookmarked = true
    }
    await user.save()

    res.json({ success: true, bookmarked, bookmarkedTabs: user.bookmarkedTabs })
  } catch (error) {
    console.error('Toggle bookmarked tab error:', error)
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

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const file = req.file as Express.Multer.File | undefined
    if (!file) return res.status(400).json({ message: '이미지 파일을 첨부해주세요' })

    const user = await User.findById(req.user.id).select('profileImage')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    if (user.profileImage?.startsWith('/uploads/')) {
      const oldPath = path.join(process.cwd(), user.profileImage.slice(1))
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    const newProfileImage = `/uploads/avatars/${file.filename}`
    await User.findByIdAndUpdate(req.user.id, { profileImage: newProfileImage })

    res.json({
      success: true,
      message: '프로필 이미지가 변경되었습니다',
      profileImage: newProfileImage,
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
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
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ message: '새 비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다' })
    }

    const user = await User.findById(req.user.id).select('password')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    const isValid = await comparePassword(currentPassword, user.password!)
    if (!isValid) {
      return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다' })
    }

    const hashedPassword = await hashPassword(newPassword)
    await User.findByIdAndUpdate(req.user.id, { password: hashedPassword })

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

    const isValid = await comparePassword(password, user.password!)
    if (!isValid) return res.status(401).json({ message: '비밀번호가 올바르지 않습니다' })

    await UserDeletionLogModel.create({
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      memberType: user.memberType,
      companyInfo: user.companyInfo,
      isActive: user.isActive,
      approvalStatus: user.approvalStatus,
      activityScore: (user as unknown as Record<string, unknown>).activityScore,
      deletedBy: user._id,
      deletedByUsername: user.username,
      userSnapshot: user.toObject(),
    })

    await Promise.all([
      Scrap.deleteMany({ userId: req.user!.id }),
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

export const reapplyCorporate = async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, companyCategory, companyType, contactPhone, businessNumber } = req.body

    if (!companyName) return res.status(400).json({ message: '회사명은 필수입니다' })
    if (!companyCategory) return res.status(400).json({ message: '기업 유형을 선택해주세요' })
    if (!companyType || companyType.length === 0) return res.status(400).json({ message: '기업 형태를 하나 이상 선택해주세요' })
    if (!contactPhone) return res.status(400).json({ message: '대표 연락처는 필수입니다' })
    if (!businessNumber || !BUSINESS_NUMBER_REGEX.test(businessNumber)) {
      return res.status(400).json({ message: '사업자 등록번호를 올바른 형식(123-45-67890)으로 입력해주세요' })
    }

    const user = await User.findById(req.user!.id).select('memberType companyInfo')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    if (user.memberType !== 'corporate') return res.status(400).json({ message: '기업회원만 재신청할 수 있습니다' })
    if ((user.companyInfo as any)?.approvalStatus === 'approved') {
      return res.status(400).json({ message: '이미 승인된 계정입니다' })
    }

    await User.findByIdAndUpdate(req.user!.id, {
      $set: {
        approvalStatus: 'pending',
        'companyInfo.companyName': companyName,
        'companyInfo.companyCategory': companyCategory,
        'companyInfo.companyType': companyType,
        'companyInfo.businessNumber': businessNumber,
        'companyInfo.approvalStatus': 'pending',
        'companyInfo.isApproved': false,
        'contactPerson.phone': contactPhone,
      },
    })

    res.json({ success: true, message: '재신청이 완료되었습니다' })
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const updateCompanyType = async (req: AuthRequest, res: Response) => {
  try {
    const { companyType } = req.body

    if (!Array.isArray(companyType)) {
      return res.status(400).json({ message: '기업 형태 값이 올바르지 않습니다' })
    }

    const user = await User.findById(req.user!.id).select('memberType companyInfo')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    if (user.memberType !== 'corporate') {
      return res.status(400).json({ message: '기업회원만 기업 형태를 수정할 수 있습니다' })
    }

    await User.findByIdAndUpdate(req.user!.id, {
      $set: { 'companyInfo.companyType': companyType },
    })

    res.json({ success: true, companyType })
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const updateCompanyInfo = async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, homepageUrl, contactPhone } = req.body

    const user = await User.findById(req.user!.id).select('memberType companyInfo contactPerson')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    if (user.memberType !== 'corporate') {
      return res.status(400).json({ message: '기업회원만 회사 정보를 수정할 수 있습니다' })
    }

    const $set: Record<string, unknown> = {}
    if (companyName !== undefined) $set['companyInfo.companyName'] = companyName
    if (homepageUrl !== undefined) $set['companyInfo.homepageUrl'] = homepageUrl
    if (contactPhone !== undefined) $set['contactPerson.phone'] = contactPhone

    const updated = await User.findByIdAndUpdate(req.user!.id, { $set }, { new: true }).select('companyInfo contactPerson')

    res.json({ success: true, companyInfo: updated!.companyInfo, contactPerson: updated!.contactPerson })
  } catch {
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const submitAppeal = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ message: '이의 신청 내용을 입력해주세요' })
    const user = await User.findById(req.user!.id).select('isActive')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    if (user.isActive) return res.status(400).json({ message: '차단 중인 계정이 아닙니다' })
    const now = new Date()
    await User.findByIdAndUpdate(req.user!.id, {
      $set: { appeal: { content: content.trim(), createdAt: now } },
      $push: { history: { type: 'appeal', content: `이의 신청 - ${content.trim()}`, createdAt: now } },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ message: '이의 신청 실패' })
  }
}
