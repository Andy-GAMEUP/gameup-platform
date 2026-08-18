'use client'
import apiClient from './api'

export interface PublicAnnouncement {
  _id: string
  title: string
  content: string
  type: 'notice' | 'event' | 'maintenance' | 'update'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  isPinned: boolean
  targetRole: 'all' | 'developer' | 'player'
  views: number
  images: string[]
  thumbnailIndex: number
  likes: string[]
  publishedAt?: string
  expiresAt?: string
  createdAt: string
  authorId?: { username: string; role: string; profileImage?: string }
}

export interface BannerDailyStat {
  date: string
  impressions: number
  clicks: number
  edits: number
}

export interface CommunityBanner {
  _id: string
  imageUrl: string
  linkUrl: string
  title: string
  sortOrder: number
  isActive: boolean
  position: 'community' | 'main' | 'event'
  dailyStats: BannerDailyStat[]
  createdAt: string
  updatedAt: string
}

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
  images: string[]
  thumbnailIndex: number
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
  period?: string
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
  approvalStatus?: string
  companyType?: string
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

export interface ReportedComment {
  _id: string
  content: string
  status: 'active' | 'hidden' | 'deleted'
  reportCount: number
  likes: string[]
  author: { _id: string; username: string; role: string } | null
  postId: { _id: string; title: string; channel: string } | null
  createdAt: string
  deletedAt?: string
}

export interface ReportedUser {
  _id: string
  username: string
  email: string
  role: string
  isActive: boolean
  bannedAt?: string
  banReason?: string
  banScope?: string[]
  bannedUntil?: string
  appeal?: { content: string; createdAt: string } | null
  history?: { type: string; content: string; createdAt: string }[]
  createdAt: string
  postReportCount: number
  reportedPostCount: number
  commentReportCount: number
  reportedCommentCount: number
  totalReportCount: number
}

export interface ReportReason {
  reason: string
  createdAt: string
  username: string | null
}

export interface ReportedPost {
  _id: string
  title: string
  content: string
  channel: string
  status: 'active' | 'hidden' | 'deleted'
  reportCount: number
  views: number
  likes: string[]
  commentCount: number
  author: { _id: string; username: string; email: string; role: string } | null
  gameId?: { _id: string; title: string } | null
  createdAt: string
  deletedAt?: string
  reports?: { userId?: { username: string } | string; reason: string; createdAt: string }[]
}

export interface ReportedAnnouncement {
  _id: string
  title: string
  category: string
  reportCount: number
  views: number
  likeCount: number
  commentCount: number
  author: null
  createdAt: string
  viewPath: string
  reports: ReportReason[]
}

export interface DeletedAnnouncement {
  _id: string
  kind: 'platform' | 'game'
  title: string
  category: string
  reportCount: number
  views: number
  likeCount: number
  commentCount: number
  author: null
  createdAt: string
  deletedAt: string
  viewPath: string
}

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    const res = await apiClient.get('/admin/stats')
    return res.data
  },

  getUsers: async (params?: { page?: number; limit?: number; role?: string; search?: string; isActive?: boolean; memberType?: string; isPartner?: boolean; approvalStatus?: string }) => {
    const res = await apiClient.get('/admin/users', { params })
    return res.data
  },

  approveUser: async (id: string, data: { approvalStatus: 'approved' | 'rejected' | 'pending'; rejectedReason?: string }) => {
    const res = await apiClient.patch(`/admin/users/${id}/approve`, data)
    return res.data
  },

  deleteUser: async (id: string) => {
    const res = await apiClient.delete(`/admin/users/${id}`)
    return res.data
  },

  getDeletedUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/admin/users/deleted', { params })
    return res.data
  },

  restoreUser: async (id: string) => {
    const res = await apiClient.post(`/admin/users/deleted/${id}/restore`)
    return res.data
  },

  deleteUserLog: async (id: string) => {
    const res = await apiClient.delete(`/admin/users/deleted/${id}`)
    return res.data
  },

  getPendingMemberCounts: async () => {
    const res = await apiClient.get('/admin/members/pending-counts')
    return res.data
  },

  createAdminUser: async (data: { email: string; username: string; password: string; adminLevel: 'super' | 'normal' | 'monitor' }) => {
    const res = await apiClient.post('/admin/users/create-admin', data)
    return res.data
  },

  updateUserRole: async (id: string, role: string) => {
    const res = await apiClient.patch(`/admin/users/${id}/role`, { role })
    return res.data
  },

  banUser: async (id: string, data: { isActive: boolean; banReason?: string; bannedUntil?: string; banDuration?: number; banScope?: string[] }) => {
    const res = await apiClient.patch(`/admin/users/${id}/ban`, data)
    return res.data
  },

  getPendingGames: async (params?: { page?: number; limit?: number; approvalStatus?: string }) => {
    const res = await apiClient.get('/admin/games/pending', { params })
    return res.data
  },

  getAllGames: async (params?: { page?: number; limit?: number; status?: string; approvalStatus?: string; search?: string; serviceType?: string; suspended?: string }) => {
    const res = await apiClient.get('/admin/games', { params })
    return res.data
  },

  getNewGameBanners: async () => {
    const res = await apiClient.get('/admin/community/banners?position=newgame')
    return res.data as { banners: CommunityBanner[] }
  },

  getAllNewGameBanners: async () => {
    const res = await apiClient.get('/admin/community/banners/all?position=newgame')
    return res.data as { banners: CommunityBanner[] }
  },

  uploadNewGameBanner: async (file: File, extra?: { linkUrl?: string; title?: string }) => {
    const form = new FormData()
    form.append('bannerImage', file)
    if (extra?.linkUrl) form.append('linkUrl', extra.linkUrl)
    if (extra?.title) form.append('title', extra.title)
    form.append('position', 'newgame')
    const res = await apiClient.post('/admin/community/banners', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { banner: CommunityBanner }
  },

  approveGame: async (id: string, data: { action: 'approve' | 'reject' | 'review'; rejectionReason?: string; adminNote?: string }) => {
    const res = await apiClient.patch(`/admin/games/${id}/approve`, data)
    return res.data
  },

  controlGameStatus: async (id: string, data: { action: string; reason?: string }) => {
    const res = await apiClient.patch(`/admin/games/${id}/control`, data)
    return res.data
  },

  approveShopReview: async (gameId: string) => {
    const res = await apiClient.post(`/admin/games/${gameId}/shop-review/approve`)
    return res.data
  },

  rejectShopReview: async (gameId: string) => {
    const res = await apiClient.post(`/admin/games/${gameId}/shop-review/reject`)
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

  getReportedUsers: async () => {
    const res = await apiClient.get('/admin/community/reported-users')
    return res.data as { users: ReportedUser[]; total: number }
  },

  getReportedPosts: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/admin/community/reported-posts', { params })
    return res.data as { posts: ReportedPost[]; total: number }
  },

  getReportedAnnouncements: async () => {
    const res = await apiClient.get('/admin/community/reported-announcements')
    return res.data as { announcements: ReportedAnnouncement[]; total: number }
  },

  updatePostStatus: async (id: string, data: { status: string; clearReports?: boolean; deletedByReport?: boolean }) => {
    const res = await apiClient.patch(`/admin/community/posts/${id}/status`, data)
    return res.data
  },

  getReportedComments: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/admin/community/reported-comments', { params })
    return res.data as { comments: ReportedComment[]; total: number }
  },

  adminCommentAction: async (id: string, data: { action: 'hide' | 'delete' | 'restore'; clearReports?: boolean }) => {
    const res = await apiClient.patch(`/admin/community/comments/${id}/action`, data)
    return res.data
  },

  getDeletedPosts: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/admin/community/deleted-posts', { params })
    return res.data as { posts: ReportedPost[]; total: number }
  },

  permanentlyDeletePost: async (id: string) => {
    const res = await apiClient.delete(`/admin/community/deleted-posts/${id}`)
    return res.data
  },

  getDeletedAnnouncements: async () => {
    const res = await apiClient.get('/admin/community/deleted-announcements')
    return res.data as { announcements: DeletedAnnouncement[]; total: number }
  },

  restoreAnnouncement: async (kind: 'platform' | 'game', id: string) => {
    const res = await apiClient.patch(`/admin/community/deleted-announcements/${kind}/${id}/restore`)
    return res.data
  },

  permanentlyDeleteAnnouncement: async (kind: 'platform' | 'game', id: string) => {
    const res = await apiClient.delete(`/admin/community/deleted-announcements/${kind}/${id}`)
    return res.data
  },

  getDeletedComments: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/admin/community/deleted-comments', { params })
    return res.data as { comments: ReportedComment[]; total: number }
  },

  getPublicAnnouncements: async () => {
    const res = await apiClient.get('/admin/announcements/public')
    return res.data
  },

  getPublicAnnouncementById: async (id: string) => {
    const res = await apiClient.get(`/admin/announcements/public/${id}`)
    return res.data as { announcement: PublicAnnouncement }
  },

  toggleAnnouncementLike: async (id: string) => {
    const res = await apiClient.post(`/admin/announcements/public/${id}/like`)
    return res.data as { liked: boolean; likeCount: number }
  },

  reportAnnouncement: async (id: string, reason: string) => {
    const res = await apiClient.post(`/admin/announcements/public/${id}/report`, { reason })
    return res.data as { success: boolean; message: string }
  },

  getCommunityBanners: async () => {
    const res = await apiClient.get('/admin/community/banners?position=community')
    return res.data as { banners: CommunityBanner[] }
  },

  getAllCommunityBanners: async () => {
    const res = await apiClient.get('/admin/community/banners/all?position=community')
    return res.data as { banners: CommunityBanner[] }
  },

  uploadCommunityBanner: async (file: File, extra?: { linkUrl?: string; title?: string }) => {
    const form = new FormData()
    form.append('bannerImage', file)
    if (extra?.linkUrl) form.append('linkUrl', extra.linkUrl)
    if (extra?.title) form.append('title', extra.title)
    form.append('position', 'community')
    const res = await apiClient.post('/admin/community/banners', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { banner: CommunityBanner }
  },

  getMainBanners: async () => {
    const res = await apiClient.get('/admin/community/banners?position=main')
    return res.data as { banners: CommunityBanner[] }
  },

  getAllMainBanners: async () => {
    const res = await apiClient.get('/admin/community/banners/all?position=main')
    return res.data as { banners: CommunityBanner[] }
  },

  uploadMainBanner: async (file: File, extra?: { linkUrl?: string; title?: string }) => {
    const form = new FormData()
    form.append('bannerImage', file)
    if (extra?.linkUrl) form.append('linkUrl', extra.linkUrl)
    if (extra?.title) form.append('title', extra.title)
    form.append('position', 'main')
    const res = await apiClient.post('/admin/community/banners', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { banner: CommunityBanner }
  },

  getEventBanners: async () => {
    const res = await apiClient.get('/admin/community/banners?position=event')
    return res.data as { banners: CommunityBanner[] }
  },

  getAllEventBanners: async () => {
    const res = await apiClient.get('/admin/community/banners/all?position=event')
    return res.data as { banners: CommunityBanner[] }
  },

  uploadEventBanner: async (file: File, extra?: { linkUrl?: string; title?: string }) => {
    const form = new FormData()
    form.append('bannerImage', file)
    if (extra?.linkUrl) form.append('linkUrl', extra.linkUrl)
    if (extra?.title) form.append('title', extra.title)
    form.append('position', 'event')
    const res = await apiClient.post('/admin/community/banners', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { banner: CommunityBanner }
  },

  updateCommunityBanner: async (id: string, data: Partial<CommunityBanner> & { file?: File }) => {
    const form = new FormData()
    if (data.file) form.append('bannerImage', data.file)
    if (data.linkUrl !== undefined) form.append('linkUrl', data.linkUrl)
    if (data.title !== undefined) form.append('title', data.title)
    if (data.isActive !== undefined) form.append('isActive', String(data.isActive))
    if (data.sortOrder !== undefined) form.append('sortOrder', String(data.sortOrder))
    const res = await apiClient.patch(`/admin/community/banners/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { banner: CommunityBanner }
  },

  deleteCommunityBanner: async (id: string) => {
    const res = await apiClient.delete(`/admin/community/banners/${id}`)
    return res.data
  },

  trackBannerEvent: async (id: string, type: 'impression' | 'click') => {
    await apiClient.post(`/admin/community/banners/${id}/track`, { type }).catch(() => {})
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

  updateCorporateApproval: (id: string, data: { approvalStatus: 'approved' | 'rejected'; rejectedReason?: string }) =>
    apiClient.patch(`/admin/users-enhanced/${id}/approval`, data).then(r => r.data),

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

  getPointPolicies: () =>
    apiClient.get('/admin/activity-scores/policies').then(r => r.data),

  updatePointPolicy: (id: string, data: { label?: string; description?: string; amount?: number; multiplier?: number; dailyLimit?: number | null; isActive?: boolean }) =>
    apiClient.put(`/admin/activity-scores/policies/${id}`, data).then(r => r.data),

  seedPointPolicies: () =>
    apiClient.post('/admin/activity-scores/policies/seed').then(r => r.data),

  getTerms: (type: 'privacy' | 'service') =>
    apiClient.get('/admin/terms', { params: { type } }).then(r => r.data),

  updateTerms: (type: 'privacy' | 'service', content: string) =>
    apiClient.post('/admin/terms', { type, content }).then(r => r.data),

  // ── 이벤트 배너 (EventBannerModel, 신청 기능 포함) ──────────────
  getSupportEventBanners: () =>
    apiClient.get('/admin/event-banners').then(r => r.data),

  createEventBanner: (data: { title: string; description?: string; imageUrl: string; linkUrl?: string }) =>
    apiClient.post('/admin/event-banners', data).then(r => r.data),

  updateEventBanner: (id: string, data: { title?: string; description?: string; imageUrl?: string; linkUrl?: string; isActive?: boolean }) =>
    apiClient.put(`/admin/event-banners/${id}`, data).then(r => r.data),

  deleteEventBanner: (id: string) =>
    apiClient.delete(`/admin/event-banners/${id}`).then(r => r.data),

  reorderEventBanners: (banners: { _id: string; sortOrder: number }[]) =>
    apiClient.put('/admin/event-banners/reorder', { banners }).then(r => r.data),

  getEventRegistrations: (params?: { eventBannerId?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/event-registrations', { params }).then(r => r.data),

  // ── 게임 포인트 정책 관리 ──────────────────────────────────────
  getGamePointPolicies: (params?: { status?: string; gameId?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/game-point-policies', { params }).then(r => r.data),

  approveGamePointPolicy: (id: string, adminNote?: string) =>
    apiClient.put(`/admin/game-point-policies/${id}/approve`, { adminNote }).then(r => r.data),

  rejectGamePointPolicy: (id: string, rejectionReason: string) =>
    apiClient.put(`/admin/game-point-policies/${id}/reject`, { rejectionReason }).then(r => r.data),

  toggleGamePointPolicy: (id: string) =>
    apiClient.put(`/admin/game-point-policies/${id}/toggle`).then(r => r.data),

  batchApproveGamePointPolicies: (ids: string[]) =>
    apiClient.post('/admin/game-point-policies/batch-approve', { ids }).then(r => r.data),

  batchRejectGamePointPolicies: (ids: string[], rejectionReason: string) =>
    apiClient.post('/admin/game-point-policies/batch-reject', { ids, rejectionReason }).then(r => r.data),

  // ── 개발사 잔액 관리 ──────────────────────────────────────────
  getDeveloperBalances: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/developer-balances', { params }).then(r => r.data),

  adjustDeveloperBalance: (developerId: string, data: { amount: number; type: 'admin_grant' | 'admin_deduct'; description: string }) =>
    apiClient.post(`/admin/developer-balances/${developerId}/adjust`, data).then(r => r.data),

  // ── 포인트 상품 관리 ──────────────────────────────────────────
  getPointPackages: () =>
    apiClient.get('/admin/point-packages').then(r => r.data),

  createPointPackage: (data: { name: string; points: number; price: number; description?: string; sortOrder?: number }) =>
    apiClient.post('/admin/point-packages', data).then(r => r.data),

  updatePointPackage: (id: string, data: Partial<{ name: string; points: number; price: number; description: string; sortOrder: number; isActive: boolean }>) =>
    apiClient.put(`/admin/point-packages/${id}`, data).then(r => r.data),

  restoreGame: (logId: string) =>
    apiClient.post(`/games/admin/deletion-logs/${logId}/restore`).then(r => r.data),
}

export default adminService
