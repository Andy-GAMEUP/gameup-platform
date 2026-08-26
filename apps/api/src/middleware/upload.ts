import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { Request } from 'express'

// 🔒 업로드 폴더 자동 생성 (폴더 없어도 크래시 방지)
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`📁 업로드 폴더 생성: ${dir}`)
  }
}

const UPLOAD_BASE = path.join(process.cwd(), 'uploads')
ensureDir(path.join(UPLOAD_BASE, 'games'))
ensureDir(path.join(UPLOAD_BASE, 'thumbnails'))
ensureDir(path.join(UPLOAD_BASE, 'banners'))
ensureDir(path.join(UPLOAD_BASE, 'community'))
ensureDir(path.join(UPLOAD_BASE, 'screenshots'))
ensureDir(path.join(UPLOAD_BASE, 'certs'))
ensureDir(path.join(UPLOAD_BASE, 'shop-items'))
ensureDir(path.join(UPLOAD_BASE, 'videos'))
ensureDir(path.join(UPLOAD_BASE, 'partner'))
ensureDir(path.join(UPLOAD_BASE, 'avatars'))
ensureDir(path.join(UPLOAD_BASE, 'game-announcements'))
ensureDir(path.join(UPLOAD_BASE, 'game-content'))

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    if (file.fieldname === 'gameFile') {
      cb(null, path.join(UPLOAD_BASE, 'games'))
    } else if (file.fieldname === 'thumbnail') {
      cb(null, path.join(UPLOAD_BASE, 'thumbnails'))
    } else if (file.fieldname === 'bannerImage') {
      cb(null, path.join(UPLOAD_BASE, 'banners'))
    } else if (file.fieldname === 'certFile') {
      cb(null, path.join(UPLOAD_BASE, 'certs'))
    } else if (file.fieldname === 'communityImages') {
      cb(null, path.join(UPLOAD_BASE, 'community'))
    } else if (file.fieldname === 'partnerImages') {
      cb(null, path.join(UPLOAD_BASE, 'partner'))
    } else if (file.fieldname === 'screenshot') {
      cb(null, path.join(UPLOAD_BASE, 'screenshots'))
    } else if (file.fieldname === 'videoFile') {
      cb(null, path.join(UPLOAD_BASE, 'videos'))
    } else if (file.fieldname === 'avatar') {
      cb(null, path.join(UPLOAD_BASE, 'avatars'))
    } else if (file.fieldname === 'announcementImages') {
      cb(null, path.join(UPLOAD_BASE, 'game-announcements'))
    } else if (file.fieldname === 'gameContentImages') {
      cb(null, path.join(UPLOAD_BASE, 'game-content'))
    } else if (file.fieldname === 'shopItemImage' || file.fieldname === 'shopCurrencyIcon' || file.fieldname === 'specialItemImage' || file.fieldname === 'currencyIcon' || file.fieldname === 'capcoinIcon') {
      cb(null, path.join(UPLOAD_BASE, 'shop-items'))
    } else {
      cb(null, UPLOAD_BASE)
    }
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // 🔒 원본 파일명 sanitize (경로 순회 공격 방지)
    const originalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(originalName).toLowerCase())
  }
})

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === 'gameFile') {
    const allowedTypes = ['.html', '.zip']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('게임 파일은 HTML 또는 ZIP 형식만 가능합니다'))
    }
  } else if (['thumbnail','bannerImage','communityImages','partnerImages','announcementImages','gameContentImages','screenshot','shopItemImage','shopCurrencyIcon','avatar'].includes(file.fieldname)) {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const ext = path.extname(file.originalname).toLowerCase()
    // 🔒 MIME 타입도 함께 검증
    if (allowedTypes.includes(ext) && allowedMime.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('이미지 파일(JPG, PNG, GIF, WEBP)만 업로드 가능합니다'))
    }
  } else {
    cb(null, true)
  }
}

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3
  }
})

export const uploadFields = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 },
  { name: 'certFile', maxCount: 1 },
])

const shopImageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowedTypes.includes(ext) && allowedMime.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('이미지 파일(JPG, PNG, GIF, WEBP)만 업로드 가능합니다'))
  }
}

export const shopItemUpload = multer({
  storage,
  fileFilter: shopImageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 }
}).fields([{ name: 'shopItemImage', maxCount: 1 }, { name: 'specialItemImage', maxCount: 1 }, { name: 'currencyIcon', maxCount: 1 }, { name: 'capcoinIcon', maxCount: 1 }])

const pngOnlyFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ext === '.png' && file.mimetype === 'image/png') {
    cb(null, true)
  } else {
    cb(new Error('PNG 파일만 업로드 가능합니다'))
  }
}

export const shopCurrencyIconUpload = multer({
  storage,
  fileFilter: pngOnlyFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }
}).single('shopCurrencyIcon')

export const additionalCurrencyIconUpload = multer({
  storage,
  fileFilter: pngOnlyFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }
}).single('currencyIcon')

// 스크린샷 업로드 (1장, 5MB)
export const screenshotUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
}).single('screenshot')

// 게임 미디어 업로드 (스크린샷 또는 동영상)
const videoFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === 'screenshot') {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext) && allowedMime.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('이미지 파일(JPG, PNG, GIF, WEBP)만 업로드 가능합니다'))
    }
  } else if (file.fieldname === 'videoFile') {
    const allowedTypes = ['.mp4', '.mov', '.webm', '.avi']
    const allowedMime = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/avi']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext) && allowedMime.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('동영상 파일(MP4, MOV, WEBM)만 업로드 가능합니다'))
    }
  } else {
    cb(null, true)
  }
}

export const mediaUpload = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024, files: 1 }
}).fields([
  { name: 'screenshot', maxCount: 1 },
  { name: 'videoFile', maxCount: 1 },
])

// 커뮤니티 게시글 이미지 업로드 (최대 5장, 5MB/장)
export const communityUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5
  }
}).array('communityImages', 5)

// 파트너 채널(소개/활동 계획 등) 이미지 업로드 (최대 5장, 5MB/장)
export const partnerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5
  }
}).array('partnerImages', 5)

// 프로필 아바타 업로드 (1장, 2MB)
export const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }
}).single('avatar')

// 게임 공지사항 본문 이미지 업로드 (최대 5장, 5MB/장)
export const gameAnnouncementUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5
  }
}).array('announcementImages', 5)

// 게임 설명 본문 이미지 업로드 (최대 5장, 5MB/장)
export const gameContentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5
  }
}).array('gameContentImages', 5)