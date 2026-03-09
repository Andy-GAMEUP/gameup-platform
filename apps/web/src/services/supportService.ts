'use client'
import apiClient from './api'

export interface Season {
  _id: string
  title: string
  status: 'draft' | 'recruiting' | 'in-progress' | 'completed'
  recruitingTitle: string
  recruitingDescription: string
  recruitingStartDate: string | null
  recruitingEndDate: string | null
  recruitingMaxCount: number
  progressTitle: string
  progressDescription: string
  progressStartDate: string | null
  progressEndDate: string | null
  completionTitle: string
  completionDescription: string
  completionDate: string | null
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

export interface GameApplication {
  _id: string
  seasonId: string
  userId: { _id: string; username: string; email: string; profileImage?: string }
  gameName: string
  genre: string
  description: string
  iconUrl: string
  introVideoUrl: string
  introImageUrl: string
  buildUrl: string
  screenshots: string[]
  platforms: string[]
  developmentSchedule: string
  status: 'pending' | 'reviewing' | 'selected' | 'rejected' | 'on-hold'
  isConfirmed: boolean
  adminNote: string
  score: { gameplay: number; design: number; sound: number; business: number; total: number }
  milestones: { title: string; date: string; description: string; buildUrl: string; isCompleted: boolean }[]
  supportPoints: number
  irDocumentUrl: string
  minihomeId: string | null
  selectedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SupportBanner {
  _id: string
  category: 'offseason' | 'season' | 'recruit'
  title: string
  imageUrl: string
  linkUrl: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export interface SupportTab {
  _id: string
  name: string
  content: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export const supportService = {
  getIntro: async (): Promise<{ banners: SupportBanner[]; tabs: SupportTab[] }> => {
    const res = await apiClient.get('/support/intro')
    return res.data
  },

  getCurrentSeason: async (): Promise<{ season: Season | null }> => {
    const res = await apiClient.get('/support/season/current')
    return res.data
  },

  getSeasonDetail: async (id: string): Promise<{ season: Season }> => {
    const res = await apiClient.get(`/support/season/${id}`)
    return res.data
  },

  getSelectedGames: async (
    seasonId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ games: GameApplication[]; total: number; page: number; totalPages: number }> => {
    const res = await apiClient.get(`/support/season/${seasonId}/games`, { params })
    return res.data
  },

  getGameDetail: async (id: string): Promise<{ game: GameApplication }> => {
    const res = await apiClient.get(`/support/games/${id}`)
    return res.data
  },

  applyGame: async (data: {
    seasonId: string
    gameName: string
    genre: string
    description: string
    iconUrl?: string
    introVideoUrl?: string
    introImageUrl?: string
    buildUrl?: string
    screenshots?: string[]
    platforms?: string[]
    developmentSchedule?: string
  }) => {
    const res = await apiClient.post('/support/apply', data)
    return res.data
  },

  getMyApplications: async (params?: {
    page?: number
    limit?: number
  }): Promise<{ applications: GameApplication[]; total: number; page: number; totalPages: number }> => {
    const res = await apiClient.get('/support/applications/me', { params })
    return res.data
  },

  uploadIr: async (id: string, data: { irDocumentUrl: string }) => {
    const res = await apiClient.put(`/support/applications/${id}/ir`, data)
    return res.data
  },

  admin: {
    getSeasons: async (params?: {
      page?: number
      limit?: number
    }): Promise<{ seasons: Season[]; total: number; page: number; totalPages: number }> => {
      const res = await apiClient.get('/admin/support/seasons', { params })
      return res.data
    },

    createSeason: async (data: {
      title: string
      recruitingTitle?: string
      recruitingDescription?: string
      recruitingStartDate?: string | null
      recruitingEndDate?: string | null
      recruitingMaxCount?: number
      progressTitle?: string
      progressDescription?: string
      progressStartDate?: string | null
      progressEndDate?: string | null
      completionTitle?: string
      completionDescription?: string
      completionDate?: string | null
      isVisible?: boolean
    }): Promise<{ season: Season }> => {
      const res = await apiClient.post('/admin/support/seasons', data)
      return res.data
    },

    updateSeason: async (
      id: string,
      data: Partial<Omit<Season, '_id' | 'createdAt' | 'updatedAt' | 'status'>>
    ): Promise<{ season: Season }> => {
      const res = await apiClient.put(`/admin/support/seasons/${id}`, data)
      return res.data
    },

    updateSeasonStatus: async (
      id: string,
      status: Season['status']
    ): Promise<{ season: Season }> => {
      const res = await apiClient.patch(`/admin/support/seasons/${id}/status`, { status })
      return res.data
    },

    deleteSeason: async (id: string) => {
      const res = await apiClient.delete(`/admin/support/seasons/${id}`)
      return res.data
    },

    getApplications: async (params?: {
      seasonId?: string
      page?: number
      limit?: number
      status?: string
    }): Promise<{ applications: GameApplication[]; total: number; page: number; totalPages: number }> => {
      const res = await apiClient.get('/admin/support/applications', { params })
      return res.data
    },

    getApplicationDetail: async (id: string): Promise<{ application: GameApplication }> => {
      const res = await apiClient.get(`/admin/support/applications/${id}`)
      return res.data
    },

    updateApplicationStatus: async (
      id: string,
      data: { status: GameApplication['status']; adminNote?: string }
    ) => {
      const res = await apiClient.patch(`/admin/support/applications/${id}/status`, data)
      return res.data
    },

    confirmApplication: async (id: string) => {
      const res = await apiClient.patch(`/admin/support/applications/${id}/confirm`, {})
      return res.data
    },

    scoreApplication: async (
      id: string,
      data: { gameplay: number; design: number; sound: number; business: number }
    ) => {
      const res = await apiClient.put(`/admin/support/applications/${id}/score`, data)
      return res.data
    },

    updateMilestone: async (
      id: string,
      index: number,
      data: { title?: string; date?: string; description?: string; buildUrl?: string; isCompleted?: boolean }
    ) => {
      const res = await apiClient.put(`/admin/support/applications/${id}/milestones/${index}`, data)
      return res.data
    },

    addMilestone: async (
      id: string,
      data: { title: string; date: string; description: string; buildUrl: string; isCompleted: boolean }
    ) => {
      const res = await apiClient.post(`/admin/support/applications/${id}/milestones`, data)
      return res.data
    },

    deleteMilestone: async (id: string, index: number) => {
      const res = await apiClient.delete(`/admin/support/applications/${id}/milestones/${index}`)
      return res.data
    },

    deleteApplication: async (id: string) => {
      const res = await apiClient.delete(`/admin/support/applications/${id}`)
      return res.data
    },

    getBanners: async (category: SupportBanner['category']): Promise<{ banners: SupportBanner[] }> => {
      const res = await apiClient.get(`/admin/support/banners/${category}`)
      return res.data
    },

    createBanner: async (
      category: SupportBanner['category'],
      data: { title: string; imageUrl: string; linkUrl?: string; isActive?: boolean }
    ): Promise<{ banner: SupportBanner }> => {
      const res = await apiClient.post(`/admin/support/banners/${category}`, data)
      return res.data
    },

    updateBanner: async (
      id: string,
      data: { title?: string; imageUrl?: string; linkUrl?: string; isActive?: boolean }
    ) => {
      const res = await apiClient.put(`/admin/support/banners/${id}`, data)
      return res.data
    },

    deleteBanner: async (id: string) => {
      const res = await apiClient.delete(`/admin/support/banners/${id}`)
      return res.data
    },

    reorderBanners: async (
      category: SupportBanner['category'],
      banners: { id: string; sortOrder: number }[]
    ) => {
      const res = await apiClient.put(`/admin/support/banners/${category}/reorder`, { banners })
      return res.data
    },

    getTabs: async (): Promise<{ tabs: SupportTab[] }> => {
      const res = await apiClient.get('/admin/support/tabs')
      return res.data
    },

    createTab: async (data: {
      name: string
      content?: string
      isActive?: boolean
    }): Promise<{ tab: SupportTab }> => {
      const res = await apiClient.post('/admin/support/tabs', data)
      return res.data
    },

    updateTab: async (
      id: string,
      data: { name?: string; content?: string; isActive?: boolean }
    ) => {
      const res = await apiClient.put(`/admin/support/tabs/${id}`, data)
      return res.data
    },

    deleteTab: async (id: string) => {
      const res = await apiClient.delete(`/admin/support/tabs/${id}`)
      return res.data
    },

    reorderTabs: async (tabs: { id: string; sortOrder: number }[]) => {
      const res = await apiClient.put('/admin/support/tabs/reorder', { tabs })
      return res.data
    },
  },
}

export default supportService
