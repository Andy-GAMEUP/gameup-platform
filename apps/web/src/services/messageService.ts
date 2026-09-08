'use client'
import apiClient from './api'

export interface ChatRoom {
  _id: string; participants: { _id: string; username: string; profileImage?: string; role?: string; companyInfo?: { companyCategory?: string; companyType?: string[] } }[]
  lastMessage: string; lastMessageAt: string; createdAt: string
  title?: string; content?: string; imageUrl?: string; category?: string; status?: 'open' | 'in_progress' | 'closed'
}
export interface ChatMessage {
  _id: string; roomId: string; senderId: { _id: string; username: string; profileImage?: string; role?: string }
  type: 'text' | 'image' | 'file'; content: string; fileName: string; isRead: boolean; createdAt: string
}

export const messageService = {
  getRooms: async () => { const r = await apiClient.get('/messages/rooms'); return r.data },
  getOrCreateRoom: async (data?: { targetUserId?: string; category?: string; title?: string; content?: string; imageUrl?: string }) => {
    const r = await apiClient.post('/messages/rooms', data || {})
    return r.data
  },
  getRoomMessages: async (roomId: string, params?: { page?: number; limit?: number }) => { const r = await apiClient.get(`/messages/rooms/${roomId}`, { params }); return r.data },
  sendMessage: async (data: { roomId: string; type?: string; content: string; fileName?: string }) => { const r = await apiClient.post('/messages/send', data); return r.data },
  markAsRead: async (roomId: string) => { const r = await apiClient.put('/messages/read', { roomId }); return r.data },
  deleteMessage: async (id: string) => { const r = await apiClient.delete(`/messages/${id}`); return r.data },
  deleteRoom: async (roomId: string) => { const r = await apiClient.delete(`/messages/rooms/${roomId}`); return r.data },
  closeRoom: async (roomId: string) => { const r = await apiClient.put(`/messages/rooms/${roomId}/close`); return r.data },
  getUnreadCount: async () => { const r = await apiClient.get('/messages/unread-count'); return r.data as { count: number } },
  uploadImage: async (file: File) => {
    const formData = new FormData()
    formData.append('messageImage', file)
    const r = await apiClient.post('/messages/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    return r.data as { success: boolean; url: string; fileName: string }
  },
}
export default messageService
