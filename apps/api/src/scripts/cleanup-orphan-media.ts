/**
 * 디스크에 남아있는 고아 미디어 파일 정리 스크립트
 * DB에 없는 screenshots/, videos/ 파일을 삭제합니다.
 *
 * 실행: npx ts-node src/scripts/cleanup-orphan-media.ts
 */
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

const UPLOAD_BASE = path.join(process.cwd(), 'uploads')
const TARGETS = ['screenshots', 'videos']

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) { console.error('MONGODB_URI 환경변수가 없습니다'); process.exit(1) }

  await mongoose.connect(uri)
  console.log('DB 연결 완료')

  const { GameMediaModel } = await import('@gameup/db')

  const allMedia = await GameMediaModel.find({ url: /^\/uploads\// }, 'url').lean()
  const dbFiles = new Set(allMedia.map(m => path.basename(m.url)))

  let deleted = 0
  let skipped = 0

  for (const folder of TARGETS) {
    const dir = path.join(UPLOAD_BASE, folder)
    if (!fs.existsSync(dir)) continue

    const files = fs.readdirSync(dir)
    for (const file of files) {
      if (dbFiles.has(file)) {
        skipped++
        continue
      }
      const filePath = path.join(dir, file)
      fs.unlinkSync(filePath)
      console.log(`삭제: ${folder}/${file}`)
      deleted++
    }
  }

  console.log(`\n완료 — 삭제: ${deleted}개, 유지: ${skipped}개`)
  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
