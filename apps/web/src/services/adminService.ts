'use client'
import apiClient from './api'

export interface AdminStats {
  users: { total: number; developers: number; players: number; banned: number }
  games: { total: number; pending: number; approved: number; rejected: number; archived: number; published: number }
  totalPlayCount: number
}

export interface AdminUser {
  _id: string
  email: string
  username: string
  role: 'developer' | 'player' | 'admin'
  isActive: boolean
  bannedUntil?: string
  banReason?: string
  createdAt: string
}

export interface AdminGame {
  _id: string
  title: string
  genre: string
  status: string
  approvalStatus: string
  playCount: number
  rating: number
  developerId: { _id: string; username: string; email: string }
  betaEndDate?: string
  archivedAt?: string
  archiveReason?: string
  rejectionReason?: string
  adminNote?: string
  createdAt: string
}

export interface Announcement {
  _id: string
  title: string
  content: string
  type: 'notice' | 'event' | 'maintenance' | 'update'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  isPinned: boolean
  isPublished: boolean
  publishedAt?: string
  expiresAt?: string
  targetRole: 'all' | 'developer' | 'player'
  authorId: { _id: string; username: string }
  createdAt: string
}

export interface VisitorStatsParams {
  startDate?: string
  endDate?: string
  period?: string
  platform?: string
}

export interface MenuStatsParams {
  menu?: string
  startDate?: string
  endDate?: string
  platform?: string
}

export interface IndividualMembersParams {
  page?: number
  limit?: number
  search?: string
  startDate?: string
  endDate?: string
  status?: string
  levelMin?: number
  levelMax?: number
  sortBy?: string
  sortOrder?: string
}

export interface CorporateMembersParams {
  page?: number
  limit?: number
  search?: string
  startDate?: string
  endDate?: string
  status?: string
  sortBy?: string
  sortOrder?: string
}

export interface ActivityScoresParams {
  page?: number
  limit?: number
  search?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: string
}

export interface LevelData {
  level: number
  name: string
  minScore: number
  icon?: string
  memberCount?: number
}

export interface BulkNotifyData {
  userIds: string[]
  title: string
  message: string
  type?: string
}

export interface GrantScoreData {
  amount: number
  reason: string
}

export interface GrantPointsData {
  amount: number
  reason: string
}

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    const res = await apiClient.get('/admin/stats')
    return res.data
  },

  getUsers: async (params?: { page?: number; limit?: number; role?: string; search?: string; isActive?: boolean }) => {
    const res = await apiClient.get('/admin/users', { params })
    return res.data
  },

  updateUserRole: async (id: string, role: string) => {
    const res = await apiClient.patch(`/admin/users/${id}/role`, { role })
    return res.data
  },

  banUser: async (id: string, data: { isActive: boolean; banReason?: string; bannedUntil?: string }) => {
    const res = await apiClient.patch(`/admin/users/${id}/ban`, data)
    return res.data
  },

  getPendingGames: async (params?: { page?: number; limit?: number; approvalStatus?: string }) => {
    const res = await apiClient.get('/admin/games/pending', { params })
    return res.data
  },

  getAllGames: async (params?: { page?: number; limit?: number; status?: string; approvalStatus?: string; search?: string }) => {
    const res = await apiClient.get('/admin/games', { params })
    return res.data
  },

  approveGame: async (id: string, data: { action: 'approve' | 'reject' | 'review'; rejectionReason?: string; adminNote?: string }) => {
    const res = await apiClient.patch(`/admin/games/${id}/approve`, data)
    return res.data
  },

  controlGameStatus: async (id: string, data: { action: string; reason?: string }) => {
    const res = await apiClient.patch(`/admin/games/${id}/control`, data)
    return res.data
  },

  archiveGame: async (id: string, archiveReason?: string) => {
    const res = await apiClient.patch(`/admin/games/${id}/archive`, { archiveReason })
    return res.data
  },

  getGameMetrics: async (id: string) => {
    const res = await apiClient.get(`/admin/games/${id}/metrics`)
    return res.data
  },

  getAllReviews: async (params?: { page?: number; limit?: number; search?: string; isBlocked?: string; gameId?: string }) => {
    const res = await apiClient.get('/admin/reviews', { params })
    return res.data
  },

  blockReview: async (id: string, data: { isBlocked: boolean; blockReason?: string }) => {
    const res = await apiClient.patch(`/admin/reviews/${id}/block`, data)
    return res.data
  },

  deleteReview: async (id: string) => {
    const res = await apiClient.delete(`/admin/reviews/${id}`)
    return res.data
  },

  getAnnouncements: async (params?: { page?: number; limit?: number; type?: string; isPublished?: boolean }) => {
    const res = await apiClient.get('/admin/announcements', { params })
    return res.data
  },

  createAnnouncement: async (data: Partial<Announcement>) => {
    const res = await apiClient.post('/admin/announcements', data)
    return res.data
  },

  updateAnnouncement: async (id: string, data: Partial<Announcement>) => {
    const res = await apiClient.patch(`/admin/announcements/${id}`, data)
    return res.data
  },

  deleteAnnouncement: async (id: string) => {
    const res = await apiClient.delete(`/admin/announcements/${id}`)
    return res.data
  },

  getPublicAnnouncements: async () => {
    const res = await apiClient.get('/admin/announcements/public')
    return res.data
  },

  getAnalyticsDashboard: () =>
    apiClient.get('/admin/analytics/dashboard-summary').then(r => r.data),

  getVisitorStats: (params: VisitorStatsParams) =>
    apiClient.get('/admin/analytics/visitor-stats', { params }).then(r => r.data),

  getMenuStats: (params: MenuStatsParams) =>
    apiClient.get('/admin/analytics/menu-stats', { params }).then(r => r.data),

  getIndividualMembers: (params: IndividualMembersParams) =>
    apiClient.get('/admin/users-enhanced/individual', { params }).then(r => r.data),

  getCorporateMembers: (params: CorporateMembersParams) =>
    apiClient.get('/admin/users-enhanced/corporate', { params }).then(r => r.data),

  getUserDetail: (id: string) =>
    apiClient.get(`/admin/users-enhanced/${id}/detail`).then(r => r.data),

  updateUserDetail: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/admin/users-enhanced/${id}`, data).then(r => r.data),

  grantActivityScore: (id: string, data: GrantScoreData) =>
    apiClient.post(`/admin/users-enhanced/${id}/activity-score`, data).then(r => r.data),

  grantPoints: (id: string, data: GrantPointsData) =>
    apiClient.post(`/admin/users-enhanced/${id}/points`, data).then(r => r.data),

  bulkNotify: (data: BulkNotifyData) =>
    apiClient.post('/admin/users-enhanced/bulk-notify', data).then(r => r.data),

  getLevels: () =>
    apiClient.get('/admin/levels').then(r => r.data),

  updateLevels: (levels: LevelData[]) =>
    apiClient.post('/admin/levels', { levels }).then(r => r.data),

  getActivityScores: (params: ActivityScoresParams) =>
    apiClient.get('/admin/activity-scores', { params }).then(r => r.data),

  getTerms: (type: 'privacy' | 'service') =>
    apiClient.get('/admin/terms', { params: { type } }).then(r => r.data),

  updateTerms: (type: 'privacy' | 'service', content: string) =>
    apiClient.post('/admin/terms', { type, content }).then(r => r.data),
}

export default adminService
