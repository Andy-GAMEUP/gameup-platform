'use client'
import apiClient from './api'

export interface Review {
  _id: string
  userId: { _id: string; username: string }
  gameId: string
  rating: number
  title: string
  content: string
  feedbackType: 'general' | 'bug' | 'suggestion' | 'praise'
  bugSeverity?: 'low' | 'medium' | 'high' | 'critical'
  isVerifiedTester: boolean
  helpfulCount: number
  helpfulUsers: string[]
  createdAt: string
}

export interface FavoriteGame {
  _id: string
  gameId: {
    _id: string
    title: string
    genre: string
    thumbnail?: string
    rating: number
    playCount: number
    status: string
    approvalStatus: string
    feedbackCount: number
  }
  createdAt: string
}

export interface Activity {
  _id: string
  type: 'play' | 'review' | 'favorite' | 'unfavorite' | 'helpful'
  gameId: { _id: string; title: string; thumbnail?: string; genre: string }
  sessionDuration?: number
  createdAt: string
}

export const playerService = {
  // 리뷰
  getGameReviews: async (gameId: string, params?: { page?: number; limit?: number; sort?: string; feedbackType?: string }) => {
    const res = await apiClient.get(`/games/${gameId}/reviews`, { params })
    return res.data
  },
  getMyReview: async (gameId: string) => {
    const res = await apiClient.get(`/games/${gameId}/my-review`)
    return res.data
  },
  upsertReview: async (gameId: string, data: { rating: number; title: string; content: string; feedbackType?: string; bugSeverity?: string }) => {
    const res = await apiClient.post(`/games/${gameId}/reviews`, data)
    return res.data
  },
  deleteReview: async (gameId: string) => {
    const res = await apiClient.delete(`/games/${gameId}/reviews`)
    return res.data
  },
  toggleHelpful: async (reviewId: string) => {
    const res = await apiClient.post(`/reviews/${reviewId}/helpful`)
    return res.data
  },

  // 즐겨찾기
  toggleFavorite: async (gameId: string) => {
    const res = await apiClient.post(`/games/${gameId}/favorite`)
    return res.data
  },
  getMyFavorites: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get('/player/favorites', { params })
    return res.data
  },
  checkFavorites: async (gameIds: string[]) => {
    const res = await apiClient.post('/player/favorites/check', { gameIds })
    return res.data
  },

  // 플레이 / 활동
  recordPlay: async (gameId: string) => {
    const res = await apiClient.post(`/games/${gameId}/play`)
    return res.data
  },
  updatePlaySession: async (gameId: string, sessionDuration: number) => {
    const res = await apiClient.patch(`/games/${gameId}/play/session`, { sessionDuration })
    return res.data
  },
  getMyActivity: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get('/player/activity', { params })
    return res.data
  }
}

export default playerService
