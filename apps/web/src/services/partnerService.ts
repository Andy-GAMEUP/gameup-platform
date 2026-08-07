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
  isProfilePublic: boolean
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

export interface PartnerMinihomeInfo {
  _id: string
  userId: string
  companyName: string
  introduction: string
  isPublic: boolean
  location: string
  contactEmail: string
  contactPhone: string
  website: string
  hourlyRate: string
  rating: number
  reviewCount: number
  completedProjectCount: number
  isVerified: boolean
}

export interface PartnerApplication {
  _id: string
  userId: {
    _id: string; username: string; email: string; level?: number; profileImage?: string; createdAt: string; memberType?: string
    companyInfo?: { companyName?: string; companyType?: string[]; employeeCount?: number; businessNumber?: string; description?: string }
    contactPerson?: { name?: string; email?: string; phone?: string }
  }
  status: 'pending' | 'approved' | 'suspended' | 'rejected'
  slogan: string
  introduction: string
  externalUrl: string
  selectedTopics: string[]
  profileImage: string
  postCount: number
  isProfilePublic: boolean
  minihome?: PartnerMinihomeInfo | null
  approvedAt?: string
  rejectedReason?: string
  createdAt: string
  updatedAt: string
}

export interface PartnerGameItem {
  _id: string
  partnerId: string
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

export interface PartnerMessageItem {
  _id: string
  partnerId?: string
  senderId: { _id: string; username: string; profileImage?: string; companyName?: string | null; partnerChannelId?: string | null }
  recipientUserId?: string
  parentId?: string | null
  rootId?: string
  content: string
  createdAt: string
  threadStatus?: 'open' | 'closed' | 'deleted'
  threadClosedByMe?: boolean
  permanentlyDeletedByMe?: boolean
  counterpartPermanentlyDeleted?: boolean
  // getReceivedMessages 결과에서만 쓰임 — senderId는 항상 "상대방" 정보로 채워지므로,
  // 실제로 내가 보낸 메시지인지는 이 필드로 구분한다
  isOutgoing?: boolean
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
    slogan?: string
    externalUrl?: string
    selectedTopics?: string[]
    profileImage?: string
    techStack?: string[]
    portfolioUrls?: string[]
    careerYears?: number
    completedProjectCount?: number
    teamSize?: string
    genres?: string[]
    preferredProjectSize?: string
    contractTypes?: string[]
    budgetRange?: string
    availableDuration?: string
    workStyle?: string
  }) => {
    const res = await apiClient.post('/partner/apply', data)
    return res.data
  },

  getMyStatus: async () => {
    const res = await apiClient.get('/partner/status')
    return res.data
  },

  updateMyProfile: async (data: Record<string, unknown>) => {
    const res = await apiClient.put('/partner/me', data)
    return res.data
  },

  uploadImages: async (files: File[]) => {
    const formData = new FormData()
    files.forEach(f => formData.append('partnerImages', f))
    const res = await apiClient.post('/partner/upload-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { success: boolean; images: string[] }
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
    return res.data as { partner: PartnerProfile; games: PartnerGameItem[] }
  },

  toggleProfileVisibility: async (partnerId: string) => {
    const res = await apiClient.patch(`/partner/${partnerId}/visibility`)
    return res.data as { success: boolean; isProfilePublic: boolean }
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

  searchUsers: async (q: string) => {
    const res = await apiClient.get('/partner/users/search', { params: { q } })
    return res.data as { users: { _id: string; username: string; email: string; profileImage?: string }[] }
  },

  getTeamMembers: async (partnerId: string) => {
    const res = await apiClient.get(`/partner/${partnerId}/team`)
    return res.data as { teamMembers: { userId: { _id: string; username: string; role: string; profileImage?: string }; addedAt: string }[] }
  },

  addTeamMember: async (partnerId: string, username: string) => {
    const res = await apiClient.post(`/partner/${partnerId}/team`, { username })
    return res.data
  },

  removeTeamMember: async (partnerId: string, memberId: string) => {
    const res = await apiClient.delete(`/partner/${partnerId}/team/${memberId}`)
    return res.data
  },

  sendApplicationMessage: async (appId: string, content: string) => {
    const res = await apiClient.post(`/partner/applications/${appId}/message`, { content })
    return res.data as { message: string; data: PartnerMessageItem }
  },

  getReceivedMessages: async () => {
    const res = await apiClient.get('/partner/messages/received')
    return res.data as { messages: PartnerMessageItem[] }
  },

  replyToMessage: async (messageId: string, content: string) => {
    const res = await apiClient.post(`/partner/messages/${messageId}/reply`, { content })
    return res.data as { message: string; data: PartnerMessageItem }
  },

  getMessageThreadByApplication: async (appId: string) => {
    const res = await apiClient.get(`/partner/applications/${appId}/messages`)
    return res.data as { messages: PartnerMessageItem[] }
  },

  closeMessageThread: async (rootId: string) => {
    const res = await apiClient.post(`/partner/messages/thread/${rootId}/close`)
    return res.data as { message: string }
  },

  restoreMessageThread: async (rootId: string) => {
    const res = await apiClient.post(`/partner/messages/thread/${rootId}/restore`)
    return res.data as { message: string }
  },

  deleteMessageThread: async (rootId: string) => {
    const res = await apiClient.post(`/partner/messages/thread/${rootId}/delete`)
    return res.data as { message: string }
  },

  admin: {
    getRequests: async (params?: { page?: number; limit?: number; status?: string; from?: string; to?: string; search?: string; companyType?: string }) => {
      const res = await apiClient.get('/admin/partner/requests', { params })
      return res.data
    },

    updateRequest: async (id: string, data: { status: string; rejectedReason?: string }) => {
      const res = await apiClient.patch(`/admin/partner/requests/${id}`, data)
      return res.data
    },

    getPartners: async (params?: { page?: number; limit?: number; search?: string; sort?: string; status?: string }) => {
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

    togglePartnerVisibility: async (id: string) => {
      const res = await apiClient.patch(`/admin/partner/${id}/visibility`)
      return res.data
    },

    updatePartnerProfile: async (id: string, data: Partial<{
      slogan: string; introduction: string; externalUrl: string; selectedTopics: string[]; profileImage: string
      displayNameOverride: string
      location: string; contactEmail: string; contactPhone: string; website: string; hourlyRate: string
    }>) => {
      const res = await apiClient.put(`/admin/partner/${id}/profile`, data)
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

    reorderPosts: async (posts: { id: string; sortOrder: number }[]) => {
      const res = await apiClient.put('/admin/partner/posts/reorder', { posts })
      return res.data
    },

    getProjects: async (params?: {
      page?: number; limit?: number; search?: string;
      category?: string; status?: string; sort?: string;
    }) => {
      const res = await apiClient.get('/admin/partner/projects', { params })
      return res.data
    },

    getProjectStats: async () => {
      const res = await apiClient.get('/admin/partner/projects/stats')
      return res.data
    },

    getProjectApplicants: async (id: string) => {
      const res = await apiClient.get(`/admin/partner/projects/${id}/applicants`)
      return res.data
    },

    getDeletedProjects: async (params?: { page?: number; limit?: number; search?: string }) => {
      const res = await apiClient.get('/admin/partner/projects/deleted', { params })
      return res.data
    },

    restoreProject: async (id: string) => {
      const res = await apiClient.post(`/admin/partner/projects/deleted/${id}/restore`)
      return res.data
    },

    deleteProjectLog: async (id: string) => {
      const res = await apiClient.delete(`/admin/partner/projects/deleted/${id}`)
      return res.data
    },

    getApprovedPartners: async () => {
      const res = await apiClient.get('/admin/partner/list', { params: { status: 'approved', limit: 100 } })
      return res.data as { partners: any[]; total: number }
    },

    addTeamMember: async (partnerId: string, userId: string) => {
      const res = await apiClient.post(`/admin/partner/${partnerId}/team`, { userId })
      return res.data
    },

    removeTeamMemberByUser: async (userId: string) => {
      const res = await apiClient.delete(`/admin/partner/team-member/${userId}`)
      return res.data
    },
  },
}

export default partnerService
