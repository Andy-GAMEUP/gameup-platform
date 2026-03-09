'use client'
import apiClient from './api'

export interface Solution {
  _id: string
  name: string
  category: string
  description: string
  detailedDescription: string
  imageUrl: string
  features: string[]
  pricing: string
  contactUrl: string
  isActive: boolean
  isRecommended: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface SolutionSubscription {
  _id: string
  solutionId: Solution | string
  userId: { _id: string; username: string; email: string } | string
  companyName: string
  managerName: string
  phone: string
  email: string
  message: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  isConfirmed: boolean
  adminNote: string
  createdAt: string
  updatedAt: string
}

export const solutionService = {
  getSolutions: async () => {
    const res = await apiClient.get('/solutions')
    return res.data as { solutions: Solution[] }
  },

  getSolutionDetail: async (id: string) => {
    const res = await apiClient.get(`/solutions/${id}`)
    return res.data as { solution: Solution }
  },

  subscribe: async (data: {
    solutionId: string
    companyName: string
    managerName: string
    phone: string
    email: string
    message?: string
  }) => {
    const res = await apiClient.post('/solutions/subscribe', data)
    return res.data
  },

  getMySubscriptions: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get('/solutions/subscriptions/me', { params })
    return res.data as {
      subscriptions: SolutionSubscription[]
      total: number
      page: number
      totalPages: number
    }
  },

  admin: {
    getSolutions: async () => {
      const res = await apiClient.get('/admin/solutions')
      return res.data as { solutions: Solution[] }
    },

    createSolution: async (data: Partial<Solution>) => {
      const res = await apiClient.post('/admin/solutions', data)
      return res.data
    },

    updateSolution: async (id: string, data: Partial<Solution>) => {
      const res = await apiClient.put(`/admin/solutions/${id}`, data)
      return res.data
    },

    deleteSolution: async (id: string) => {
      const res = await apiClient.delete(`/admin/solutions/${id}`)
      return res.data
    },

    reorderSolutions: async (solutions: { id: string; sortOrder: number }[]) => {
      const res = await apiClient.put('/admin/solutions/reorder', { solutions })
      return res.data
    },

    getSubscriptions: async (params?: {
      status?: string
      solutionId?: string
      page?: number
      limit?: number
    }) => {
      const res = await apiClient.get('/admin/solutions/subscriptions', { params })
      return res.data as {
        subscriptions: SolutionSubscription[]
        total: number
        page: number
        totalPages: number
      }
    },

    getSubscriptionDetail: async (id: string) => {
      const res = await apiClient.get(`/admin/solutions/subscriptions/${id}`)
      return res.data as { subscription: SolutionSubscription }
    },

    updateSubscriptionStatus: async (id: string, data: { status?: string; adminNote?: string }) => {
      const res = await apiClient.patch(`/admin/solutions/subscriptions/${id}/status`, data)
      return res.data
    },

    confirmSubscription: async (id: string) => {
      const res = await apiClient.patch(`/admin/solutions/subscriptions/${id}/confirm`, {})
      return res.data
    },

    deleteSubscription: async (id: string) => {
      const res = await apiClient.delete(`/admin/solutions/subscriptions/${id}`)
      return res.data
    },
  },
}

export default solutionService
