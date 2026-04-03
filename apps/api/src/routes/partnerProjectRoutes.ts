import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import {
  getProjects,
  getProjectStats,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  applyToProject,
  getProjectApplicants,
  updateApplicationStatus,
  getMyApplications,
  getMyProjects,
  getPartnerActivity,
} from '../controllers/partnerProjectController'

const router = Router()

// 파트너 활동 이력 확인
router.get('/partner/activity', authenticateToken, getPartnerActivity)

// 프로젝트 목록 & 통계
router.get('/partner/projects', getProjects)
router.get('/partner/projects/stats', getProjectStats)
router.get('/partner/projects/me', authenticateToken, getMyProjects)

// 지원 관련
router.get('/partner/applications/me', authenticateToken, getMyApplications)

// 프로젝트 CRUD
router.post('/partner/projects', authenticateToken, createProject)
router.get('/partner/projects/:id', getProjectById)
router.put('/partner/projects/:id', authenticateToken, updateProject)
router.delete('/partner/projects/:id', authenticateToken, deleteProject)

// 지원 & 지원자 관리
router.post('/partner/projects/:id/apply', authenticateToken, applyToProject)
router.get('/partner/projects/:id/applicants', authenticateToken, getProjectApplicants)
router.patch('/partner/projects/:id/applicants/:appId', authenticateToken, updateApplicationStatus)

export default router
