'use client'
import apiClient from './api'

export interface AppNotification {
  _id: string; userId: string; type: 'notice' | 'publishing' | 'comment' | 'follow' | 'proposal' | 'system'
  title: string; content: string; linkUrl: string; isRead: boolean; createdAt: string
}

export const notificationService = {
  getNotifications: async (params?: { page?: number; limit?: number; type?: string }) => { const r = await apiClient.get('/notifications', { params }); return r.data },
  getUnreadCount: async (): Promise<{ count: number }> => { const r = await apiClient.get('/notifications/unread-count'); return r.data },
  markAsRead: async (id: string) => { const r = await apiClient.put(`/notifications/${id}/read`); return r.data },
  markAllAsRead: async () => { const r = await apiClient.put('/notifications/read-all'); return r.data },
  admin: {
    getNotifications: async (params?: { page?: number; limit?: number }) => { const r = await apiClient.get('/admin/notifications', { params }); return r.data },
    sendNotification: async (data: { userIds?: string[]; type: string; title: string; content: string; linkUrl?: string; broadcast?: boolean }) => { const r = await apiClient.post('/admin/notifications/send', data); return r.data },
  },
}
export default notificationService
