import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { ChatRoomModel, MessageModel, UserModel, INQUIRY_CATEGORIES } from '@gameup/db'
import { emitToRoom } from '../socket'

// 문의하기 채팅에 첨부할 이미지(스크린샷) 업로드 — URL만 반환, 메시지 생성은 /messages/send로 별도 호출
export const uploadMessageImage = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined
    if (!file) return res.status(400).json({ message: '이미지 파일을 첨부해주세요' })
    res.json({ success: true, url: `/uploads/messages/${file.filename}`, fileName: file.originalname })
  } catch {
    res.status(500).json({ message: '이미지 업로드 실패' })
  }
}

// 문의하기: 관리자가 아닌 사용자의 대화방은 전부 "1:1 문의" 용도이므로,
// 관리자는 자신이 참여자로 등록된 방이 아니어도 전체 문의함을 조회/응대할 수 있다
export const getMyRooms = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    // 본인이 목록에서 삭제한 문의방은 숨기되, 관리자는 삭제 여부와 무관하게 전부 조회 가능
    const query = req.user!.role === 'admin' ? {} : { participants: userId, deletedBy: { $ne: userId } }
    let rooms = await ChatRoomModel.find(query)
      .populate('participants', 'username profileImage role companyInfo.companyCategory companyInfo.companyType')
      .sort({ lastMessageAt: -1 })
    // 관리자에게는 실제로 관리자 계정이 참여자로 포함된 문의방만 노출한다
    if (req.user!.role === 'admin') {
      rooms = rooms.filter((r) => r.participants.some((p: any) => p.role === 'admin'))
    }
    res.json({ rooms })
  } catch {
    res.status(500).json({ message: '채팅방 목록 조회 실패' })
  }
}

export const getOrCreateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // 일반 사용자는 서로 DM할 수 없고 관리자에게 문의만 가능 — targetUserId를 무시하고 항상 관리자로 연결,
    // 문의는 매번 새 스레드로 생성한다 (기존 방 재사용 안 함)
    if (req.user!.role !== 'admin') {
      const { category, title, content, imageUrl } = req.body
      if (category && !INQUIRY_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: '카테고리 값이 올바르지 않습니다' })
      }
      const admin = await UserModel.findOne({ role: 'admin' }).sort({ createdAt: 1 }).select('_id')
      if (!admin) return res.status(500).json({ message: '문의를 받을 관리자 계정이 없습니다' })
      const trimmedContent = (content || '').trim()
      const newRoom = new ChatRoomModel({
        participants: [userId, admin._id],
        category: category || 'other',
        title: (title || '').trim(),
        content: trimmedContent,
        imageUrl: imageUrl || '',
        lastMessage: trimmedContent,
        lastMessageAt: new Date(),
      })
      await newRoom.save()
      const populated = await ChatRoomModel.findById(newRoom._id).populate('participants', 'username profileImage role companyInfo.companyCategory companyInfo.companyType')
      return res.json({ room: populated })
    }

    const targetUserId = req.body.targetUserId
    if (!targetUserId) return res.status(400).json({ message: 'targetUserId는 필수입니다' })

    let room = await ChatRoomModel.findOne({
      participants: { $all: [userId, targetUserId], $size: 2 },
    }).populate('participants', 'username profileImage role companyInfo.companyCategory companyInfo.companyType')
    if (!room) {
      room = new ChatRoomModel({ participants: [userId, targetUserId] })
      await room.save()
      room = await ChatRoomModel.findById(room._id).populate('participants', 'username profileImage role companyInfo.companyCategory companyInfo.companyType')
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
    const isParticipant = room.participants.some((p) => p.toString() === userId) || req.user!.role === 'admin'
    if (!isParticipant) return res.status(403).json({ message: '접근 권한이 없습니다' })
    const total = await MessageModel.countDocuments({ roomId, deletedBy: { $ne: userId } })
    const messages = await MessageModel.find({ roomId, deletedBy: { $ne: userId } })
      .populate('senderId', 'username profileImage role level')
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
    const isParticipant = room.participants.some((p) => p.toString() === userId) || req.user!.role === 'admin'
    if (!isParticipant) return res.status(403).json({ message: '접근 권한이 없습니다' })
    if (room.status === 'closed') return res.status(400).json({ message: '종료된 문의입니다' })
    const message = new MessageModel({
      roomId,
      senderId: userId,
      type: type || 'text',
      content,
      fileName: fileName || '',
    })
    await message.save()
    await message.populate('senderId', 'username profileImage role level')
    const roomUpdate: Record<string, unknown> = { lastMessage: type === 'image' ? '사진' : content, lastMessageAt: new Date() }
    // 관리자가 처음 답장하면 진행중으로 전환
    if (req.user!.role === 'admin' && room.status === 'open') {
      roomUpdate.status = 'in_progress'
    }
    await ChatRoomModel.findByIdAndUpdate(roomId, roomUpdate)
    emitToRoom(roomId, 'new-message', message)
    res.status(201).json({ message })
  } catch {
    res.status(500).json({ message: '메시지 전송 실패' })
  }
}

// 관리자가 문의를 종료 처리 — 종료된 문의는 양쪽 다 더 이상 메시지를 보낼 수 없다
export const closeRoom = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ message: '관리자만 문의를 종료할 수 있습니다' })
    const { roomId } = req.params
    const room = await ChatRoomModel.findByIdAndUpdate(roomId, { status: 'closed' }, { new: true })
    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' })
    res.json({ room })
  } catch {
    res.status(500).json({ message: '문의 종료 실패' })
  }
}

// 문의하기 탭 / 관리자 문의하기 관리 사이드바의 빨간 점 표시용 안읽은 메시지 수
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    if (req.user!.role === 'admin') {
      const rooms = await ChatRoomModel.find({}).populate('participants', 'role')
      const roomIds = rooms.filter((r) => r.participants.some((p: any) => p.role === 'admin')).map((r) => r._id)
      const unreadMessages = await MessageModel.find({ roomId: { $in: roomIds }, isRead: false }).populate('senderId', 'role')
      const count = unreadMessages.filter((m) => (m.senderId as any)?.role !== 'admin').length
      return res.json({ count })
    }
    const rooms = await ChatRoomModel.find({ participants: userId, deletedBy: { $ne: userId } }).select('_id')
    const roomIds = rooms.map((r) => r._id)
    const count = await MessageModel.countDocuments({ roomId: { $in: roomIds }, senderId: { $ne: userId }, isRead: false })
    res.json({ count })
  } catch {
    res.status(500).json({ message: '안읽은 메시지 수 조회 실패' })
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

// 요청한 사용자의 목록에서만 숨긴다 — 상대방(관리자)은 계속 조회/보관 가능
export const deleteRoom = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { roomId } = req.params
    const room = await ChatRoomModel.findById(roomId)
    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' })
    const isParticipant = room.participants.some((p) => p.toString() === userId) || req.user!.role === 'admin'
    if (!isParticipant) return res.status(403).json({ message: '접근 권한이 없습니다' })
    await ChatRoomModel.findByIdAndUpdate(roomId, { $addToSet: { deletedBy: userId } })
    res.json({ message: '채팅방 삭제 완료' })
  } catch {
    res.status(500).json({ message: '채팅방 삭제 실패' })
  }
}
