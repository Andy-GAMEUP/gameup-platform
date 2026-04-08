import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { PostModel as Post, CommentModel as Comment } from '@gameup/db'
// 🔒 중복 AuthRequest 제거 - middleware/auth.ts의 것을 사용
import { AuthRequest } from '../middleware/auth'
import { grantPoints, deductPoints } from '../services/pointService'

// 핫 스코어 계산: likes*3 + comments*2 + views*0.1 - 시간 감쇠
function calcHotScore(likes: number, comments: number, views: number, createdAt: Date): number {
  const ageHours = (Date.now() - createdAt.getTime()) / 3600000
  return (likes * 3 + comments * 2 + views * 0.1) / Math.pow(ageHours + 2, 1.5)
}

export const getPosts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 15, sort = 'latest', channel, gameId, search, tag } = req.query
    const limitNum = Math.min(Number(limit) || 15, 100)
    const filter: Record<string, unknown> = { status: 'active', isTempSave: { $ne: true } }
    if (channel) filter.channel = channel
    if (gameId) filter.gameId = gameId
    if (tag) filter.tags = tag
    if (search) {
      // 🔒 정규식 특수문자 이스케이프 (ReDoS 방지)
      const safe = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { content: { $regex: safe, $options: 'i' } }
      ]
    }

    let sortObj: Record<string, 1 | -1> = { isPinned: -1, createdAt: -1 }
    if (sort === 'popular') sortObj = { isPinned: -1, hotScore: -1 }
    else if (sort === 'trending') sortObj = { isPinned: -1, hotScore: -1, createdAt: -1 }
    else if (sort === 'most_liked') sortObj = { isPinned: -1, 'likes.length': -1, createdAt: -1 }

    const total = await Post.countDocuments(filter)
    const posts = await Post.find(filter)
      .populate('author', 'username role level')
      .populate('gameId', 'title')
      .sort(sortObj)
      .skip((Number(page) - 1) * limitNum)
      .limit(limitNum)
      .select('-reports')

    const postList = posts.map((p) => ({
      ...p.toObject(),
      likeCount: p.likes.length,
      bookmarkCount: p.bookmarks.length
    }))

    res.json({ posts: postList, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '게시글 목록 조회 실패' })
  }
}

export const getPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const post = await Post.findOneAndUpdate(
      { _id: id, status: 'active' },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'username role level').populate('gameId', 'title')
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    const updated = { ...post.toObject(), likeCount: post.likes.length, bookmarkCount: post.bookmarks.length }
    res.json({ post: updated })
  } catch {
    res.status(500).json({ message: '게시글 조회 실패' })
  }
}

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, channel, gameId, images, links, tags, videoUrl, thumbnailIndex } = req.body
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: '제목과 내용을 입력해주세요' })
    }
    const validLinks = (links || []).filter((l: { url: string }) => /^https?:\/\//i.test(l.url))
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
      links: validLinks,
      tags: tags || []
    })
    const populated = await Post.findById(post._id).populate('author', 'username role level')

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
    const { title, content, channel, images, links, tags, videoUrl, thumbnailIndex } = req.body
    const post = await Post.findById(id)
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    if (post.author.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '수정 권한이 없습니다' })
    }
    if (title) post.title = title.trim()
    if (content) post.content = content.trim()
    if (channel) post.channel = channel
    if (images !== undefined) post.images = images
    if (links !== undefined) post.links = links.filter((l: { url: string }) => /^https?:\/\//i.test(l.url))
    if (tags !== undefined) post.tags = tags
    if (videoUrl !== undefined) post.videoUrl = videoUrl && /^https?:\/\//i.test(videoUrl) ? videoUrl.trim() : ''
    if (thumbnailIndex !== undefined) post.thumbnailIndex = thumbnailIndex
    await post.save()
    const populated = await Post.findById(id).populate('author', 'username role level')
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

export const toggleBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const existing = await Post.findOne({ _id: id, status: 'active', bookmarks: userId })
    const isBookmarked = !!existing
    const updated = await Post.findOneAndUpdate(
      { _id: id, status: 'active' },
      isBookmarked ? { $pull: { bookmarks: userId } } : { $addToSet: { bookmarks: userId } },
      { new: true }
    )
    if (!updated) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    res.json({ bookmarked: !isBookmarked, bookmarkCount: updated.bookmarks.length })
  } catch {
    res.status(500).json({ message: '즐겨찾기 처리 실패' })
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
    res.json({ success: true, message: '신고가 접수되었습니다' })
  } catch {
    res.status(500).json({ message: '신고 처리 실패' })
  }
}

export const getMyBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const { page = 1, limit = 10 } = req.query
    const total = await Post.countDocuments({ bookmarks: userId, status: 'active' })
    const posts = await Post.find({ bookmarks: userId, status: 'active' })
      .populate('author', 'username role level')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select('-reports')
    res.json({ posts: posts.map(p => ({ ...p.toObject(), likeCount: p.likes.length, bookmarkCount: p.bookmarks.length })), total })
  } catch {
    res.status(500).json({ message: '즐겨찾기 목록 조회 실패' })
  }
}

export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    const allComments = await Comment.find({ postId })
      .populate('author', 'username role level')
      .sort({ createdAt: 1 })

    const rootComments: typeof allComments = []
    const replyMap = new Map<string, typeof allComments>()

    for (const c of allComments) {
      if (!c.parentId) {
        rootComments.push(c)
      } else if (c.status === 'active') {
        const parentKey = c.parentId.toString()
        if (!replyMap.has(parentKey)) replyMap.set(parentKey, [])
        replyMap.get(parentKey)!.push(c)
      }
    }

    // isOfficial 우선 정렬
    rootComments.sort((a, b) => {
      if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    const tree = rootComments.map((c) => {
      const obj: Record<string, any> = c.toObject()
      if (c.status !== 'active') {
        obj.content = '[삭제된 댓글입니다]'
        obj.author = null
        obj.isDeleted = true
      }
      const replies = replyMap.get(c._id.toString()) || []
      return {
        ...obj,
        likeCount: c.likes.length,
        replies: replies.map((r) => ({ ...r.toObject(), likeCount: r.likes.length }))
      }
    })
    res.json({ comments: tree })
  } catch {
    res.status(500).json({ message: '댓글 목록 조회 실패' })
  }
}

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params
    const { content, parentId } = req.body
    if (!content?.trim()) return res.status(400).json({ message: '댓글 내용을 입력해주세요' })
    const post = await Post.findOne({ _id: postId, status: 'active' })
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    const isOfficial = ['admin', 'developer'].includes(req.user!.role)
    const comment = await Comment.create({
      postId,
      author: req.user!.id,
      content: content.trim(),
      parentId: parentId || null,
      isOfficial
    })
    const updatedPost = await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } }, { new: true })
    if (updatedPost) {
      const newHot = calcHotScore(updatedPost.likes.length, updatedPost.commentCount, updatedPost.views, updatedPost.createdAt)
      updatedPost.hotScore = newHot
      updatedPost.isHot = newHot > 5
      await updatedPost.save()
    }
    const populated = await Comment.findById(comment._id).populate('author', 'username role level')

    // 포인트 적립: 댓글 작성
    grantPoints(req.user!.id, 'comment_write', '댓글 작성 포인트', comment._id.toString()).catch(() => {})

    res.status(201).json({ success: true, comment: { ...populated!.toObject(), likeCount: 0 } })
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
    if (comment.author.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '수정 권한이 없습니다' })
    }
    comment.content = content.trim()
    await comment.save()
    const populated = await Comment.findById(id).populate('author', 'username role level')
    res.json({ success: true, comment: { ...populated!.toObject(), likeCount: comment.likes.length } })
  } catch {
    res.status(500).json({ message: '댓글 수정 실패' })
  }
}

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const comment = await Comment.findById(id)
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다' })
    if (comment.author.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '삭제 권한이 없습니다' })
    }
    comment.status = 'deleted'
    await comment.save()
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } })

    // 포인트 차감: 댓글 삭제
    deductPoints(comment.author.toString(), 'comment_delete', '댓글 삭제 포인트 차감', comment._id.toString()).catch(() => {})

    res.json({ success: true, message: '댓글이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '댓글 삭제 실패' })
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
    else comment.likes.push(userId)
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

    res.json({ liked: idx === -1, likeCount: comment.likes.length })
  } catch {
    res.status(500).json({ message: '좋아요 처리 실패' })
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
    res.json({ success: true, message: '신고가 접수되었습니다' })
  } catch {
    res.status(500).json({ message: '신고 처리 실패' })
  }
}

export const getReportedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const filter = { reportCount: { $gt: 0 }, status: { $in: ['active', 'hidden'] } }
    const total = await Post.countDocuments(filter)
    const posts = await Post.find(filter)
      .populate('author', 'username email role')
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
    const { status, clearReports } = req.body
    if (!['active', 'hidden', 'deleted'].includes(status)) {
      return res.status(400).json({ message: '올바른 상태값이 아닙니다' })
    }
    // 삭제 전 작성자 ID 확인 (포인트 차감용)
    const existingPost = status === 'deleted' ? await Post.findById(id).select('author status') : null

    const updateOp: Record<string, unknown> = { $set: { status } }
    if (clearReports) (updateOp.$set as Record<string, unknown>).reports = []
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

export const tempSave = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, channel, tags } = req.body
    const existing = await Post.findOne({ author: req.user!.id, isTempSave: true, status: 'active' })
    if (existing) {
      existing.title = title?.trim() || '임시저장'
      existing.content = content?.trim() || ''
      existing.channel = channel || 'free'
      existing.tags = tags || []
      await existing.save()
      return res.json({ success: true, post: existing })
    }
    const post = await Post.create({
      title: title?.trim() || '임시저장',
      content: content?.trim() || '',
      author: req.user!.id,
      channel: channel || 'free',
      tags: tags || [],
      isTempSave: true
    })
    res.status(201).json({ success: true, post })
  } catch {
    res.status(500).json({ message: '임시저장 실패' })
  }
}

export const getMyDrafts = async (req: AuthRequest, res: Response) => {
  try {
    const posts = await Post.find({ author: req.user!.id, isTempSave: true, status: 'active' })
      .sort({ updatedAt: -1 }).limit(10)
    res.json({ posts })
  } catch {
    res.status(500).json({ message: '임시저장 목록 조회 실패' })
  }
}

export const getCommunityStats = async (_req: Request, res: Response) => {
  try {
    const [totalPosts, totalComments, hotPosts, hotGames] = await Promise.all([
      Post.countDocuments({ status: 'active' }),
      Comment.countDocuments({ status: 'active' }),
      Post.find({ status: 'active', isTempSave: { $ne: true } })
        .sort({ hotScore: -1 }).limit(5)
        .populate('author', 'username')
        .select('title hotScore commentCount likes channel createdAt'),
      // 인기 게임 커뮤니티: gameId별 게시글 수 집계
      Post.aggregate([
        { $match: { status: 'active', isTempSave: { $ne: true }, gameId: { $ne: null } } },
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
