'use client';

import { useState, useEffect, useCallback } from 'react';
import { GroupMessage, Group } from './group-chat-utils';

interface UseGroupMessagesProps {
  selectedGroup: Group | null;
  socketReady: boolean;
  loadPinnedMessages: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>;
  setPinnedMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>;
}

interface UseGroupMessagesProps {
  selectedGroup: Group | null;
  socketReady: boolean;
  loadPinnedMessages: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>;
  setPinnedMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>;
}

export function useGroupMessages({ selectedGroup, socketReady, loadPinnedMessages, setMessages, setPinnedMessages }: UseGroupMessagesProps) {
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messages, setLocalMessages] = useState<GroupMessage[]>([]);

  // Clear selection function
  const clearSelection = useCallback(() => {
    // This will be used by the main component
  }, []);

  // Load initial history when selected group changes
  useEffect(() => {
    if (!selectedGroup || !socketReady) {
      setMessages([]);
      setPinnedMessages([]);
      setHasMoreMessages(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/groups/history?groupId=${selectedGroup._id}&limit=5`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(data.error || 'Unable to load group history');
          return;
        }
        clearSelection();
        setMessages(data.messages ?? []);
        setLocalMessages(data.messages ?? []);
        setHasMoreMessages(data.hasMore ?? false);
      } catch (err) {
        console.error(err);
      }
    };

    void loadHistory();
    void loadPinnedMessages();
  }, [selectedGroup, socketReady, loadPinnedMessages, clearSelection, setMessages, setPinnedMessages]);

  // Load more messages when scrolling up
  const loadMoreMessages = useCallback(async () => {
    if (!selectedGroup || loadingMore || !hasMoreMessages) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    console.log('[group scroll] loadMoreMessages start', {
      groupId: selectedGroup._id,
      before: oldestMessage.createdAt,
    });
    setLoadingMore(true);
    
    // Add a small delay to prevent rapid successive calls
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const res = await fetch(
        `/api/groups/history?groupId=${selectedGroup._id}&limit=10&before=${oldestMessage.createdAt}`,
        {
          credentials: 'include',
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load more messages');
        return;
      }

      const newMessages = data.messages ?? [];
      if (newMessages.length > 0) {
        // Prepend older messages to the beginning
        setMessages((prev) => [...newMessages, ...prev]);
        setLocalMessages((prev) => [...newMessages, ...prev]);
        setHasMoreMessages(data.hasMore ?? false);
        console.log('[group scroll] loadMoreMessages success', {
          received: newMessages.length,
          hasMore: data.hasMore,
        });
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedGroup, loadingMore, hasMoreMessages, messages, setMessages]);

  // Refresh current group messages
  const refreshCurrentGroup = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/groups/history?groupId=${selectedGroup._id}&limit=20`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to refresh group history');
        return;
      }
      setMessages(data.messages ?? []);
      setLocalMessages(data.messages ?? []);
      setHasMoreMessages(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    }
  }, [selectedGroup, setMessages]);

  return {
    hasMoreMessages,
    loadingMore,
    loadMoreMessages,
    refreshCurrentGroup
  };
}