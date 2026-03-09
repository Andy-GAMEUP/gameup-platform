import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'

let io: Server | null = null

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'], credentials: true },
  })
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string
    if (userId) socket.join(`user:${userId}`)
    socket.on('join-room', (roomId: string) => socket.join(`room:${roomId}`))
    socket.on('leave-room', (roomId: string) => socket.leave(`room:${roomId}`))
    socket.on('typing', (data: { roomId: string; userId: string }) => {
      socket.to(`room:${data.roomId}`).emit('user-typing', data)
    })
  })
  return io
}

export function getIO() { return io }

export function emitToUser(userId: string, event: string, data: unknown) { io?.to(`user:${userId}`).emit(event, data) }

export function emitToRoom(roomId: string, event: string, data: unknown) { io?.to(`room:${roomId}`).emit(event, data) }
