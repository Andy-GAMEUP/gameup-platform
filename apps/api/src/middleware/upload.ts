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
    } else if (file.fieldname === 'screenshot') {
      cb(null, path.join(UPLOAD_BASE, 'screenshots'))
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
  } else if (file.fieldname === 'thumbnail' || file.fieldname === 'bannerImage' || file.fieldname === 'communityImages' || file.fieldname === 'screenshot') {
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

// 스크린샷 업로드 (1장, 5MB)
export const screenshotUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
}).single('screenshot')

// 커뮤니티 게시글 이미지 업로드 (최대 5장, 5MB/장)
export const communityUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5
  }
}).array('communityImages', 5)