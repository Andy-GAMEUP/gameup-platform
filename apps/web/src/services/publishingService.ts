'use client'
import apiClient from './api'

export type PublishingType = 'hms' | 'hk'

export interface PublishingBanner {
  _id: string
  publishingType: PublishingType
  title: string
  imageUrl: string
  linkUrl: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PublishingTab {
  _id: string
  publishingType: PublishingType
  name: string
  content: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PublishingSuggest {
  _id: string
  publishingType: PublishingType
  userId: { _id: string; username: string; email: string; profileImage?: string }
  gameName: string
  gameDescription: string
  appIcon: string
  coverImage: string
  screenshots: string[]
  buildUrl: string
  additionalServices: string[]
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  adminNote: string
  createdAt: string
  updatedAt: string
}

export interface FeaturedGame {
  _id: string
  title: string
  description: string
  genre: string
  thumbnail?: string
  rating: number
  playCount: number
  developerId: { _id: string; username: string }
  createdAt: string
}

export interface PublishingLanding {
  banners: PublishingBanner[]
  tabs: PublishingTab[]
  featuredGames: FeaturedGame[]
}

export const publishingService = {
  getLanding: async (type: PublishingType): Promise<PublishingLanding> => {
    const res = await apiClient.get(`/publishing/${type}`)
    return res.data
  },

  getGame: async (type: PublishingType, gameId: string) => {
    const res = await apiClient.get(`/publishing/${type}/games/${gameId}`)
    return res.data as { game: FeaturedGame }
  },

  createSuggest: async (
    type: PublishingType,
    data: {
      gameName: string
      gameDescription: string
      appIcon?: string
      coverImage?: string
      screenshots?: string[]
      buildUrl?: string
      additionalServices?: string[]
    }
  ) => {
    const res = await apiClient.post(`/publishing/${type}/suggest`, data)
    return res.data
  },

  getMyGames: async (type: PublishingType) => {
    const res = await apiClient.get(`/publishing/${type}/my-games`)
    return res.data as { suggests: PublishingSuggest[] }
  },

  getMySuggests: async () => {
    const res = await apiClient.get('/publishing/my-suggests')
    return res.data as { suggests: PublishingSuggest[] }
  },

  admin: {
    getSuggests: async (
      type: PublishingType,
      params?: { page?: number; limit?: number; status?: string }
    ) => {
      const res = await apiClient.get(`/admin/publishing/${type}/suggests`, { params })
      return res.data as {
        suggests: PublishingSuggest[]
        total: number
        page: number
        totalPages: number
      }
    },

    getSuggestDetail: async (id: string) => {
      const res = await apiClient.get(`/admin/publishing/suggests/${id}`)
      return res.data as { suggest: PublishingSuggest }
    },

    updateSuggest: async (id: string, data: { status?: string; adminNote?: string }) => {
      const res = await apiClient.patch(`/admin/publishing/suggests/${id}`, data)
      return res.data
    },

    deleteSuggest: async (id: string) => {
      const res = await apiClient.delete(`/admin/publishing/suggests/${id}`)
      return res.data
    },

    getBanners: async (type: PublishingType) => {
      const res = await apiClient.get(`/admin/publishing/${type}/banners`)
      return res.data as { banners: PublishingBanner[] }
    },

    createBanner: async (
      type: PublishingType,
      data: { title: string; imageUrl: string; linkUrl?: string; isActive?: boolean }
    ) => {
      const res = await apiClient.post(`/admin/publishing/${type}/banners`, data)
      return res.data
    },

    updateBanner: async (
      id: string,
      data: { title?: string; imageUrl?: string; linkUrl?: string; isActive?: boolean }
    ) => {
      const res = await apiClient.put(`/admin/publishing/banners/${id}`, data)
      return res.data
    },

    deleteBanner: async (id: string) => {
      const res = await apiClient.delete(`/admin/publishing/banners/${id}`)
      return res.data
    },

    reorderBanners: async (type: PublishingType, banners: { id: string; sortOrder: number }[]) => {
      const res = await apiClient.put(`/admin/publishing/${type}/banners/reorder`, { banners })
      return res.data
    },

    getTabs: async (type: PublishingType) => {
      const res = await apiClient.get(`/admin/publishing/${type}/tabs`)
      return res.data as { tabs: PublishingTab[] }
    },

    createTab: async (
      type: PublishingType,
      data: { name: string; content?: string; isActive?: boolean }
    ) => {
      const res = await apiClient.post(`/admin/publishing/${type}/tabs`, data)
      return res.data
    },

    updateTab: async (
      id: string,
      data: { name?: string; content?: string; isActive?: boolean }
    ) => {
      const res = await apiClient.put(`/admin/publishing/tabs/${id}`, data)
      return res.data
    },

    deleteTab: async (id: string) => {
      const res = await apiClient.delete(`/admin/publishing/tabs/${id}`)
      return res.data
    },

    reorderTabs: async (type: PublishingType, tabs: { id: string; sortOrder: number }[]) => {
      const res = await apiClient.put(`/admin/publishing/${type}/tabs/reorder`, { tabs })
      return res.data
    },
  },
}

export default publishingService
