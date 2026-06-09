import { PostModel as Post, CommentModel as Comment } from '@gameup/db'

const RETENTION_DAYS = 30

async function runCleanup() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  try {
    const posts = await Post.deleteMany({
      status: 'deleted',
      deletedByReport: true,
      deletedAt: { $lte: cutoff },
    })
    const comments = await Comment.deleteMany({
      status: 'deleted',
      deletedAt: { $lte: cutoff },
    })
    if (posts.deletedCount || comments.deletedCount) {
      console.log(`[cleanup] 영구삭제 — 게시글 ${posts.deletedCount}건, 댓글 ${comments.deletedCount}건`)
    }
  } catch (e) {
    console.error('[cleanup] 영구삭제 실패:', e)
  }
}

export function startCleanupJob() {
  // 서버 시작 시 1회 실행 후 매 24시간마다 반복
  runCleanup()
  setInterval(runCleanup, 24 * 60 * 60 * 1000)
}
