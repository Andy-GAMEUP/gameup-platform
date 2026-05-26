'use client'
import apiClient from './api'

export interface OverviewSummary {
  totalRevenue: number
  totalActiveUsers: number
  totalNewMembers: number
  avgPUR: number
  revenueChange: number
  activeChange: number
  newMembersChange: number
  purChange: number
}

export interface OverviewGameRow {
  id: string
  title: string
  thumbnail?: string | null
  genre?: string
  serviceType?: string
  monetization?: string
  rating: number
  approvalStatus?: string
  status?: string
  revenue: number
  activeUsers: number
  avgDau: number
  arpu: number
  arppu: number
  pur: number
  cumulativeMembers: number
  newMembers: number
  avgSession: number
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
  avgSession?: number
  avgSessionPayer?: number
  avgSessionNonPayer?: number
}

export interface RetentionPoint { day: number; rate: number; cohortSize: number }
export interface CohortRow { date: string; cohortSize: number; retentions: Array<number | null> }
export interface CohortTable { rows: CohortRow[]; numCols: number }
export interface TopItem { name: string; price: number; sales: number; currency: string }

export interface GameAnalyticsResponse {
  success: boolean
  gameTitle: string
  from: string
  to: string
  overview: GameAnalyticsOverview
  daily: DailyPoint[]
  retention: RetentionPoint[]
  cohortTable: CohortTable
  topItems: TopItem[]
}

export interface DailyOverviewPoint { date: string; revenue: number; dau: number; newMembers: number; payingUsers: number }
export interface DeveloperDailyResponse { success: boolean; from: string; to: string; daily: DailyOverviewPoint[] }

export const analyticsService = {
  getDeveloperDaily: async (params?: { from?: string; to?: string; mode?: 'range' | 'lifetime' }) => {
    const response = await apiClient.get<DeveloperDailyResponse>('/games/developer/daily', { params })
    return response.data
  },

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

  exportDeveloperDashboard: async (params?: { from?: string; to?: string; mode?: 'range' | 'lifetime' }) => {
    const response = await apiClient.get('/games/developer/export', {
      params,
      responseType: 'blob',
    })
    return response.data as Blob
  },
}
