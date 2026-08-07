'use client'
import apiClient from './api'

// 파트너 프로필 (Partner/내채널 기반)
export interface PartnerMatchingProfile {
  _id: string
  userId: {
    _id: string
    username: string
    companyInfo?: {
      companyName: string
      companyCategory?: string
      companyType: string[]
    }
    memberType: string
  }
  displayNameOverride: string
  introduction: string
  profileImage: string
  coverImage: string
  website: string
  tags: string[]
  keywords: string[]
  hourlyRate: string
  location: string
  isVerified: boolean
  rating: number
  reviewCount: number
  completedProjectCount: number
  portfolio: {
    _id: string
    title: string
    description: string
    imageUrl: string
    technologies: string[]
    results: string[]
    clientName: string
    duration: string
    completedAt: string
  }[]
  history: { _id: string; year: string; month: string; description: string }[]
  skills: { _id: string; name: string; experienceLevel: string }[]
  contactEmail: string
  contactPhone: string
  createdAt: string
}

// 프로젝트
export interface PartnerProjectItem {
  _id: string
  ownerId: {
    _id: string
    username: string
    companyInfo?: {
      companyName: string
      companyType: string[]
      employeeCount: number
    }
  }
  title: string
  description: string
  detailedDescription: string
  category: string
  status: string
  budget: string
  budgetMin: string
  budgetMax: string
  duration: string
  location: string
  startDate: string
  endDate: string
  requiredSkills: string[]
  requirements: string[]
  milestones: { _id: string; phase: string; period: string; description: string }[]
  applicationDeadline: string
  applicantCount: number
  createdAt: string
}

// 문의
export interface ProjectInquiryItem {
  _id: string
  projectId: string
  authorId: { _id: string; username: string; partnerChannelId?: string | null }
  content: string
  parentId: string | null
  isSecret: boolean
  isHidden: boolean
  createdAt: string
}

// 지원서
export interface ProjectApplicationItem {
  _id: string
  projectId: string | PartnerProjectItem
  applicantId: {
    _id: string
    username: string
    companyInfo?: { companyName: string; companyType: string[] }
    memberType: string
  }
  applicantName: string
  email: string
  phone: string
  experience: string
  proposedBudget: string
  title: string
  content: string
  attachments: string[]
  status: string
  createdAt: string
}

// 리뷰
export interface PartnerReviewItem {
  _id: string
  reviewerId: { _id: string; username: string; companyInfo?: { companyName: string } }
  targetMinihomeId: string
  projectId: string | null
  rating: number
  content: string
  projectTitle: string
  createdAt: string
}

export interface ProfileStats {
  total: number
  verified: number
  developers: number
  avgRating: number
}

export interface ProjectStats {
  total: number
  recruiting: number
  totalApplicants: number
  newThisWeek: number
}

export const partnerMatchingService = {
  // ── 파트너 프로필 ────────────────────────────────────────
  getPartnerProfiles: async (params?: {
    search?: string
    companyType?: string
    tab?: string
    page?: number
    limit?: number
    sort?: string
  }) => {
    const res = await apiClient.get('/partner/profiles', { params })
    return res.data
  },

  getPartnerProfileById: async (id: string) => {
    const res = await apiClient.get(`/partner/profiles/${id}`)
    return res.data
  },

  getPartnerStats: async (): Promise<{ success: boolean; stats: ProfileStats }> => {
    const res = await apiClient.get('/partner/profiles/stats')
    return res.data
  },

  // ── 리뷰 ────────────────────────────────────────────────
  getPartnerReviews: async (profileId: string, params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get(`/partner/profiles/${profileId}/reviews`, { params })
    return res.data
  },

  createPartnerReview: async (profileId: string, data: {
    rating: number
    content: string
    projectTitle?: string
  }) => {
    const res = await apiClient.post(`/partner/profiles/${profileId}/reviews`, data)
    return res.data
  },

  // ── 프로젝트 ────────────────────────────────────────────
  getProjects: async (params?: {
    search?: string
    category?: string
    status?: string
    tab?: string
    ownerType?: string
    page?: number
    limit?: number
  }) => {
    const res = await apiClient.get('/partner/projects', { params })
    return res.data
  },

  getProjectById: async (id: string) => {
    const res = await apiClient.get(`/partner/projects/${id}`)
    return res.data
  },

  getProjectStats: async (): Promise<{ success: boolean; stats: ProjectStats }> => {
    const res = await apiClient.get('/partner/projects/stats')
    return res.data
  },

  getMyProjects: async () => {
    const res = await apiClient.get('/partner/projects/me')
    return res.data
  },

  createProject: async (data: Partial<PartnerProjectItem>) => {
    const res = await apiClient.post('/partner/projects', data)
    return res.data
  },

  updateProject: async (id: string, data: Partial<PartnerProjectItem>) => {
    const res = await apiClient.put(`/partner/projects/${id}`, data)
    return res.data
  },

  deleteProject: async (id: string) => {
    const res = await apiClient.delete(`/partner/projects/${id}`)
    return res.data
  },

  // ── 지원 ────────────────────────────────────────────────
  applyToProject: async (projectId: string, data: {
    title: string
    content: string
  }) => {
    const res = await apiClient.post(`/partner/projects/${projectId}/apply`, data)
    return res.data
  },

  getProjectApplicants: async (projectId: string) => {
    const res = await apiClient.get(`/partner/projects/${projectId}/applicants`)
    return res.data
  },

  getMyProjectApplicants: async (): Promise<{ success: boolean; applicants: ProjectApplicationItem[] }> => {
    const res = await apiClient.get('/partner/projects/applicants/me')
    return res.data
  },

  updateApplicationStatus: async (projectId: string, appId: string, status: string) => {
    const res = await apiClient.patch(`/partner/projects/${projectId}/applicants/${appId}`, { status })
    return res.data
  },

  getMyApplications: async () => {
    const res = await apiClient.get('/partner/applications/me')
    return res.data
  },

  cancelApplication: async (appId: string) => {
    const res = await apiClient.delete(`/partner/applications/${appId}`)
    return res.data
  },

  getProjectsByUser: async (userId: string) => {
    const res = await apiClient.get(`/partner/projects/user/${userId}`)
    return res.data
  },

  getApplicationStatsByUser: async (userId: string): Promise<{ success: boolean; participatingCount: number; completedCount: number }> => {
    const res = await apiClient.get(`/partner/applications/user/${userId}/stats`)
    return res.data
  },

  // 파트너라운지 활동 이력 확인
  getPartnerActivity: async (): Promise<{ success: boolean; hasActivity: boolean }> => {
    const res = await apiClient.get('/partner/activity')
    return res.data
  },

  // ── 문의하기 ────────────────────────────────────────────────
  getProjectInquiries: async (projectId: string): Promise<{ success: boolean; inquiries: ProjectInquiryItem[] }> => {
    const res = await apiClient.get(`/partner/projects/${projectId}/inquiries`)
    return res.data
  },

  createProjectInquiry: async (projectId: string, content: string, parentId?: string, isSecret?: boolean) => {
    const res = await apiClient.post(`/partner/projects/${projectId}/inquiries`, { content, parentId, isSecret })
    return res.data
  },

  deleteProjectInquiry: async (projectId: string, inquiryId: string) => {
    const res = await apiClient.delete(`/partner/projects/${projectId}/inquiries/${inquiryId}`)
    return res.data
  },

  hideProjectInquiry: async (projectId: string, inquiryId: string) => {
    const res = await apiClient.patch(`/partner/projects/${projectId}/inquiries/${inquiryId}/hide`)
    return res.data
  },
}

export default partnerMatchingService
