import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { PostModel as Post, CommentModel as Comment, UserModel as User } from '@gameup/db'
// 🔒 중복 AuthRequest 제거 - middleware/auth.ts의 것을 사용
import { AuthRequest } from '../middleware/auth'
import { grantPoints, deductPoints } from '../services/pointService'

// 핫 스코어 계산: likes*3 + comments*2 + views*0.1 - 시간 감쇠
function calcHotScore(likes: number, comments: number, views: number, createdAt: Date): number {
  const ageHours = (Date.now() - createdAt.getTime()) / 3600000
  return (likes * 3 + comments * 2 + views * 0.1) / Math.pow(ageHours + 2, 1.5)
}

export const getPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 15, sort = 'latest', channel, gameId, search, tag } = req.query
    const limitNum = Math.min(Number(limit) || 15, 100)
    const filter: Record<string, unknown> = { status: 'active' }
    if (channel) {
      filter.channel = channel
    }
    if (gameId) filter.gameId = gameId
    if (tag) filter.tags = tag

    const andConditions: Record<string, unknown>[] = []
    if (search) {
      // 🔒 정규식 특수문자 이스케이프 (ReDoS 방지)
      const safe = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      andConditions.push({
        $or: [
          { title: { $regex: safe, $options: 'i' } },
          { content: { $regex: safe, $options: 'i' } }
        ]
      })
    }
    // 비공개 게시글은 본인/관리자에게만 노출
    if (req.user?.role !== 'admin') {
      if (req.user) {
        andConditions.push({ $or: [{ isPublished: { $ne: false } }, { author: req.user.id }] })
      } else {
        filter.isPublished = { $ne: false }
      }
    }
    if (andConditions.length) filter.$and = andConditions

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 }
    if (sort === 'views') sortObj = { views: -1, createdAt: -1 }
    else if (sort === 'trending') sortObj = { hotScore: -1, createdAt: -1 }
    else if (sort === 'most_liked') sortObj = { 'likes.length': -1, createdAt: -1 }

    const total = await Post.countDocuments(filter)
    const posts = await Post.find(filter)
      .populate('author', 'username role level profileImage')
      .populate('gameId', 'title serviceType')
      .sort(sortObj)
      .skip((Number(page) - 1) * limitNum)
      .limit(limitNum)
      .select('-reports')

    const postList = posts.map((p) => ({
      ...p.toObject(),
      likeCount: p.likes.length,
    }))

    res.json({ posts: postList, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '게시글 목록 조회 실패' })
  }
}

export const getPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await Post.findOne({ _id: id, status: 'active' }).select('author isPublished')
    if (!existing) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })

    const isOwner = !!req.user && (req.user.id === existing.author.toString() || req.user.role === 'admin')
    if (existing.isPublished === false && !isOwner) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    }

    const post = await Post.findOneAndUpdate(
      { _id: id, status: 'active' },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'username role level profileImage').populate('gameId', 'title serviceType')
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    const updated = { ...post.toObject(), likeCount: post.likes.length }
    res.json({ post: updated })
  } catch {
    res.status(500).json({ message: '게시글 조회 실패' })
  }
}

async function isCommunityBanned(userId: string, scope: 'posts' | 'comments'): Promise<{ banned: boolean; until?: Date }> {
  const user = await User.findById(userId).select('isActive bannedUntil banScope')
  if (!user || user.isActive) return { banned: false }
  if (user.bannedUntil && user.bannedUntil < new Date()) {
    await User.findByIdAndUpdate(userId, { $set: { isActive: true }, $unset: { banReason: '', bannedUntil: '', bannedAt: '', banScope: '' } })
    return { banned: false }
  }
  const scopes: string[] = (user as any).banScope || []
  if (scopes.length === 0 || scopes.includes(scope)) return { banned: true, until: user.bannedUntil }
  return { banned: false }
}

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, channel, gameId, images, tags, videoUrl, thumbnailIndex, isPublished } = req.body
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: '제목과 내용을 입력해주세요' })
    }
    if ((channel === 'beta-game' || channel === 'live-game') && !gameId) {
      return res.status(400).json({ message: '게임을 선택해주세요' })
    }
    if (channel === 'new-game-intro' && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '신작게임소개는 관리자만 작성할 수 있습니다' })
    }
    if (channel === 'new-game-intro' && (!images || images.length === 0)) {
      return res.status(400).json({ message: '이미지를 최소 1장 첨부해주세요' })
    }
    const ban = await isCommunityBanned(req.user!.id, 'posts')
    if (ban.banned) {
      const until = ban.until ? ` (${ban.until.toLocaleDateString('ko-KR')}까지)` : ' (영구)'
      return res.status(403).json({ message: `게시글 작성이 제한되었습니다${until}`, banned: true })
    }
    const validVideoUrl = videoUrl && /^https?:\/\//i.test(videoUrl) ? videoUrl.trim() : ''
    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      author: req.user!.id,
      channel: channel || 'free',
      gameId: gameId || undefined,
      images: images || [],
      videoUrl: validVideoUrl,
      thumbnailIndex: thumbnailIndex || 0,
      tags: tags || [],
      isPublished: isPublished === false ? false : true,
    })
    const populated = await Post.findById(post._id).populate('author', 'username role level profileImage')

    // 포인트 적립: 게시물 작성
    grantPoints(req.user!.id, 'post_write', '게시물 작성 포인트', post._id.toString()).catch(() => {})

    res.status(201).json({ success: true, post: populated })
  } catch {
    res.status(500).json({ message: '게시글 작성 실패' })
  }
}

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, content, channel, images, tags, videoUrl, thumbnailIndex, isPublished } = req.body
    const post = await Post.findById(id)
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    if (post.author.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '수정 권한이 없습니다' })
    }
    if (title) post.title = title.trim()
    if (content) post.content = content.trim()
    if (channel) post.channel = channel
    if (images !== undefined) post.images = images
    if (tags !== undefined) post.tags = tags
    if (videoUrl !== undefined) post.videoUrl = videoUrl && /^https?:\/\//i.test(videoUrl) ? videoUrl.trim() : ''
    if (thumbnailIndex !== undefined) post.thumbnailIndex = thumbnailIndex
    if (isPublished !== undefined) post.isPublished = !!isPublished
    await post.save()
    const populated = await Post.findById(id).populate('author', 'username role level profileImage')
    res.json({ success: true, post: populated })
  } catch {
    res.status(500).json({ message: '게시글 수정 실패' })
  }
}

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const post = await Post.findById(id)
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    if (post.author.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '삭제 권한이 없습니다' })
    }
    post.status = 'deleted'
    post.deletedAt = new Date()
    await post.save()

    // 포인트 차감: 게시물 삭제
    deductPoints(post.author.toString(), 'post_delete', '게시물 삭제 포인트 차감', post._id.toString()).catch(() => {})

    res.json({ success: true, message: '게시글이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '게시글 삭제 실패' })
  }
}

export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const existing = await Post.findOne({ _id: id, status: 'active', likes: userId })
    const isLiked = !!existing
    const updated = await Post.findOneAndUpdate(
      { _id: id, status: 'active' },
      isLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
      { new: true }
    )
    if (!updated) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    updated.hotScore = calcHotScore(updated.likes.length, updated.commentCount, updated.views, updated.createdAt)
    updated.isHot = updated.hotScore > 5
    await updated.save()

    // 포인트: 게시물 작성자에게 좋아요 포인트 적립/차감 (자기 자신 제외)
    const postAuthorId = updated.author.toString()
    if (postAuthorId !== req.user!.id) {
      if (!isLiked) {
        grantPoints(postAuthorId, 'recommend_received', '게시물 좋아요 포인트', updated._id.toString()).catch(() => {})
      } else {
        deductPoints(postAuthorId, 'recommend_cancelled', '게시물 좋아요 취소 차감', updated._id.toString()).catch(() => {})
      }
    }

    res.json({ liked: !isLiked, likeCount: updated.likes.length })
  } catch {
    res.status(500).json({ message: '좋아요 처리 실패' })
  }
}

export const reportPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    if (!reason?.trim()) return res.status(400).json({ message: '신고 사유를 입력해주세요' })
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const post = await Post.findOne({ _id: id, status: 'active' })
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    // 🔒 자신의 게시글 신고 불가
    if (post.author.toString() === req.user!.id) {
      return res.status(400).json({ message: '자신의 게시글은 신고할 수 없습니다' })
    }
    const alreadyReported = post.reports.some((r) => r.userId.equals(userId))
    if (alreadyReported) return res.status(400).json({ message: '이미 신고한 게시글입니다' })
    post.reports.push({ userId, reason: reason.trim(), createdAt: new Date() })
    post.reportCount = post.reports.length
    if (post.reportCount >= 5) post.status = 'hidden'
    await post.save()
    User.findByIdAndUpdate(post.author, {
      $push: { history: { type: 'report', content: `게시글 신고 - ${reason.trim()}`, createdAt: new Date() } }
    }).catch(() => {})
    res.json({ success: true, message: '신고가 접수되었습니다' })
  } catch {
    res.status(500).json({ message: '신고 처리 실패' })
  }
}

export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    const allComments = await Comment.find({ postId })
      .populate('author', 'username role level profileImage')
      .sort({ createdAt: 1 })

    const comments = allComments.map((c) => {
      const obj: Record<string, any> = c.toObject()
      if (c.status === 'hidden') {
        obj.content = '[신고에 의해서 숨겨진 댓글입니다.]'
        obj.author = null
        obj.isDeleted = true
      } else if (c.status !== 'active') {
        obj.content = '[삭제된 댓글입니다]'
        obj.author = null
        obj.isDeleted = true
      }
      return { ...obj, likeCount: c.likes.length, dislikeCount: c.dislikes.length }
    })
    res.json({ comments })
  } catch {
    res.status(500).json({ message: '댓글 목록 조회 실패' })
  }
}

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params
    const { content, parentId } = req.body
    if (!content?.trim()) return res.status(400).json({ message: '댓글 내용을 입력해주세요' })
    const ban = await isCommunityBanned(req.user!.id, 'comments')
    if (ban.banned) {
      const until = ban.until ? ` (${ban.until.toLocaleDateString('ko-KR')}까지)` : ' (영구)'
      return res.status(403).json({ message: `댓글 작성이 제한되었습니다${until}`, banned: true })
    }
    const post = await Post.findOne({ _id: postId, status: 'active' })
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    const comment = await Comment.create({
      postId,
      author: req.user!.id,
      content: content.trim(),
      parentId: parentId || null,
    })
    const updatedPost = await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } }, { new: true })
    if (updatedPost) {
      const newHot = calcHotScore(updatedPost.likes.length, updatedPost.commentCount, updatedPost.views, updatedPost.createdAt)
      updatedPost.hotScore = newHot
      updatedPost.isHot = newHot > 5
      await updatedPost.save()
    }
    const populated = await Comment.findById(comment._id).populate('author', 'username role level profileImage')

    // 포인트 적립: 댓글 작성
    grantPoints(req.user!.id, 'comment_write', '댓글 작성 포인트', comment._id.toString()).catch(() => {})

    res.status(201).json({ success: true, comment: { ...populated!.toObject(), likeCount: 0, dislikeCount: 0 } })
  } catch {
    res.status(500).json({ message: '댓글 작성 실패' })
  }
}

export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ message: '내용을 입력해주세요' })
    const comment = await Comment.findById(id)
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다' })
    if (comment.status !== 'active') return res.status(404).json({ message: '삭제되었거나 숨겨진 댓글입니다' })
    if (comment.author.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '수정 권한이 없습니다' })
    }
    comment.content = content.trim()
    await comment.save()
    const populated = await Comment.findById(id).populate('author', 'username role level profileImage')
    res.json({ success: true, comment: { ...populated!.toObject(), likeCount: comment.likes.length, dislikeCount: comment.dislikes.length } })
  } catch {
    res.status(500).json({ message: '댓글 수정 실패' })
  }
}

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const comment = await Comment.findById(id)
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다' })
    if (comment.status === 'deleted') return res.status(404).json({ message: '이미 삭제된 댓글입니다' })

    const post = await Post.findById(comment.postId).select('author')
    const isCommentAuthor = comment.author.toString() === req.user!.id
    const isPostAuthor = !!post && post.author.toString() === req.user!.id
    if (!isCommentAuthor && !isPostAuthor && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '삭제 권한이 없습니다' })
    }

    comment.status = 'deleted'
    comment.deletedAt = new Date()
    comment.deletedBy = new mongoose.Types.ObjectId(req.user!.id)
    await comment.save()
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } })

    // 포인트 차감: 댓글 삭제
    deductPoints(comment.author.toString(), 'comment_delete', '댓글 삭제 포인트 차감', comment._id.toString()).catch(() => {})

    res.json({ success: true, message: '댓글이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '댓글 삭제 실패' })
  }
}

export const restoreComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const comment = await Comment.findById(id)
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다' })
    if (comment.status !== 'deleted') return res.status(404).json({ message: '삭제된 댓글이 아닙니다' })
    if (!comment.deletedBy || comment.deletedBy.toString() !== req.user!.id) {
      return res.status(403).json({ message: '삭제한 사람만 복구할 수 있습니다' })
    }

    comment.status = 'active'
    comment.deletedAt = undefined
    comment.deletedBy = undefined
    await comment.save()
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: 1 } })

    const populated = await Comment.findById(id).populate('author', 'username role level profileImage')
    res.json({ success: true, comment: { ...populated!.toObject(), likeCount: comment.likes.length, dislikeCount: comment.dislikes.length } })
  } catch {
    res.status(500).json({ message: '댓글 복구 실패' })
  }
}

export const toggleCommentLike = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const comment = await Comment.findOne({ _id: id, status: 'active' })
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다' })
    // 🔒 자신의 댓글 좋아요 불가
    if (comment.author.toString() === req.user!.id) {
      return res.status(400).json({ message: '자신의 댓글에는 좋아요를 누를 수 없습니다' })
    }
    const idx = comment.likes.findIndex((l) => l.equals(userId))
    if (idx > -1) comment.likes.splice(idx, 1)
    else {
      comment.likes.push(userId)
      // 추천/비추천은 상호 배타적 — 좋아요를 누르면 비추천은 자동 해제
      const dislikeIdx = comment.dislikes.findIndex((l) => l.equals(userId))
      if (dislikeIdx > -1) comment.dislikes.splice(dislikeIdx, 1)
    }
    await comment.save()

    // 포인트: 댓글 작성자에게 좋아요 포인트 적립/차감
    const commentAuthorId = comment.author.toString()
    if (commentAuthorId !== req.user!.id) {
      if (idx === -1) {
        grantPoints(commentAuthorId, 'recommend_received', '댓글 좋아요 포인트', comment._id.toString()).catch(() => {})
      } else {
        deductPoints(commentAuthorId, 'recommend_cancelled', '댓글 좋아요 취소 차감', comment._id.toString()).catch(() => {})
      }
    }

    res.json({ liked: idx === -1, likeCount: comment.likes.length, dislikeCount: comment.dislikes.length })
  } catch {
    res.status(500).json({ message: '좋아요 처리 실패' })
  }
}

export const toggleCommentDislike = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const comment = await Comment.findOne({ _id: id, status: 'active' })
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다' })
    // 🔒 자신의 댓글 비추천 불가
    if (comment.author.toString() === req.user!.id) {
      return res.status(400).json({ message: '자신의 댓글에는 비추천을 누를 수 없습니다' })
    }
    const idx = comment.dislikes.findIndex((l) => l.equals(userId))
    if (idx > -1) comment.dislikes.splice(idx, 1)
    else {
      comment.dislikes.push(userId)
      // 추천/비추천은 상호 배타적 — 비추천을 누르면 좋아요는 자동 해제
      const likeIdx = comment.likes.findIndex((l) => l.equals(userId))
      if (likeIdx > -1) comment.likes.splice(likeIdx, 1)
    }
    await comment.save()

    res.json({ disliked: idx === -1, likeCount: comment.likes.length, dislikeCount: comment.dislikes.length })
  } catch {
    res.status(500).json({ message: '비추천 처리 실패' })
  }
}

export const reportComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    if (!reason?.trim()) return res.status(400).json({ message: '신고 사유를 입력해주세요' })
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const comment = await Comment.findOne({ _id: id, status: 'active' })
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다' })
    // 🔒 자신의 댓글 신고 불가
    if (comment.author.toString() === req.user!.id) {
      return res.status(400).json({ message: '자신의 댓글은 신고할 수 없습니다' })
    }
    if (comment.reports.some((r) => r.userId.equals(userId))) {
      return res.status(400).json({ message: '이미 신고한 댓글입니다' })
    }
    comment.reports.push({ userId, reason: reason.trim(), createdAt: new Date() })
    comment.reportCount = comment.reports.length
    if (comment.reportCount >= 5) comment.status = 'hidden'
    await comment.save()
    User.findByIdAndUpdate(comment.author, {
      $push: { history: { type: 'report', content: `댓글 신고 - ${reason.trim()}`, createdAt: new Date() } }
    }).catch(() => {})
    res.json({ success: true, message: '신고가 접수되었습니다' })
  } catch {
    res.status(500).json({ message: '신고 처리 실패' })
  }
}

export const getReportedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const filter: Record<string, unknown> = { reportCount: { $gt: 0 }, status: { $in: ['active', 'hidden'] } }
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ]
    const total = await Post.countDocuments(filter)
    const posts = await Post.find(filter)
      .populate('author', 'username email role')
      .populate('reports.userId', 'username')
      .sort({ reportCount: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ posts, total })
  } catch {
    res.status(500).json({ message: '신고 목록 조회 실패' })
  }
}

export const adminUpdatePostStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, clearReports, deletedByReport } = req.body
    if (!['active', 'hidden', 'deleted'].includes(status)) {
      return res.status(400).json({ message: '올바른 상태값이 아닙니다' })
    }
    // 삭제 전 작성자 ID 확인 (포인트 차감용)
    const existingPost = status === 'deleted' ? await Post.findById(id).select('author status') : null

    const updateOp: Record<string, unknown> = { $set: { status } }
    if (clearReports) (updateOp.$set as Record<string, unknown>).reports = []
    if (deletedByReport) (updateOp.$set as Record<string, unknown>).deletedByReport = true
    if (status === 'deleted') (updateOp.$set as Record<string, unknown>).deletedAt = new Date()
    if (status === 'active') {
      (updateOp.$set as Record<string, unknown>).deletedByReport = false;
      (updateOp.$set as Record<string, unknown>).deletedAt = null
    }
    const post = await Post.findByIdAndUpdate(id, updateOp, { new: true }).populate('author', 'username')
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })

    // 관리자 강제삭제 시 작성자 포인트 차감
    if (status === 'deleted' && existingPost && existingPost.status !== 'deleted') {
      deductPoints(existingPost.author.toString(), 'post_delete', '관리자 강제삭제 포인트 차감', id).catch(() => {})
    }

    res.json({ success: true, post })
  } catch {
    res.status(500).json({ message: '상태 변경 실패' })
  }
}

export const getDeletedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const filter: Record<string, unknown> = { status: 'deleted' }
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ]
    const total = await Post.countDocuments(filter)
    const posts = await Post.find(filter)
      .populate('author', 'username email role')
      .populate('gameId', 'title')
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ posts, total })
  } catch {
    res.status(500).json({ message: '삭제된 게시글 목록 조회 실패' })
  }
}

export const permanentlyDeletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const post = await Post.findById(id)
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    if (post.status !== 'deleted') return res.status(400).json({ message: '삭제된 게시글만 완전 삭제할 수 있습니다' })

    await Comment.deleteMany({ postId: id })
    await post.deleteOne()

    res.json({ success: true, message: '완전히 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '완전 삭제 실패' })
  }
}

export const getDeletedComments = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const filter: Record<string, unknown> = { status: 'deleted' }
    if (search) filter.content = { $regex: search, $options: 'i' }
    const total = await Comment.countDocuments(filter)
    const comments = await Comment.find(filter)
      .populate('author', 'username role')
      .populate('postId', 'title channel')
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ comments, total })
  } catch {
    res.status(500).json({ message: '삭제된 댓글 목록 조회 실패' })
  }
}

export const getReportedUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const [postAgg, commentAgg] = await Promise.all([
      Post.aggregate([
        { $match: { reportCount: { $gt: 0 }, author: { $ne: null } } },
        { $group: { _id: '$author', postReportCount: { $sum: '$reportCount' }, reportedPostCount: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { reportCount: { $gt: 0 }, author: { $ne: null } } },
        { $group: { _id: '$author', commentReportCount: { $sum: '$reportCount' }, reportedCommentCount: { $sum: 1 } } },
      ]),
    ])

    const map = new Map<string, { postReportCount: number; reportedPostCount: number; commentReportCount: number; reportedCommentCount: number }>()
    for (const r of postAgg) {
      map.set(r._id.toString(), { postReportCount: r.postReportCount, reportedPostCount: r.reportedPostCount, commentReportCount: 0, reportedCommentCount: 0 })
    }
    for (const r of commentAgg) {
      const key = r._id.toString()
      const existing = map.get(key) ?? { postReportCount: 0, reportedPostCount: 0, commentReportCount: 0, reportedCommentCount: 0 }
      existing.commentReportCount = r.commentReportCount
      existing.reportedCommentCount = r.reportedCommentCount
      map.set(key, existing)
    }

    const userIds = [...map.keys()].map(id => new mongoose.Types.ObjectId(id))
    const users = await User.find({ _id: { $in: userIds } }).select('username email role isActive bannedAt banReason banScope bannedUntil appeal history createdAt')

    const result = users.map(u => {
      const stats = map.get(u._id.toString()) ?? { postReportCount: 0, reportedPostCount: 0, commentReportCount: 0, reportedCommentCount: 0 }
      return {
        _id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        bannedAt: u.bannedAt,
        banReason: u.banReason,
        banScope: (u as any).banScope || [],
        bannedUntil: u.bannedUntil,
        appeal: (u as any).appeal ?? null,
        history: ((u as any).history ?? []).slice().reverse(),
        createdAt: u.createdAt,
        ...stats,
        totalReportCount: stats.postReportCount + stats.commentReportCount,
      }
    }).sort((a, b) => b.totalReportCount - a.totalReportCount)

    res.json({ users: result, total: result.length })
  } catch {
    res.status(500).json({ message: '신고 유저 목록 조회 실패' })
  }
}

export const getReportedComments = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const filter: Record<string, unknown> = { reportCount: { $gt: 0 }, status: { $in: ['active', 'hidden'] } }
    if (search) filter.content = { $regex: search, $options: 'i' }
    const total = await Comment.countDocuments(filter)
    const comments = await Comment.find(filter)
      .populate('author', 'username role')
      .populate('postId', 'title channel')
      .sort({ reportCount: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ comments, total })
  } catch {
    res.status(500).json({ message: '신고 댓글 목록 조회 실패' })
  }
}

export const adminUpdateCommentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { action, clearReports } = req.body
    const comment = await Comment.findById(id)
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다' })

    if (action === 'hide') {
      comment.status = 'hidden'
      await comment.save()
    } else if (action === 'delete') {
      comment.status = 'deleted'
      comment.deletedAt = new Date()
      await comment.save()
    } else if (action === 'restore') {
      comment.status = 'active'
      comment.deletedAt = undefined
      if (clearReports) {
        comment.reports = [] as typeof comment.reports
        comment.reportCount = 0
      }
      await comment.save()
    } else {
      return res.status(400).json({ message: '올바른 액션이 아닙니다' })
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ message: '처리 실패' })
  }
}

export const getCommunityStats = async (_req: Request, res: Response) => {
  try {
    const [totalPosts, totalComments, hotPosts, hotGames] = await Promise.all([
      Post.countDocuments({ status: 'active' }),
      Comment.countDocuments({ status: 'active' }),
      Post.find({ status: 'active', isPublished: { $ne: false } })
        .sort({ hotScore: -1 }).limit(5)
        .populate('author', 'username role level profileImage')
        .select('title content hotScore commentCount likes channel createdAt views images thumbnailIndex isHot gameId')
        .populate('gameId', 'title serviceType'),
      // 인기 게임 커뮤니티: gameId별 게시글 수 집계
      Post.aggregate([
        { $match: { status: 'active', isPublished: { $ne: false }, gameId: { $ne: null } } },
        { $group: { _id: '$gameId', postCount: { $sum: 1 }, totalLikes: { $sum: { $size: '$likes' } } } },
        { $sort: { postCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'games', localField: '_id', foreignField: '_id', as: 'game' } },
        { $unwind: { path: '$game', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, postCount: 1, totalLikes: 1, gameTitle: '$game.title', gameThumbnail: '$game.thumbnail' } }
      ])
    ])
    res.json({
      totalPosts, totalComments,
      hotPosts: hotPosts.map(p => ({ ...p.toObject(), likeCount: p.likes.length })),
      hotGames
    })
  } catch {
    res.status(500).json({ message: '통계 조회 실패' })
  }
}

// 커뮤니티 이미지 업로드
export const uploadCommunityImages = async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return res.status(400).json({ message: '업로드할 이미지를 선택해주세요' })
    }
    const imageUrls = files.map(f => `/uploads/community/${f.filename}`)
    res.json({ success: true, images: imageUrls })
  } catch {
    res.status(500).json({ message: '이미지 업로드 실패' })
  }
}
