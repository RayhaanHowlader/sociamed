'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface FriendConversation {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  filePublicId?: string;
  isImage?: boolean;
  createdAt: string;
  status?: 'sent' | 'seen';
  deleted?: boolean;
  sharedPostId?: string;
  sharedPostData?: any;
}

interface UseSocketManagementProps {
  currentUserId: string | null;
  selectedChat: FriendConversation | null;
  friends: FriendConversation[];
  onMessageReceived: (message: ChatMessage) => void;
  onMessageSeen: (messageId: string) => void;
  onMessageIdUpdated: (tempId: string, newId: string, filePublicId?: string) => void;
  onMessagesDeleted: (messageIds: string[]) => void;
  onRefreshChat: () => void;
}

export function useSocketManagement({
  currentUserId,
  selectedChat,
  friends,
  onMessageReceived,
  onMessageSeen,
  onMessageIdUpdated,
  onMessagesDeleted,
  onRefreshChat,
}: UseSocketManagementProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Use refs to store the latest callback functions to avoid dependency issues
  const callbacksRef = useRef({
    onMessageReceived,
    onMessageSeen,
    onMessageIdUpdated,
    onMessagesDeleted,
    onRefreshChat,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onMessageReceived,
      onMessageSeen,
      onMessageIdUpdated,
      onMessagesDeleted,
      onRefreshChat,
    };
  }, [onMessageReceived, onMessageSeen, onMessageIdUpdated, onMessagesDeleted, onRefreshChat]);

  // Stable event handlers that use refs
  const handleMessageReceived = useCallback((payload: ChatMessage) => {
    // Don't show our own messages (they're already shown optimistically)
    if (payload.fromUserId === currentUserId) {
      return;
    }
    
    callbacksRef.current.onMessageReceived(payload);

    // Immediately acknowledge as seen back to the sender
    if (socketRef.current) {
      socketRef.current.emit('chat:seen', {
        messageId: payload.id,
        fromUserId: payload.fromUserId,
        toUserId: payload.toUserId,
      });
    }
  }, [currentUserId]);

  const handleMessageSeen = useCallback(({ messageId }: { messageId: string }) => {
    callbacksRef.current.onMessageSeen(messageId);
  }, []);

  const handleMessageIdUpdated = useCallback(({ tempId, newId, filePublicId }: { tempId: string; newId: string; filePublicId?: string }) => {
    callbacksRef.current.onMessageIdUpdated(tempId, newId, filePublicId);
  }, []);

  const handleMessagesDeleted = useCallback(({ messageIds }: { messageIds: string[] }) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    callbacksRef.current.onMessagesDeleted(messageIds);
    callbacksRef.current.onRefreshChat();
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!currentUserId) return;


    
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'http://localhost:4000' 
      : 'http://localhost:4000';
    
    const socket = io(socketUrl, {
      timeout: 15000,
      transports: ['websocket'], // Only WebSocket, no polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true, // Force new connection
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] Connected to:', socketUrl);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[socket] Connection error:', error);
      setIsConnected(false);
    });

    // Set up message event handlers
    socket.on('chat:message', handleMessageReceived);
    socket.on('chat:seen', handleMessageSeen);
    socket.on('chat:message:id', handleMessageIdUpdated);
    socket.on('chat:delete', handleMessagesDeleted);

    return () => {

      socket.off('chat:message', handleMessageReceived);
      socket.off('chat:seen', handleMessageSeen);
      socket.off('chat:message:id', handleMessageIdUpdated);
      socket.off('chat:delete', handleMessagesDeleted);
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [currentUserId]);

  // Join chat rooms
  useEffect(() => {
    if (!socketRef.current || !currentUserId || !isConnected) return;
    
    // Join room for selected chat
    if (selectedChat) {
      socketRef.current.emit('chat:join', { userId: currentUserId, friendId: selectedChat.userId });
    }
    
    // Join rooms for all friends so we can receive calls from any friend
    friends.forEach((friend) => {
      socketRef.current?.emit('chat:join', { userId: currentUserId, friendId: friend.userId });
    });
  }, [currentUserId, selectedChat?.userId, friends.length, isConnected]);

  const sendMessage = useCallback((message: ChatMessage) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('chat:message', message);
    }
  }, [isConnected]);

  const sendMessageIdUpdate = useCallback((fromUserId: string, toUserId: string, tempId: string, newId: string, filePublicId?: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('chat:message:id', {
        fromUserId,
        toUserId,
        tempId,
        newId,
        filePublicId,
      });
    }
  }, [isConnected]);

  const sendDeleteNotification = useCallback((fromUserId: string, toUserId: string, messageIds: string[]) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('chat:delete', {
        fromUserId,
        toUserId,
        messageIds,
      });
    }
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    sendMessageIdUpdate,
    sendDeleteNotification,
  };
}