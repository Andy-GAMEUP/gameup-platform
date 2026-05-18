'use client'
import apiClient from './api'
import { Game } from '@gameup/types'

export const gameService = {
  getAllGames: async (params?: { genre?: string; search?: string; sort?: string; page?: number; limit?: number; serviceType?: string }) => {
    const response = await apiClient.get<{ games: Game[]; pagination?: { page: number; limit: number; total: number; pages: number } }>('/games', { params })
    return response.data
  },

  getGameById: async (id: string) => {
    const response = await apiClient.get<{ game: Game }>(`/games/${id}`)
    return response.data
  },

  getMyGames: async () => {
    const response = await apiClient.get<{ games: Game[] }>('/games/my')
    return response.data
  },

  getDeveloperStats: async () => {
    const response = await apiClient.get('/games/developer/stats')
    return response.data
  },

  createGame: async (gameData: FormData) => {
    const response = await apiClient.post('/games', gameData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  updateGame: async (id: string, gameData: FormData | Partial<Game>) => {
    const isFormData = gameData instanceof FormData
    const response = await apiClient.put(`/games/${id}`, gameData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    })
    return response.data
  },

  requestReview: async (id: string) => {
    const response = await apiClient.post(`/games/${id}/request-review`)
    return response.data
  },

  deleteGame: async (id: string, payload: { password: string; reason: string }) => {
    const response = await apiClient.delete(`/games/${id}`, { data: payload })
    return response.data
  },

  getGameDeletionLogs: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await apiClient.get('/games/admin/deletion-logs', { params })
    return response.data
  },

  incrementPlayCount: async (id: string) => {
    const response = await apiClient.post(`/games/${id}/play`)
    return response.data
  },

  // Q&A
  getGameQAs: async (gameId: string, params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get(`/games/${gameId}/qas`, { params })
    return response.data
  },

  createGameQA: async (gameId: string, question: string) => {
    const response = await apiClient.post(`/games/${gameId}/qas`, { question })
    return response.data
  },

  // 개발자 Q&A 관리
  getDeveloperQAs: async (params?: { page?: number; limit?: number; gameId?: string; answered?: string }) => {
    const response = await apiClient.get('/games/developer/qas', { params })
    return response.data
  },

  answerGameQA: async (qaId: string, answer: string) => {
    const response = await apiClient.put(`/games/developer/qas/${qaId}/answer`, { answer })
    return response.data
  },

  // 내 Q&A 조회
  getMyQAs: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/games/my-qas', { params })
    return response.data
  },

  // ── 게임 포인트 정책 (개발사) ──────────────────────────────────
  getGamePointPolicies: async (gameId: string) => {
    const response = await apiClient.get(`/games/${gameId}/point-policies`)
    return response.data
  },

  upsertGamePointPolicy: async (gameId: string, data: {
    type: string; label: string; description?: string;
    amount: number; multiplier?: number; dailyLimit?: number | null;
    startDate?: string | null; endDate?: string | null;
    estimatedDailyUsage?: number; developerNote?: string;
    conditionConfig?: Record<string, unknown> | null;
  }) => {
    const response = await apiClient.post(`/games/${gameId}/point-policies`, data)
    return response.data
  },

  submitPointPolicies: async (gameId: string) => {
    const response = await apiClient.post(`/games/${gameId}/point-policies/submit`)
    return response.data
  },

  deleteGamePointPolicy: async (gameId: string, type: string) => {
    const response = await apiClient.delete(`/games/${gameId}/point-policies/${type}`)
    return response.data
  },

  toggleGamePointPolicy: async (gameId: string, type: string) => {
    const response = await apiClient.put(`/games/${gameId}/point-policies/${type}/toggle`)
    return response.data
  },

  getGamePointStats: async (gameId: string) => {
    const response = await apiClient.get(`/game-points/${gameId}/stats`)
    return response.data
  },

  getGamePointLogs: async (gameId: string, params?: { page?: number; limit?: number; type?: string }) => {
    const response = await apiClient.get(`/game-points/${gameId}/logs`, { params })
    return response.data
  },

  // ─── API Key 관리 ────────────────────────────────────────────
  getApiKeys: async (gameId: string) => {
    const response = await apiClient.get(`/games/${gameId}/api-keys`)
    return response.data
  },

  createApiKey: async (gameId: string, data: { name: string; expiresAt?: string }) => {
    const response = await apiClient.post(`/games/${gameId}/api-keys`, data)
    return response.data
  },

  deleteApiKey: async (gameId: string, keyId: string) => {
    const response = await apiClient.delete(`/games/${gameId}/api-keys/${keyId}`)
    return response.data
  },

  regenerateApiKey: async (gameId: string, keyId: string) => {
    const response = await apiClient.put(`/games/${gameId}/api-keys/${keyId}/regenerate`)
    return response.data
  },

  toggleApiKey: async (gameId: string, keyId: string) => {
    const response = await apiClient.put(`/games/${gameId}/api-keys/${keyId}/toggle`)
    return response.data
  },

  // ─── 게임 미디어 ─────────────────────────────────────────────
  getGameMedia: async (gameId: string, type?: 'screenshot' | 'video') => {
    const response = await apiClient.get(`/games/${gameId}/media`, { params: type ? { type } : {} })
    return response.data
  },

  addGameMedia: async (gameId: string, data: { type: 'screenshot' | 'video'; title: string; url?: string }) => {
    const response = await apiClient.post(`/games/${gameId}/media`, data)
    return response.data
  },

  deleteGameMedia: async (gameId: string, mediaId: string) => {
    const response = await apiClient.delete(`/games/${gameId}/media/${mediaId}`)
    return response.data
  },

  // ─── 게임샵 아이템 ───────────────────────────────────────────
  getGameShopItems: async (gameId: string, params?: { sort?: string; period?: string }) => {
    const response = await apiClient.get(`/games/${gameId}/shop-items`, { params })
    return response.data
  },

  createGameShopItem: async (gameId: string, data: { name: string; price: number; currency: string; type: string; stock: string; description?: string }) => {
    const response = await apiClient.post(`/games/${gameId}/shop-items`, data)
    return response.data
  },

  updateGameShopItem: async (gameId: string, itemId: string, data: Partial<{ name: string; price: number; currency: string; type: string; stock: string; description: string; active: boolean }>) => {
    const response = await apiClient.put(`/games/${gameId}/shop-items/${itemId}`, data)
    return response.data
  },

  deleteGameShopItem: async (gameId: string, itemId: string) => {
    const response = await apiClient.delete(`/games/${gameId}/shop-items/${itemId}`)
    return response.data
  },

  // ─── 게임 공지&알림 ─────────────────────────────────────────
  getGameAnnouncements: async (gameId: string, params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get(`/games/${gameId}/announcements`, { params })
    return response.data
  },

  createGameAnnouncement: async (gameId: string, data: { title: string; content: string; type: string; priority: string; sendPush: boolean }) => {
    const response = await apiClient.post(`/games/${gameId}/announcements`, data)
    return response.data
  },

  deleteGameAnnouncement: async (gameId: string, announcementId: string) => {
    const response = await apiClient.delete(`/games/${gameId}/announcements/${announcementId}`)
    return response.data
  },
}
