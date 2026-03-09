import { Router } from 'express'
import {
  getMyRooms,
  getOrCreateRoom,
  getRoomMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  deleteRoom,
} from '../controllers/messageController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/messages/rooms', authenticateToken, getMyRooms)
router.post('/messages/rooms', authenticateToken, getOrCreateRoom)
router.get('/messages/rooms/:roomId', authenticateToken, getRoomMessages)
router.post('/messages/send', authenticateToken, sendMessage)
router.put('/messages/read', authenticateToken, markAsRead)
router.delete('/messages/:id', authenticateToken, deleteMessage)
router.delete('/messages/rooms/:roomId', authenticateToken, deleteRoom)

export default router
