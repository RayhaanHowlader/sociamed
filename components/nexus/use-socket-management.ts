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

  // Track processed message IDs to prevent duplicates
  const processedMessageIds = useRef(new Set<string>());

  // Stable event handlers that use refs
  const handleMessageReceived = useCallback((payload: ChatMessage) => {
    console.log('[socket] Message received:', {
      id: payload.id,
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      hasSharedPost: !!payload.sharedPostData,
      currentUserId
    });

    // Don't show our own messages (they're already shown optimistically)
    if (payload.fromUserId === currentUserId) {
      console.log('[socket] Ignoring own message');
      return;
    }

    // Prevent duplicate messages
    if (processedMessageIds.current.has(payload.id)) {
      console.log('[socket] Duplicate message ignored:', payload.id);
      return;
    }
    
    // Mark message as processed
    processedMessageIds.current.add(payload.id);
    
    // Clean up old message IDs (keep only last 1000)
    if (processedMessageIds.current.size > 1000) {
      const ids = Array.from(processedMessageIds.current);
      processedMessageIds.current = new Set(ids.slice(-500));
    }
    
    console.log('[socket] Processing message:', payload.id, payload.sharedPostData ? 'with shared post' : 'regular message');
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
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000')
      : 'http://localhost:4000';
    console.log('[socket] Connecting to:', socketUrl, '(env:', process.env.NODE_ENV + ')');
    
    const socket = io(socketUrl, {
      timeout: 10000,
      transports: ['websocket'], // Only WebSocket, no polling
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: false, // Don't force new connection unnecessarily
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] Connected successfully to:', socketUrl);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[socket] Connection error:', error.message);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[socket] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socket.on('reconnect_error', (error) => {
      console.error('[socket] Reconnection error:', error.message);
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
    
    console.log('[socket] Joining chat rooms for user:', currentUserId);
    
    // Join room for selected chat
    if (selectedChat) {
      console.log('[socket] Joining room for selected chat:', selectedChat.userId);
      socketRef.current.emit('chat:join', { userId: currentUserId, friendId: selectedChat.userId });
    }
    
    // Join rooms for all friends so we can receive messages from any friend
    console.log('[socket] Joining rooms for', friends.length, 'friends');
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