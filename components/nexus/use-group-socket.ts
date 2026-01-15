'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GroupMessage } from './group-chat-utils';
import { useNotifications } from './use-notifications';

interface UseGroupSocketProps {
  currentUserId: string | null;
  groups: { _id: string; name?: string; icon?: string }[];
  setMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>;
  setPinnedMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  refreshCurrentGroup: () => Promise<void>;
  groupMembers?: { id: string; name: string; avatarUrl?: string }[];
}

export function useGroupSocket({
  currentUserId,
  groups,
  setMessages,
  setPinnedMessages,
  messagesEndRef,
  refreshCurrentGroup,
  groupMembers = []
}: UseGroupSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [socketReadyState, setSocketReadyState] = useState(false);
  const setMessagesRef = useRef(setMessages);
  const setPinnedMessagesRef = useRef(setPinnedMessages);
  const refreshCurrentGroupRef = useRef(refreshCurrentGroup);
  const { showNotification } = useNotifications();

  // Update refs when handlers change
  useEffect(() => {
    setMessagesRef.current = setMessages;
    setPinnedMessagesRef.current = setPinnedMessages;
    refreshCurrentGroupRef.current = refreshCurrentGroup;
  }, [setMessages, setPinnedMessages, refreshCurrentGroup]);

  // Connect socket when currentUserId is available
  useEffect(() => {
    if (!currentUserId) return;
 
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || 'https://sociamed.onrender.com')
      : 'https://sociamed.onrender.com';
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
      console.log('[group-socket] Connected to:', socketUrl);
      setSocketReadyState(true);
      
      // Join user's notification room for group removal notifications
      if (currentUserId) {
        socket.emit('notification:join', { userId: currentUserId });
        console.log('[group-socket] Joined notification room for user:', currentUserId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[group-socket] Disconnected:', reason);
      setSocketReadyState(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[group-socket] Connection error:', error);
      setSocketReadyState(false);
    });

    socket.on('group:message', (payload: GroupMessage) => {
      // Ignore messages already added locally
      if (payload.fromUserId === currentUserId) return;
      console.log('[socket] group:message received', payload.id);
      
      // Show notification for group messages
      const group = groups.find(g => g._id === payload.groupId);
      const sender = groupMembers.find(m => m.id === payload.fromUserId);
      
      let notificationBody = payload.content;
      if (payload.fileUrl && payload.isImage) {
        notificationBody = '📷 Sent a photo';
      } else if (payload.fileUrl && payload.mimeType?.startsWith('audio/')) {
        notificationBody = '🎤 Sent a voice message';
      } else if (payload.fileUrl) {
        notificationBody = `📎 Sent a file: ${payload.fileName || 'file'}`;
      } else if (payload.poll) {
        notificationBody = '📊 Created a poll';
      }
      
      showNotification({
        title: `${sender?.name || 'Someone'} in ${group?.name || 'Group'}`,
        body: notificationBody,
        icon: sender?.avatarUrl || group?.icon,
        tag: `group-${payload.groupId}`,
        data: {
          type: 'group-message',
          groupId: payload.groupId,
          messageId: payload.id,
        }
      });
      
      setMessagesRef.current((prev) => [...prev, payload]);
      
      // Scroll to bottom when receiving a new message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    socket.on('group:message:id', ({ tempId, newId, filePublicId }: { tempId: string; newId: string; filePublicId?: string }) => {
      console.log('[socket] group:message:id received', { tempId, newId });
      setMessagesRef.current((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, id: newId, filePublicId: filePublicId ?? m.filePublicId } : m,
        ),
      );
    });

    socket.on('group:delete', ({ messageIds, by }: { messageIds: string[]; by?: string }) => {
      if (!Array.isArray(messageIds) || messageIds.length === 0) return;
      console.log('[socket] group:delete received', messageIds);
      setMessagesRef.current((prev) =>
        prev.map((m) =>
          messageIds.includes(m.id)
            ? { ...m, deleted: true, deletedBy: by ?? m.deletedBy, content: '', fileUrl: '', fileName: '', mimeType: '', isImage: false }
            : m,
        ),
      );
      refreshCurrentGroupRef.current();
    });

    socket.on('group:pin', ({ messageId, pin, pinnedBy }: { messageId: string; pin: boolean; pinnedBy: string | null }) => {
      console.log('[socket] group:pin received', { messageId, pin, pinnedBy });
      
      // Only update if this event is from another user (not the current user who initiated the pin)
      if (pinnedBy === currentUserId) {
        console.log('[socket] Ignoring own pin event to prevent duplicates');
        return;
      }
      
      // Update the message in the main messages list
      setMessagesRef.current((prev) =>
        prev.map((m): GroupMessage =>
          m.id === messageId
            ? { ...m, pinned: pin, pinnedBy: pin ? (pinnedBy || undefined) : undefined, pinnedAt: pin ? new Date().toISOString() : undefined }
            : m,
        ),
      );
      
      // Update pinned messages list
      if (pin) {
        setMessagesRef.current((prev) => {
          const messageToPin = prev.find(m => m.id === messageId);
          if (messageToPin) {
            const pinnedMessage: GroupMessage = { 
              ...messageToPin, 
              pinned: true, 
              pinnedBy: pinnedBy || undefined, 
              pinnedAt: new Date().toISOString() 
            };
            setPinnedMessagesRef.current(prevPinned => {
              // Check if message is already pinned to avoid duplicates
              if (prevPinned.some(p => p.id === messageId)) return prevPinned;
              return [...prevPinned, pinnedMessage];
            });
          }
          return prev;
        });
      } else {
        setPinnedMessagesRef.current(prev => prev.filter(m => m.id !== messageId));
      }
    });

    socket.on('group:poll:vote', ({ pollId, optionIds, voterId }: { pollId: string; optionIds: string[]; voterId: string }) => {
      console.log('[socket] group:poll:vote received', { pollId, optionIds, voterId });
      
      // Only update if this vote is from another user
      if (voterId === currentUserId) {
        console.log('[socket] Ignoring own poll vote event to prevent duplicates');
        return;
      }
      
      // Refresh poll data by refetching from server
      refreshCurrentGroupRef.current();
    });

    // Listen for group member removal notification
    socket.on('group:member:removed', ({ userId, groupId, groupName, removedBy, removedByProfile }: {
      userId: string;
      groupId: string;
      groupName: string;
      removedBy: string;
      removedByProfile: { name: string; username: string; avatarUrl?: string };
    }) => {
      console.log('[socket] group:member:removed received', { userId, groupId, groupName });
      
      // Only show notification if this is for the current user
      if (userId === currentUserId) {
        showNotification({
          title: `Removed from ${groupName}`,
          body: `${removedByProfile.name} removed you from the group`,
          icon: removedByProfile.avatarUrl,
          tag: `group-removed-${groupId}`,
          data: {
            type: 'group-removed',
            groupId,
            removedBy,
          }
        });
      }
    });

    // Listen for group member added notification
    socket.on('group:member:added', ({ userId, groupId, groupName, groupIcon, addedBy, addedByProfile }: {
      userId: string;
      groupId: string;
      groupName: string;
      groupIcon: string;
      addedBy: string;
      addedByProfile: { name: string; username: string; avatarUrl?: string };
    }) => {
      console.log('[socket] group:member:added received', { userId, groupId, groupName });
      
      // Only show notification if this is for the current user
      if (userId === currentUserId) {
        showNotification({
          title: `Added to ${groupName}`,
          body: `${addedByProfile.name} added you to the group`,
          icon: groupIcon || addedByProfile.avatarUrl,
          tag: `group-added-${groupId}`,
          data: {
            type: 'group-added',
            groupId,
            addedBy,
          }
        });
      }
    });

    return () => {
      console.log('[socket] disconnect');
      socket.disconnect();
      socketRef.current = null;
      setSocketReadyState(false);
    };
  }, [currentUserId, messagesEndRef]);

  // Join all group rooms (so delete/message events reach even if not currently open)
  useEffect(() => {
    if (!socketRef.current || !currentUserId) return;
    groups.forEach((g) => {
      if (g._id) {
        socketRef.current?.emit('group:join', { groupId: g._id });
        console.log('[socket] group:join (all)', g._id);
      }
    });
  }, [groups, currentUserId]);

  return { socketRef, socketReady: socketReadyState };
}