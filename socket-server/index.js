const http = require('http')
const { Server } = require('socket.io')

const PORT = process.env.PORT || 4000

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
    console.log('chat:join', { socketId: socket.id, roomId })
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

  socket.on('chat:delete', (payload) => {
    const { fromUserId, toUserId, messageIds } = payload || {}
    if (!fromUserId || !toUserId || !Array.isArray(messageIds) || messageIds.length === 0) return
    const roomId = getRoomId(fromUserId, toUserId)
    console.log('chat:delete broadcast', { roomId, messageIds })
    io.to(roomId).emit('chat:delete', { fromUserId, toUserId, messageIds })
  })

  socket.on('chat:message:id', (payload) => {
    const { fromUserId, toUserId, tempId, newId, filePublicId } = payload || {}
    if (!fromUserId || !toUserId || !tempId || !newId) return
    const roomId = getRoomId(fromUserId, toUserId)
    console.log('chat:message:id broadcast', { roomId, tempId, newId })
    io.to(roomId).emit('chat:message:id', { tempId, newId, filePublicId })
  })

  // Group chat events
  socket.on('group:join', ({ groupId }) => {
    if (!groupId) return
    socket.join(`group:${groupId}`)
    console.log('group:join', { socketId: socket.id, groupId })
  })

  socket.on('group:message', (payload) => {
    const { groupId, fromUserId } = payload
    if (!groupId || !fromUserId) return

    io.to(`group:${groupId}`).emit('group:message', {
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString(),
    })
  })

  socket.on('group:delete', (payload) => {
    const { groupId, messageIds, by } = payload || {}
    if (!groupId || !Array.isArray(messageIds) || messageIds.length === 0) return
    console.log('group:delete broadcast', { groupId, messageIds, by })
    io.to(`group:${groupId}`).emit('group:delete', { groupId, messageIds, by })
  })

  socket.on('group:message:id', (payload) => {
    const { groupId, tempId, newId, filePublicId } = payload || {}
    if (!groupId || !tempId || !newId) return
    console.log('group:message:id broadcast', { groupId, tempId, newId })
    io.to(`group:${groupId}`).emit('group:message:id', { tempId, newId, filePublicId })
  })

  socket.on('group:pin', (payload) => {
    const { groupId, messageId, pin, pinnedBy } = payload || {}
    if (!groupId || !messageId || typeof pin !== 'boolean') return
    console.log('group:pin broadcast', { groupId, messageId, pin, pinnedBy })
    io.to(`group:${groupId}`).emit('group:pin', { messageId, pin, pinnedBy })
  })

  socket.on('group:poll:vote', (payload) => {
    const { groupId, pollId, optionIds, voterId } = payload || {}
    if (!groupId || !pollId || !optionIds || !voterId) return
    console.log('group:poll:vote broadcast', { groupId, pollId, optionIds, voterId })
    io.to(`group:${groupId}`).emit('group:poll:vote', { pollId, optionIds, voterId })
  })

  // Voice and Video call events
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

  // Video call specific events
  socket.on('call-offer', ({ callId, callerId, calleeId, offer, isVideoCall }) => {
    if (!callId || !callerId || !calleeId || !offer) return
    const roomId = getRoomId(callerId, calleeId)
    socket.to(roomId).emit('call-offer', { callId, callerId, calleeId, offer, isVideoCall })
  })

  socket.on('call-answer', ({ callId, callerId, calleeId }) => {
    if (!callId || !callerId || !calleeId) return
    const roomId = getRoomId(callerId, calleeId)
    socket.to(roomId).emit('call-answer', { callId, callerId, calleeId })
  })

  socket.on('call-answer-sdp', ({ callId, answer, callerId, calleeId }) => {
    if (!callId || !answer) return
    // If we have caller and callee IDs, use room-based routing
    if (callerId && calleeId) {
      const roomId = getRoomId(callerId, calleeId)
      socket.to(roomId).emit('call-answer-sdp', { callId, answer })
    } else {
      // Fallback to broadcast
      socket.broadcast.emit('call-answer-sdp', { callId, answer })
    }
  })

  socket.on('ice-candidate', ({ candidate, callId, callerId, calleeId }) => {
    if (!candidate || !callId) return
    // If we have caller and callee IDs, use room-based routing
    if (callerId && calleeId) {
      const roomId = getRoomId(callerId, calleeId)
      socket.to(roomId).emit('ice-candidate', { candidate, callId })
    } else {
      // Fallback to broadcast
      socket.broadcast.emit('ice-candidate', { candidate, callId })
    }
  })

  socket.on('call-reject', ({ callId, callerId, calleeId }) => {
    if (!callId || !callerId || !calleeId) return
    const roomId = getRoomId(callerId, calleeId)
    socket.to(roomId).emit('call-reject', { callId, callerId, calleeId })
  })

  socket.on('call-end', ({ callId, userId, callerId, calleeId }) => {
    if (!callId || !userId) return
    // If we have caller and callee IDs, use room-based routing
    if (callerId && calleeId) {
      const roomId = getRoomId(callerId, calleeId)
      socket.to(roomId).emit('call-end', { callId, userId })
    } else {
      // Fallback to broadcast
      socket.broadcast.emit('call-end', { callId, userId })
    }
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

  // Group member removed notification
  socket.on('group:member:removed:notify', ({ userId, groupId, groupName, removedBy, removedByProfile }) => {
    if (!userId || !groupId || !removedBy || !removedByProfile) return
    io.to(`user:${userId}`).emit('group:member:removed', {
      userId,
      groupId,
      groupName,
      removedBy,
      removedByProfile,
    })
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Socket server listening on http://localhost:${PORT}`)
})


