import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { ChatRoomModel, MessageModel } from '@gameup/db'
import { emitToRoom } from '../socket'

export const getMyRooms = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const rooms = await ChatRoomModel.find({ participants: userId })
      .populate('participants', 'username profileImage')
      .sort({ lastMessageAt: -1 })
    res.json({ rooms })
  } catch {
    res.status(500).json({ message: '채팅방 목록 조회 실패' })
  }
}

export const getOrCreateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { targetUserId } = req.body
    if (!targetUserId) return res.status(400).json({ message: 'targetUserId는 필수입니다' })
    let room = await ChatRoomModel.findOne({
      participants: { $all: [userId, targetUserId], $size: 2 },
    }).populate('participants', 'username profileImage')
    if (!room) {
      room = new ChatRoomModel({ participants: [userId, targetUserId] })
      await room.save()
      room = await ChatRoomModel.findById(room._id).populate('participants', 'username profileImage')
    }
    res.json({ room })
  } catch {
    res.status(500).json({ message: '채팅방 생성 실패' })
  }
}

export const getRoomMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { roomId } = req.params
    const { page = 1, limit = 30 } = req.query
    const room = await ChatRoomModel.findById(roomId)
    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' })
    const isParticipant = room.participants.some((p) => p.toString() === userId)
    if (!isParticipant) return res.status(403).json({ message: '접근 권한이 없습니다' })
    const total = await MessageModel.countDocuments({ roomId, deletedBy: { $ne: userId } })
    const messages = await MessageModel.find({ roomId, deletedBy: { $ne: userId } })
      .populate('senderId', 'username profileImage')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ messages, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '메시지 조회 실패' })
  }
}

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { roomId, type, content, fileName } = req.body
    if (!roomId || !content) return res.status(400).json({ message: 'roomId와 content는 필수입니다' })
    const room = await ChatRoomModel.findById(roomId)
    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' })
    const isParticipant = room.participants.some((p) => p.toString() === userId)
    if (!isParticipant) return res.status(403).json({ message: '접근 권한이 없습니다' })
    const message = new MessageModel({
      roomId,
      senderId: userId,
      type: type || 'text',
      content,
      fileName: fileName || '',
    })
    await message.save()
    await ChatRoomModel.findByIdAndUpdate(roomId, {
      lastMessage: content,
      lastMessageAt: new Date(),
    })
    emitToRoom(roomId, 'new-message', message)
    res.status(201).json({ message })
  } catch {
    res.status(500).json({ message: '메시지 전송 실패' })
  }
}

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { roomId } = req.body
    if (!roomId) return res.status(400).json({ message: 'roomId는 필수입니다' })
    await MessageModel.updateMany(
      { roomId, senderId: { $ne: userId }, isRead: false },
      { isRead: true }
    )
    res.json({ message: '읽음 처리 완료' })
  } catch {
    res.status(500).json({ message: '읽음 처리 실패' })
  }
}

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const message = await MessageModel.findByIdAndUpdate(
      id,
      { $push: { deletedBy: userId } },
      { new: true }
    )
    if (!message) return res.status(404).json({ message: '메시지를 찾을 수 없습니다' })
    res.json({ message: '메시지 삭제 완료' })
  } catch {
    res.status(500).json({ message: '메시지 삭제 실패' })
  }
}

export const deleteRoom = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { roomId } = req.params
    const room = await ChatRoomModel.findById(roomId)
    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' })
    const isParticipant = room.participants.some((p) => p.toString() === userId)
    if (!isParticipant) return res.status(403).json({ message: '접근 권한이 없습니다' })
    await MessageModel.updateMany({ roomId }, { $push: { deletedBy: userId } })
    res.json({ message: '채팅방 삭제 완료' })
  } catch {
    res.status(500).json({ message: '채팅방 삭제 실패' })
  }
}
