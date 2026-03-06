import { Request, Response } from 'express'
import mongoose from 'mongoose'
import Post from '../models/Post'
import Comment from '../models/Comment'
// 🔒 중복 AuthRequest 제거 - middleware/auth.ts의 것을 사용
import { AuthRequest } from '../middleware/auth'

// 핫 스코어 계산: likes*3 + comments*2 + views*0.1 - 시간 감쇠
function calcHotScore(likes: number, comments: number, views: number, createdAt: Date): number {
  const ageHours = (Date.now() - createdAt.getTime()) / 3600000
  return (likes * 3 + comments * 2 + views * 0.1) / Math.pow(ageHours + 2, 1.5)
}

export const getPosts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 15, sort = 'latest', category, gameId, search, tag } = req.query
    const limitNum = Math.min(Number(limit) || 15, 100)
    const filter: Record<string, unknown> = { status: 'active' }
    if (category) filter.category = category
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

    let sortObj: Record<string, unknown> = { isPinned: -1, createdAt: -1 }
    if (sort === 'popular') sortObj = { isPinned: -1, hotScore: -1 }
    else if (sort === 'trending') sortObj = { isPinned: -1, hotScore: -1, createdAt: -1 }
    else if (sort === 'most_liked') sortObj = { isPinned: -1, 'likes.length': -1, createdAt: -1 }

    const total = await Post.countDocuments(filter)
    const posts = await Post.find(filter)
      .populate('author', 'username role')
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
    ).populate('author', 'username role').populate('gameId', 'title')
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    const updated = { ...post.toObject(), likeCount: post.likes.length, bookmarkCount: post.bookmarks.length }
    res.json({ post: updated })
  } catch {
    res.status(500).json({ message: '게시글 조회 실패' })
  }
}

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, gameId, images, links, tags } = req.body
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: '제목과 내용을 입력해주세요' })
    }
    const validLinks = (links || []).filter((l: { url: string }) => /^https?:\/\//i.test(l.url))
    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      author: req.user!.id,
      category: category || 'general',
      gameId: gameId || undefined,
      images: images || [],
      links: validLinks,
      tags: tags || []
    })
    const populated = await Post.findById(post._id).populate('author', 'username role')
    res.status(201).json({ success: true, post: populated })
  } catch {
    res.status(500).json({ message: '게시글 작성 실패' })
  }
}

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, content, category, images, links, tags } = req.body
    const post = await Post.findById(id)
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    if (post.author.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '수정 권한이 없습니다' })
    }
    if (title) post.title = title.trim()
    if (content) post.content = content.trim()
    if (category) post.category = category
    if (images !== undefined) post.images = images
    if (links !== undefined) post.links = links.filter((l: { url: string }) => /^https?:\/\//i.test(l.url))
    if (tags !== undefined) post.tags = tags
    await post.save()
    const populated = await Post.findById(id).populate('author', 'username role')
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
      .populate('author', 'username role')
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
    const comments = await Comment.find({ postId, parentId: null })
      .populate('author', 'username role')
      .sort({ isOfficial: -1, createdAt: 1 })
    const replies = await Comment.find({ postId, status: 'active', parentId: { $ne: null } })
      .populate('author', 'username role')
      .sort({ createdAt: 1 })

    const tree = comments.map((c) => {
      const obj: Record<string, unknown> = c.toObject()
      if (c.status !== 'active') {
        obj.content = '[삭제된 댓글입니다]'
        obj.author = null
        obj.isDeleted = true
      }
      return {
        ...obj,
        likeCount: c.likes.length,
        replies: replies
          .filter((r) => r.parentId?.toString() === c._id.toString())
          .map((r) => ({ ...r.toObject(), likeCount: r.likes.length }))
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
      await Post.findByIdAndUpdate(postId, { hotScore: newHot, isHot: newHot > 5 })
    }
    const populated = await Comment.findById(comment._id).populate('author', 'username role')
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
    const populated = await Comment.findById(id).populate('author', 'username role')
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
    const updateOp: Record<string, unknown> = { $set: { status } }
    if (clearReports) (updateOp.$set as Record<string, unknown>).reports = []
    const post = await Post.findByIdAndUpdate(id, updateOp, { new: true }).populate('author', 'username')
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다' })
    res.json({ success: true, post })
  } catch {
    res.status(500).json({ message: '상태 변경 실패' })
  }
}

export const getCommunityStats = async (_req: Request, res: Response) => {
  try {
    const [totalPosts, totalComments, hotPosts] = await Promise.all([
      Post.countDocuments({ status: 'active' }),
      Comment.countDocuments({ status: 'active' }),
      Post.find({ isHot: true, status: 'active' }).sort({ hotScore: -1 }).limit(5)
        .populate('author', 'username').select('title hotScore commentCount createdAt')
    ])
    res.json({ totalPosts, totalComments, hotPosts })
  } catch {
    res.status(500).json({ message: '통계 조회 실패' })
  }
}
