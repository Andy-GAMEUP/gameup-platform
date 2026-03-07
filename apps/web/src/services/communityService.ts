'use client'
import apiClient from './api'

export interface PostSummary {
  _id: string
  title: string
  content: string
  author: { _id: string; username: string; role: string }
  gameId?: { _id: string; title: string }
  channel: string
  images: string[]
  links: { url: string; label?: string }[]
  tags: string[]
  likes: string[]
  likeCount: number
  bookmarks: string[]
  bookmarkCount: number
  views: number
  commentCount: number
  status: string
  isPinned: boolean
  isHot: boolean
  hotScore: number
  isTempSave?: boolean
  reportCount: number
  createdAt: string
  updatedAt: string
}

export interface CommentItem {
  _id: string
  postId: string
  author: { _id: string; username: string; role: string }
  content: string
  parentId: string | null
  likes: string[]
  likeCount: number
  isOfficial: boolean
  status: string
  createdAt: string
  replies?: CommentItem[]
}

const communityService = {
  getPosts: async (params?: {
    page?: number; limit?: number; sort?: string
    channel?: string; gameId?: string; search?: string; tag?: string
  }) => {
    const res = await apiClient.get('/community/posts', { params })
    return res.data as { posts: PostSummary[]; total: number; page: number; totalPages: number }
  },

  getPost: async (id: string) => {
    const res = await apiClient.get(`/community/posts/${id}`)
    return res.data.post as PostSummary
  },

  createPost: async (data: {
    title: string; content: string; channel?: string
    gameId?: string; images?: string[]; links?: { url: string; label?: string }[]; tags?: string[]
  }) => {
    const res = await apiClient.post('/community/posts', data)
    return res.data.post as PostSummary
  },

  updatePost: async (id: string, data: Partial<{
    title: string; content: string; channel: string
    images: string[]; links: { url: string; label?: string }[]; tags: string[]
  }>) => {
    const res = await apiClient.put(`/community/posts/${id}`, data)
    return res.data.post as PostSummary
  },

  deletePost: async (id: string) => {
    const res = await apiClient.delete(`/community/posts/${id}`)
    return res.data
  },

  toggleLike: async (id: string) => {
    const res = await apiClient.post(`/community/posts/${id}/like`)
    return res.data as { liked: boolean; likeCount: number }
  },

  toggleBookmark: async (id: string) => {
    const res = await apiClient.post(`/community/posts/${id}/bookmark`)
    return res.data as { bookmarked: boolean; bookmarkCount: number }
  },

  reportPost: async (id: string, reason: string) => {
    const res = await apiClient.post(`/community/posts/${id}/report`, { reason })
    return res.data
  },

  getMyBookmarks: async (page = 1, limit = 10) => {
    const res = await apiClient.get('/community/my/bookmarks', { params: { page, limit } })
    return res.data as { posts: PostSummary[]; total: number }
  },

  getStats: async () => {
    const res = await apiClient.get('/community/stats')
    return res.data
  },

  tempSave: async (data: { title: string; content: string; channel?: string; tags?: string[] }) => {
    const res = await apiClient.post('/community/posts/temp-save', data)
    return res.data.post as PostSummary
  },

  getMyDrafts: async () => {
    const res = await apiClient.get('/community/my/drafts')
    return res.data.posts as PostSummary[]
  },

  getComments: async (postId: string) => {
    const res = await apiClient.get(`/community/posts/${postId}/comments`)
    return res.data.comments as CommentItem[]
  },

  createComment: async (postId: string, content: string, parentId?: string) => {
    const res = await apiClient.post(`/community/posts/${postId}/comments`, { content, parentId })
    return res.data.comment as CommentItem
  },

  updateComment: async (id: string, content: string) => {
    const res = await apiClient.put(`/community/comments/${id}`, { content })
    return res.data.comment as CommentItem
  },

  deleteComment: async (id: string) => {
    const res = await apiClient.delete(`/community/comments/${id}`)
    return res.data
  },

  toggleCommentLike: async (id: string) => {
    const res = await apiClient.post(`/community/comments/${id}/like`)
    return res.data as { liked: boolean; likeCount: number }
  },

  reportComment: async (id: string, reason: string) => {
    const res = await apiClient.post(`/community/comments/${id}/report`, { reason })
    return res.data
  },
}

export default communityService
