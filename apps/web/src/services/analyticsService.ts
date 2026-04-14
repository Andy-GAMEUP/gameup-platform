'use client'
import apiClient from './api'

export interface OverviewSummary {
  totalGames: number
  totalRevenue: number
  totalActiveUsers: number
  avgARPPU: number
  revenueChange: number
  activeChange: number
  arppuChange: number
}

export interface OverviewGameRow {
  id: string
  title: string
  genre?: string
  serviceType?: string
  monetization?: string
  rating: number
  approvalStatus?: string
  status?: string
  revenue: number
  activeUsers: number
  avgDau: number
  arppu: number
  pur: number
  cumulativeMembers: number
  newMembers: number
}

export interface DeveloperOverviewResponse {
  success: boolean
  mode: 'range' | 'lifetime'
  from: string
  to: string
  summary: OverviewSummary
  games: OverviewGameRow[]
}

export interface GameAnalyticsOverview {
  cumulativeMembers: number
  newMembers: number
  avgDau: number
  mau: number
  totalRevenue: number
  payingUsers: number
  pur: number
  arppu: number
  arpu: number
  activeUsers: number
}

export interface DailyPoint {
  date: string
  dau: number
  newMembers: number
  payingUsers: number
  revenue: number
}

export interface RetentionPoint { day: number; rate: number; cohortSize: number }

export interface GameAnalyticsResponse {
  success: boolean
  gameTitle: string
  from: string
  to: string
  overview: GameAnalyticsOverview
  daily: DailyPoint[]
  retention: RetentionPoint[]
}

export const analyticsService = {
  getDeveloperOverview: async (params?: { from?: string; to?: string; mode?: 'range' | 'lifetime' }) => {
    const response = await apiClient.get<DeveloperOverviewResponse>('/games/developer/overview', { params })
    return response.data
  },

  getGameAnalytics: async (gameId: string, params: { from: string; to: string }) => {
    const response = await apiClient.get<GameAnalyticsResponse>(`/games/${gameId}/analytics`, { params })
    return response.data
  },

  exportGameAnalytics: async (gameId: string, params: { from: string; to: string }) => {
    const response = await apiClient.get(`/games/${gameId}/analytics/export`, {
      params,
      responseType: 'blob',
    })
    return response.data as Blob
  },
}
