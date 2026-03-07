'use client'
import apiClient from './api'
import { Game } from '@gameup/types'

export const gameService = {
  getAllGames: async (params?: { genre?: string; search?: string; sort?: string; page?: number; limit?: number }) => {
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

  deleteGame: async (id: string) => {
    const response = await apiClient.delete(`/games/${id}`)
    return response.data
  },

  incrementPlayCount: async (id: string) => {
    const response = await apiClient.post(`/games/${id}/play`)
    return response.data
  },
}
