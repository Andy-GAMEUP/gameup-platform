'use client'
import apiClient from './api'

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  role: 'developer' | 'player'
}

export interface UpdateProfileData {
  username: string
  bio?: string
  favoriteGenres?: string[]
}

export const authService = {
  verifyBusinessNumber: async (businessNumber: string) => {
    const response = await apiClient.post('/users/verify-business-number', { businessNumber })
    return response.data as { valid: boolean; reason?: 'not_found' | 'closed' | 'suspended'; message?: string }
  },

  register: async (data: RegisterData) => {
    const response = await apiClient.post('/users/register', data)
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response.data
  },

  login: async (data: LoginData) => {
    const response = await apiClient.post('/users/login', data)
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
    }
    return response.data
  },

  logout: () => {
    localStorage.removeItem('token')
  },

  getProfile: async () => {
    const response = await apiClient.get('/users/profile')
    return response.data
  },

  updateProfile: async (data: UpdateProfileData) => {
    const response = await apiClient.patch('/users/profile', data)
    return response.data
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await apiClient.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await apiClient.patch('/users/password', data)
    return response.data
  },

  toggleBookmarkedTab: async (data: { key: string; label: string; channel?: string; gameId?: string }) => {
    const response = await apiClient.post('/users/bookmarked-tabs/toggle', data)
    return response.data as { success: boolean; bookmarked: boolean; bookmarkedTabs: { key: string; label: string; channel?: string; gameId?: string }[] }
  },

  deleteAccount: async (data: { password: string }) => {
    const response = await apiClient.delete('/users/account', { data })
    return response.data
  },

  reapplyCorporate: async (data: {
    companyName: string
    companyCategory: string
    companyType: string[]
    contactPhone: string
    businessNumber: string
  }) => {
    const response = await apiClient.patch('/users/reapply', data)
    return response.data
  },

  updateCompanyType: async (companyType: string[]) => {
    const response = await apiClient.patch('/users/company-type', { companyType })
    return response.data
  },

  updateCompanyInfo: async (data: {
    companyName?: string
    businessNumber?: string
    businessType?: string
    homepageUrl?: string
    contactPhone?: string
  }) => {
    const response = await apiClient.patch('/users/company-info', data)
    return response.data
  },
}
