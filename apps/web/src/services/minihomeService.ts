'use client'
import apiClient from './api'

export interface PortfolioItem {
  _id?: string
  title: string
  description: string
  imageUrl: string
  technologies: string[]
  results: string[]
  clientName: string
  duration: string
  completedAt?: string
}

export interface CertificationItem {
  _id?: string
  name: string
  issuedAt: string
}

export interface WorkExperienceItem {
  _id?: string
  title: string
  description: string
  period: string
}

export interface MiniHome {
  _id: string
  userId: { _id: string; username: string; profileImage?: string; level?: number }
  companyName: string
  introduction: string
  profileImage: string
  coverImage: string
  website: string
  tags: string[]
  keywords: string[]
  isPublic: boolean
  isRecommended: boolean
  representativeGameId: MiniHomeGame | null
  expertiseArea: string[]
  skills: string[]
  hourlyRate: string
  availability: 'available' | 'busy' | 'unavailable'
  location: string
  isVerified: boolean
  rating: number
  reviewCount: number
  completedProjectCount: number
  portfolio: PortfolioItem[]
  certifications: CertificationItem[]
  workExperience: WorkExperienceItem[]
  contactEmail: string
  contactPhone: string
  createdAt: string
  updatedAt: string
}

export interface MiniHomeGame {
  _id: string
  minihomeId: string
  title: string
  genre: string
  description: string
  iconUrl: string
  coverUrl: string
  screenshots: string[]
  platforms: string[]
  status: 'active' | 'inactive'
  sortOrder: number
  createdAt: string
}

export interface MiniHomeNews {
  _id: string
  minihomeId: string
  authorId: { _id: string; username: string }
  type: 'game' | 'company'
  title: string
  content: string
  createdAt: string
}

export interface KeywordGroup {
  _id: string
  name: string
  keywords: { name: string; isActive: boolean }[]
  sortOrder: number
}

export interface Proposal {
  _id: string
  type: 'investment' | 'publishing'
  fromUserId: { _id: string; username: string; profileImage?: string }
  toMinihomeId: { _id: string; companyName: string }
  gameId: MiniHomeGame | null
  title: string
  content: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export const minihomeService = {
  getMyMinihome: async () => {
    const res = await apiClient.get('/minihome/me')
    return res.data as { minihome: MiniHome | null; games?: MiniHomeGame[] }
  },

  getList: async (params?: { page?: number; limit?: number; keyword?: string; sort?: string }) => {
    const res = await apiClient.get('/minihome', { params })
    return res.data as { minihomes: MiniHome[]; total: number; page: number; totalPages: number }
  },

  getKeywords: async () => {
    const res = await apiClient.get('/minihome/keywords')
    return res.data as { groups: KeywordGroup[] }
  },

  getDetail: async (id: string) => {
    const res = await apiClient.get(`/minihome/${id}`)
    return res.data as { minihome: MiniHome; games: MiniHomeGame[] }
  },

  getNews: async (id: string, params?: { page?: number; limit?: number; type?: string }) => {
    const res = await apiClient.get(`/minihome/${id}/news`, { params })
    return res.data as { news: MiniHomeNews[]; total: number; page: number; totalPages: number }
  },

  create: async (data: Record<string, unknown>) => {
    const res = await apiClient.post('/minihome', data)
    return res.data as { minihome: MiniHome }
  },

  update: async (data: Record<string, unknown>) => {
    const res = await apiClient.put('/minihome', data)
    return res.data as { minihome: MiniHome }
  },

  addGame: async (data: {
    title: string
    genre: string
    description: string
    iconUrl?: string
    coverUrl?: string
    screenshots?: string[]
    platforms?: string[]
  }) => {
    const res = await apiClient.post('/minihome/games', data)
    return res.data as { game: MiniHomeGame }
  },

  updateGame: async (gameId: string, data: Partial<{
    title: string
    genre: string
    description: string
    iconUrl: string
    coverUrl: string
    screenshots: string[]
    platforms: string[]
    status: 'active' | 'inactive'
  }>) => {
    const res = await apiClient.put(`/minihome/games/${gameId}`, data)
    return res.data as { game: MiniHomeGame }
  },

  removeGame: async (gameId: string) => {
    const res = await apiClient.delete(`/minihome/games/${gameId}`)
    return res.data
  },

  setRepresentative: async (gameId: string) => {
    const res = await apiClient.put(`/minihome/representative/${gameId}`, {})
    return res.data
  },

  createNews: async (data: { type: 'game' | 'company'; title: string; content: string }) => {
    const res = await apiClient.post('/minihome/news', data)
    return res.data as { news: MiniHomeNews }
  },

  sendProposal: async (data: {
    type: 'investment' | 'publishing'
    toMinihomeId: string
    gameId?: string
    title: string
    content: string
  }) => {
    const res = await apiClient.post('/minihome/proposals', data)
    return res.data as { proposal: Proposal }
  },

  getMyProposals: async (params?: { page?: number; limit?: number; type?: string; direction?: string }) => {
    const res = await apiClient.get('/minihome/proposals/me', { params })
    return res.data as { proposals: Proposal[]; total: number; page: number; totalPages: number }
  },

  updateProposalStatus: async (id: string, data: { status: 'accepted' | 'rejected' }) => {
    const res = await apiClient.patch(`/minihome/proposals/${id}/status`, data)
    return res.data as { proposal: Proposal }
  },

  admin: {
    getList: async (params?: { page?: number; limit?: number; search?: string; from?: string; to?: string; visibility?: string }) => {
      const res = await apiClient.get('/admin/minihome', { params })
      return res.data as { minihomes: MiniHome[]; total: number; page: number; totalPages: number }
    },

    updateVisibility: async (id: string, isPublic: boolean) => {
      const res = await apiClient.patch(`/admin/minihome/${id}/visibility`, { isPublic })
      return res.data
    },

    updateRecommended: async (id: string, isRecommended: boolean) => {
      const res = await apiClient.patch(`/admin/minihome/${id}/recommended`, { isRecommended })
      return res.data
    },

    delete: async (id: string) => {
      const res = await apiClient.delete(`/admin/minihome/${id}`)
      return res.data
    },

    getKeywordGroups: async () => {
      const res = await apiClient.get('/admin/minihome/keywords')
      return res.data as { groups: KeywordGroup[] }
    },

    createKeywordGroup: async (data: { name: string; keywords?: { name: string; isActive: boolean }[]; sortOrder?: number }) => {
      const res = await apiClient.post('/admin/minihome/keywords', data)
      return res.data.group as KeywordGroup
    },

    updateKeywordGroup: async (id: string, data: { name?: string; keywords?: { name: string; isActive: boolean }[]; sortOrder?: number }) => {
      const res = await apiClient.put(`/admin/minihome/keywords/${id}`, data)
      return res.data
    },

    deleteKeywordGroup: async (id: string) => {
      const res = await apiClient.delete(`/admin/minihome/keywords/${id}`)
      return res.data
    },

    reorderKeywordGroups: async (groups: { id: string; sortOrder: number }[]) => {
      const res = await apiClient.put('/admin/minihome/keywords/reorder', { groups })
      return res.data
    },
  },
}

export default minihomeService
