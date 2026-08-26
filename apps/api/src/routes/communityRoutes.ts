import { Router } from 'express'
import {
  getPosts, getPost, createPost, updatePost, deletePost,
  toggleLike, reportPost,
  getComments, createComment, updateComment, deleteComment, restoreComment,
  toggleCommentLike, reportComment,
  getReportedPosts, adminUpdatePostStatus, getCommunityStats,
  uploadCommunityImages, toggleCommentDislike
} from '../controllers/communityController'
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth'
import { communityUpload } from '../middleware/upload'

const router = Router()

// 공개 라우트 (비공개 게시글 판별을 위해 로그인 여부만 선택적으로 확인)
router.get('/stats', getCommunityStats)
router.get('/posts', optionalAuth, getPosts)
router.get('/posts/:id', optionalAuth, getPost)
router.get('/posts/:postId/comments', getComments)

router.use(authenticateToken)
router.post('/upload-images', communityUpload, uploadCommunityImages)
router.post('/posts', createPost)
// PUT and PATCH both call updatePost (partial update semantics; full replacement not supported)
router.put('/posts/:id', updatePost)
router.patch('/posts/:id', updatePost)
router.delete('/posts/:id', deletePost)
router.post('/posts/:id/like', toggleLike)
router.post('/posts/:id/report', reportPost)

router.post('/posts/:postId/comments', createComment)
// PUT and PATCH both call updateComment (partial update semantics)
router.put('/comments/:id', updateComment)
router.patch('/comments/:id', updateComment)
router.delete('/comments/:id', deleteComment)
router.post('/comments/:id/restore', restoreComment)
router.post('/comments/:id/like', toggleCommentLike)
router.post('/comments/:id/dislike', toggleCommentDislike)
router.post('/comments/:id/report', reportComment)

// 관리자 전용
router.get('/admin/reported', requireAdmin, getReportedPosts)
router.patch('/admin/posts/:id/status', requireAdmin, adminUpdatePostStatus)

export default router
