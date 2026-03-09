'use client'
import apiClient from './api'

export interface ChatRoom {
  _id: string; participants: { _id: string; username: string; profileImage?: string }[]
  lastMessage: string; lastMessageAt: string; createdAt: string
}
export interface ChatMessage {
  _id: string; roomId: string; senderId: { _id: string; username: string; profileImage?: string }
  type: 'text' | 'image' | 'file'; content: string; fileName: string; isRead: boolean; createdAt: string
}

export const messageService = {
  getRooms: async () => { const r = await apiClient.get('/messages/rooms'); return r.data },
  getOrCreateRoom: async (targetUserId: string) => { const r = await apiClient.post('/messages/rooms', { targetUserId }); return r.data },
  getRoomMessages: async (roomId: string, params?: { page?: number; limit?: number }) => { const r = await apiClient.get(`/messages/rooms/${roomId}`, { params }); return r.data },
  sendMessage: async (data: { roomId: string; type?: string; content: string; fileName?: string }) => { const r = await apiClient.post('/messages/send', data); return r.data },
  markAsRead: async (roomId: string) => { const r = await apiClient.put('/messages/read', { roomId }); return r.data },
  deleteMessage: async (id: string) => { const r = await apiClient.delete(`/messages/${id}`); return r.data },
  deleteRoom: async (roomId: string) => { const r = await apiClient.delete(`/messages/rooms/${roomId}`); return r.data },
}
export default messageService
