const http = require('http')
const { Server } = require('socket.io')

const PORT = process.env.SOCKET_PORT || 4000

const server = http.createServer()

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

function getRoomId(userA, userB) {
  return [String(userA), String(userB)].sort().join(':')
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id)

  socket.on('chat:join', ({ userId, friendId }) => {
    const roomId = getRoomId(userId, friendId)
    socket.join(roomId)
  })

  socket.on('chat:message', (payload) => {
    const { fromUserId, toUserId } = payload
    if (!fromUserId || !toUserId) return

    const roomId = getRoomId(fromUserId, toUserId)
    io.to(roomId).emit('chat:message', {
      ...payload,
      roomId,
      createdAt: payload.createdAt || new Date().toISOString(),
    })
  })

  socket.on('chat:seen', (payload) => {
    const { fromUserId, toUserId, messageId } = payload
    if (!fromUserId || !toUserId || !messageId) return
    const roomId = getRoomId(fromUserId, toUserId)
    io.to(roomId).emit('chat:seen', payload)
  })

  // Group chat events
  socket.on('group:join', ({ groupId }) => {
    if (!groupId) return
    socket.join(`group:${groupId}`)
  })

  socket.on('group:message', (payload) => {
    const { groupId, fromUserId } = payload
    if (!groupId || !fromUserId) return

    io.to(`group:${groupId}`).emit('group:message', {
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString(),
    })
  })

  // Voice call events
  socket.on('call:offer', ({ fromUserId, toUserId, offer, callId }) => {
    if (!fromUserId || !toUserId || !offer || !callId) return
    const roomId = getRoomId(fromUserId, toUserId)
    socket.to(roomId).emit('call:offer', { fromUserId, toUserId, offer, callId })
  })

  socket.on('call:answer', ({ fromUserId, toUserId, answer, callId }) => {
    if (!fromUserId || !toUserId || !answer || !callId) return
    const roomId = getRoomId(fromUserId, toUserId)
    socket.to(roomId).emit('call:answer', { fromUserId, toUserId, answer, callId })
  })

  socket.on('call:ice-candidate', ({ fromUserId, toUserId, candidate, callId }) => {
    if (!fromUserId || !toUserId || !candidate || !callId) return
    const roomId = getRoomId(fromUserId, toUserId)
    socket.to(roomId).emit('call:ice-candidate', { fromUserId, toUserId, candidate, callId })
  })

  socket.on('call:end', ({ fromUserId, toUserId, callId }) => {
    if (!fromUserId || !toUserId || !callId) return
    const roomId = getRoomId(fromUserId, toUserId)
    socket.to(roomId).emit('call:end', { fromUserId, toUserId, callId })
  })

  socket.on('call:reject', ({ fromUserId, toUserId, callId }) => {
    if (!fromUserId || !toUserId || !callId) return
    const roomId = getRoomId(fromUserId, toUserId)
    socket.to(roomId).emit('call:reject', { fromUserId, toUserId, callId })
  })

  // Notification events
  socket.on('notification:join', ({ userId }) => {
    if (!userId) return
    socket.join(`user:${userId}`)
  })

  // Friend request notification
  socket.on('friend:request:notify', ({ toUserId, requestId, fromUserId, profile }) => {
    if (!toUserId || !requestId || !fromUserId || !profile) return
    io.to(`user:${toUserId}`).emit('friend:request', {
      id: requestId,
      fromUserId,
      profile,
    })
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Socket server listening on http://localhost:${PORT}`)
})


