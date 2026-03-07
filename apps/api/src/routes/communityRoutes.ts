import { Router } from 'express'
import {
  getPosts, getPost, createPost, updatePost, deletePost,
  toggleLike, toggleBookmark, reportPost, getMyBookmarks,
  getComments, createComment, updateComment, deleteComment,
  toggleCommentLike, reportComment,
  getReportedPosts, adminUpdatePostStatus, getCommunityStats,
  tempSave, getMyDrafts
} from '../controllers/communityController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()

// 공개 라우트
router.get('/stats', getCommunityStats)
router.get('/posts', getPosts)
router.get('/posts/:id', getPost)
router.get('/posts/:postId/comments', getComments)

router.use(authenticateToken)
router.post('/posts/temp-save', tempSave)
router.get('/my/drafts', getMyDrafts)
router.post('/posts', createPost)
// PUT and PATCH both call updatePost (partial update semantics; full replacement not supported)
router.put('/posts/:id', updatePost)
router.patch('/posts/:id', updatePost)
router.delete('/posts/:id', deletePost)
router.post('/posts/:id/like', toggleLike)
router.post('/posts/:id/bookmark', toggleBookmark)
router.post('/posts/:id/report', reportPost)
router.get('/my/bookmarks', getMyBookmarks)

router.post('/posts/:postId/comments', createComment)
// PUT and PATCH both call updateComment (partial update semantics)
router.put('/comments/:id', updateComment)
router.patch('/comments/:id', updateComment)
router.delete('/comments/:id', deleteComment)
router.post('/comments/:id/like', toggleCommentLike)
router.post('/comments/:id/report', reportComment)

// 관리자 전용
router.get('/admin/reported', requireAdmin, getReportedPosts)
router.patch('/admin/posts/:id/status', requireAdmin, adminUpdatePostStatus)

export default router
