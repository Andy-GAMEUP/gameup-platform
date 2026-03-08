'use client'
import apiClient from './api'

export interface PartnerProfile {
  _id: string
  userId: { _id: string; username: string; role: string; profileImage?: string }
  status: string
  slogan: string
  introduction: string
  selectedTopics: string[]
  profileImage: string
  postCount: number
  approvedAt?: string
  createdAt: string
}

export interface PartnerPostItem {
  _id: string
  partnerId: { _id: string; userId: { _id: string; username: string; role: string } } | string
  author: { _id: string; username: string; role: string }
  title: string
  content: string
  topicGroup: string
  topic: string
  images: string[]
  tags: string[]
  views: number
  likes: string[]
  likeCount: number
  commentCount: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface PartnerApplication {
  _id: string
  userId: { _id: string; username: string; email: string; level?: number; profileImage?: string; createdAt: string }
  status: 'pending' | 'approved' | 'suspended' | 'rejected'
  slogan: string
  introduction: string
  activityPlan: string
  externalUrl: string
  selectedTopics: string[]
  profileImage: string
  postCount: number
  approvedAt?: string
  rejectedReason?: string
  createdAt: string
  updatedAt: string
}

export interface TopicItem {
  name: string
  isActive: boolean
}

export interface TopicGroup {
  _id: string
  name: string
  sortOrder: number
  topics: TopicItem[]
  createdAt: string
  updatedAt: string
}

export const partnerService = {
  apply: async (data: {
    introduction: string
    activityPlan: string
    slogan?: string
    externalUrl?: string
    selectedTopics?: string[]
    profileImage?: string
  }) => {
    const res = await apiClient.post('/partner/apply', data)
    return res.data
  },

  getMyStatus: async () => {
    const res = await apiClient.get('/partner/status')
    return res.data
  },

  getPartnerSlogan: async (partnerId: string) => {
    const res = await apiClient.get(`/partner/${partnerId}/slogan`)
    return res.data
  },

  updateSlogan: async (slogan: string) => {
    const res = await apiClient.put('/partner/slogan', { slogan })
    return res.data
  },

  getTopics: async () => {
    const res = await apiClient.get('/partner/topics')
    return res.data
  },

  getPartners: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get('/partner/list', { params })
    return res.data as { partners: PartnerProfile[]; total: number; page: number; totalPages: number }
  },

  getPartnerChannel: async (partnerId: string) => {
    const res = await apiClient.get(`/partner/${partnerId}`)
    return res.data as { partner: PartnerProfile }
  },

  getPartnerPosts: async (partnerId: string, params?: { page?: number; limit?: number; topic?: string; sort?: string }) => {
    const res = await apiClient.get(`/partner/${partnerId}/posts`, { params })
    return res.data as { posts: PartnerPostItem[]; total: number; page: number; totalPages: number }
  },

  getPartnerPost: async (id: string) => {
    const res = await apiClient.get(`/partner/posts/${id}`)
    return res.data as { post: PartnerPostItem }
  },

  createPartnerPost: async (data: { title: string; content: string; topicGroup?: string; topic?: string; images?: string[]; tags?: string[] }) => {
    const res = await apiClient.post('/partner/posts', data)
    return res.data as { post: PartnerPostItem }
  },

  updatePartnerPost: async (id: string, data: Partial<{ title: string; content: string; topicGroup: string; topic: string; images: string[]; tags: string[] }>) => {
    const res = await apiClient.put(`/partner/posts/${id}`, data)
    return res.data as { post: PartnerPostItem }
  },

  deletePartnerPost: async (id: string) => {
    const res = await apiClient.delete(`/partner/posts/${id}`)
    return res.data
  },

  togglePartnerPostLike: async (id: string) => {
    const res = await apiClient.post(`/partner/posts/${id}/like`)
    return res.data as { liked: boolean; likeCount: number }
  },

  admin: {
    getRequests: async (params?: { page?: number; limit?: number; status?: string; from?: string; to?: string }) => {
      const res = await apiClient.get('/admin/partner/requests', { params })
      return res.data
    },

    getRequestDetail: async (id: string) => {
      const res = await apiClient.get(`/admin/partner/requests/${id}`)
      return res.data
    },

    updateRequest: async (id: string, data: { status: string; rejectedReason?: string }) => {
      const res = await apiClient.patch(`/admin/partner/requests/${id}`, data)
      return res.data
    },

    deleteRequest: async (id: string) => {
      const res = await apiClient.delete(`/admin/partner/requests/${id}`)
      return res.data
    },

    getPartners: async (params?: { page?: number; limit?: number; search?: string }) => {
      const res = await apiClient.get('/admin/partner/list', { params })
      return res.data
    },

    getPartnerDetail: async (id: string) => {
      const res = await apiClient.get(`/admin/partner/${id}`)
      return res.data
    },

    updatePartnerStatus: async (id: string, status: 'approved' | 'suspended') => {
      const res = await apiClient.patch(`/admin/partner/${id}/status`, { status })
      return res.data
    },

    getPartnerPosts: async (partnerId: string, params?: { page?: number; limit?: number }) => {
      const res = await apiClient.get(`/admin/partner/${partnerId}/posts`, { params })
      return res.data
    },

    deletePartnerPost: async (id: string) => {
      const res = await apiClient.delete(`/admin/partner/posts/${id}`)
      return res.data
    },

    getTopicGroups: async () => {
      const res = await apiClient.get('/admin/partner/topics')
      return res.data
    },

    createTopicGroup: async (data: { name: string; topics?: TopicItem[]; sortOrder?: number }) => {
      const res = await apiClient.post('/admin/partner/topics', data)
      return res.data
    },

    updateTopicGroup: async (id: string, data: { name?: string; topics?: TopicItem[]; sortOrder?: number }) => {
      const res = await apiClient.put(`/admin/partner/topics/${id}`, data)
      return res.data
    },

    deleteTopicGroup: async (id: string) => {
      const res = await apiClient.delete(`/admin/partner/topics/${id}`)
      return res.data
    },

    reorderTopicGroups: async (groups: { id: string; sortOrder: number }[]) => {
      const res = await apiClient.put('/admin/partner/topics/reorder', { groups })
      return res.data
    },
  },
}

export default partnerService
