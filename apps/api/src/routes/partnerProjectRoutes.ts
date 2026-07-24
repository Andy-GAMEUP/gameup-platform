import { Router } from 'express'
import { authenticateToken, optionalAuth } from '../middleware/auth'
import {
  getProjects,
  getProjectStats,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  applyToProject,
  getProjectApplicants,
  getMyProjectApplicants,
  updateApplicationStatus,
  getMyApplications,
  getMyProjects,
  getProjectsByUser,
  getApplicationStatsByUser,
  getPartnerActivity,
  getProjectInquiries,
  createProjectInquiry,
  deleteProjectInquiry,
  hideProjectInquiry,
} from '../controllers/partnerProjectController'

const router = Router()

// 파트너 활동 이력 확인
router.get('/partner/activity', authenticateToken, getPartnerActivity)

// 프로젝트 목록 & 통계
router.get('/partner/projects', getProjects)
router.get('/partner/projects/stats', getProjectStats)
router.get('/partner/projects/me', authenticateToken, getMyProjects)
router.get('/partner/projects/user/:userId', getProjectsByUser)
router.get('/partner/projects/applicants/me', authenticateToken, getMyProjectApplicants)

// 지원 관련
router.get('/partner/applications/me', authenticateToken, getMyApplications)
router.get('/partner/applications/user/:userId/stats', getApplicationStatsByUser)

// 프로젝트 CRUD
router.post('/partner/projects', authenticateToken, createProject)
router.get('/partner/projects/:id', getProjectById)
router.put('/partner/projects/:id', authenticateToken, updateProject)
router.delete('/partner/projects/:id', authenticateToken, deleteProject)

// 지원 & 지원자 관리
router.post('/partner/projects/:id/apply', authenticateToken, applyToProject)
router.get('/partner/projects/:id/applicants', authenticateToken, getProjectApplicants)
router.patch('/partner/projects/:id/applicants/:appId', authenticateToken, updateApplicationStatus)

// 문의하기
router.get('/partner/projects/:id/inquiries', optionalAuth, getProjectInquiries)
router.post('/partner/projects/:id/inquiries', authenticateToken, createProjectInquiry)
router.delete('/partner/projects/:id/inquiries/:inquiryId', authenticateToken, deleteProjectInquiry)
router.patch('/partner/projects/:id/inquiries/:inquiryId/hide', authenticateToken, hideProjectInquiry)

export default router
