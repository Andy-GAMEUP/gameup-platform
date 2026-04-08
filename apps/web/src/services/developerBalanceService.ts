'use client'
import apiClient from './api'

export const developerBalanceService = {
  // ─── 개발사 API ────────────────────────────────────────────────
  getMyBalance: async () => {
    const response = await apiClient.get('/developer/point-balance')
    return response.data
  },

  getMyTransactions: async (params?: { page?: number; limit?: number; type?: string }) => {
    const response = await apiClient.get('/developer/point-transactions', { params })
    return response.data
  },

  purchasePoints: async (packageId: string) => {
    const response = await apiClient.post('/developer/point-purchase', { packageId })
    return response.data
  },

  // ─── 공개 API ──────────────────────────────────────────────────
  getPointPackages: async () => {
    const response = await apiClient.get('/point-packages')
    return response.data
  },
}
