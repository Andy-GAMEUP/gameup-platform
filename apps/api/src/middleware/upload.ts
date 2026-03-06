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

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    if (file.fieldname === 'gameFile') {
      cb(null, path.join(UPLOAD_BASE, 'games'))
    } else if (file.fieldname === 'thumbnail') {
      cb(null, path.join(UPLOAD_BASE, 'thumbnails'))
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
  } else if (file.fieldname === 'thumbnail') {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const ext = path.extname(file.originalname).toLowerCase()
    // 🔒 MIME 타입도 함께 검증
    if (allowedTypes.includes(ext) && allowedMime.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('썸네일은 이미지 파일(JPG, PNG, GIF, WEBP)만 가능합니다'))
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
    files: 2
  }
})

export const uploadFields = upload.fields([
  { name: 'gameFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
])