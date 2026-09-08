import { Router } from 'express'
import {
  getMyRooms,
  getOrCreateRoom,
  getRoomMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  deleteRoom,
  getUnreadCount,
  closeRoom,
  uploadMessageImage,
} from '../controllers/messageController'
import { authenticateToken } from '../middleware/auth'
import { messageImageUpload } from '../middleware/upload'

const router = Router()

router.get('/messages/unread-count', authenticateToken, getUnreadCount)
router.get('/messages/rooms', authenticateToken, getMyRooms)
router.post('/messages/rooms', authenticateToken, getOrCreateRoom)
router.get('/messages/rooms/:roomId', authenticateToken, getRoomMessages)
router.post('/messages/send', authenticateToken, sendMessage)
router.post('/messages/upload-image', authenticateToken, messageImageUpload, uploadMessageImage)
router.put('/messages/read', authenticateToken, markAsRead)
router.put('/messages/rooms/:roomId/close', authenticateToken, closeRoom)
router.delete('/messages/:id', authenticateToken, deleteMessage)
router.delete('/messages/rooms/:roomId', authenticateToken, deleteRoom)

export default router
