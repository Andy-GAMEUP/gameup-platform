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

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await apiClient.patch('/users/password', data)
    return response.data
  },

  deleteAccount: async (data: { password: string }) => {
    const response = await apiClient.delete('/users/account', { data })
    return response.data
  },

  getLevelTiers: async () => {
    const response = await apiClient.get('/users/levels')
    return response.data.levels as { level: number; name: string; icon?: string; requiredScore: number }[]
  }
}
