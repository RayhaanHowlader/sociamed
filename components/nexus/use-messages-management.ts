'use client';

import { useState, useCallback, useRef } from 'react';

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

export function useMessagesManagement(currentUserId: string | null, selectedChat: FriendConversation | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const loadingRef = useRef(false);

  const refreshCurrentChat = useCallback(async () => {
    if (!currentUserId || !selectedChat) return;
    try {
      const res = await fetch(`/api/chat/history?friendId=${selectedChat.userId}&limit=20`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to refresh chat history');
        return;
      }
      setMessages(data.messages ?? []);
      setHasMoreMessages(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    }
  }, [currentUserId, selectedChat]);

  const loadMoreMessages = useCallback(async () => {
    if (!currentUserId || !selectedChat || loadingRef.current || !hasMoreMessages) return;

    // Prevent multiple simultaneous calls
    loadingRef.current = true;
    setLoadingMore(true);

    try {
      // Get the oldest message from current state
      const currentMessages = messages;
      const oldestMessage = currentMessages[0];
      if (!oldestMessage) {
        loadingRef.current = false;
        setLoadingMore(false);
        return;
      }

      const res = await fetch(
        `/api/chat/history?friendId=${selectedChat.userId}&limit=5&before=${oldestMessage.createdAt}`,
        {
          credentials: 'include',
        }
      );
      
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load more messages');
        return;
      }

      setMessages((prev) => [...(data.messages ?? []), ...prev]);
      setHasMoreMessages(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [currentUserId, selectedChat?.userId, hasMoreMessages, messages]);

  const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

  const toggleMessageSelection = (id: string, isMine: boolean) => {
    if (!isMine) return;
    if (!isObjectId(id)) return;
    
    setSelectMode(true);
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedMessageIds(new Set());
    setSelectMode(false);
  };

  const deleteSelectedMessages = async () => {
    if (!selectedChat || !currentUserId) return;
    const ids = Array.from(selectedMessageIds).filter(isObjectId);
    if (ids.length === 0) {
      await refreshCurrentChat();
      return;
    }

    try {
      const res = await fetch('/api/chat/message', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageIds: ids }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete messages');
      }

      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(m.id)
            ? { ...m, deleted: true, content: '', fileUrl: '', fileName: '', mimeType: '', isImage: false, filePublicId: '' }
            : m,
        ),
      );

      await refreshCurrentChat();
      clearSelection();
      
      return { success: true, messageIds: ids };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return {
    messages,
    setMessages,
    hasMoreMessages,
    setHasMoreMessages,
    loadingMore,
    selectMode,
    setSelectMode,
    selectedMessageIds,
    refreshCurrentChat,
    loadMoreMessages,
    toggleMessageSelection,
    clearSelection,
    deleteSelectedMessages,
  };
}