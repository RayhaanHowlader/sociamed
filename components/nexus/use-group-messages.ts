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

export function useGroupMessages({ selectedGroup, socketReady, loadPinnedMessages, setMessages, setPinnedMessages }: UseGroupMessagesProps) {
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [messages, setLocalMessages] = useState<GroupMessage[]>([]);

  // Clear selection function
  const clearSelection = useCallback(() => {
    // This will be used by the main component
  }, []);

  // Load initial history when selected group changes
  useEffect(() => {
    console.log('[DEBUG] useGroupMessages effect triggered', { 
      selectedGroup: selectedGroup?._id, 
      socketReady,
      hasSelectedGroup: !!selectedGroup 
    });

    if (!selectedGroup || !socketReady) {
      console.log('[DEBUG] Clearing messages - no group or socket not ready');
      setMessages([]);
      setPinnedMessages([]);
      setHasMoreMessages(false);
      setLoadingInitial(false);
      return;
    }

    const loadHistory = async () => {
      console.log('[DEBUG] Starting to load history for group:', selectedGroup._id);
      setLoadingInitial(true);
      try {
        const url = `/api/groups/history?groupId=${selectedGroup._id}&limit=5`;
        console.log('[DEBUG] Fetching from URL:', url);
        
        const res = await fetch(url, {
          credentials: 'include',
        });
        const data = await res.json();
        
        console.log('[DEBUG] API Response:', { 
          ok: res.ok, 
          status: res.status, 
          messagesCount: data.messages?.length,
          hasMore: data.hasMore 
        });
        
        if (!res.ok) {
          console.error(data.error || 'Unable to load group history');
          return;
        }
        clearSelection();
        setMessages(data.messages ?? []);
        setLocalMessages(data.messages ?? []);
        setHasMoreMessages(data.hasMore ?? false);
      } catch (err) {
        console.error('Failed to load group history:', err);
      } finally {
        console.log('[DEBUG] Finished loading history, setting loadingInitial to false');
        setLoadingInitial(false);
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
        `/api/groups/history?groupId=${selectedGroup._id}&limit=5&before=${oldestMessage.createdAt}`,
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
    setLoadingInitial(true);
    try {
      const res = await fetch(`/api/groups/history?groupId=${selectedGroup._id}&limit=5`, {
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
      console.error('Failed to refresh group messages:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, [selectedGroup, setMessages]);

  return {
    hasMoreMessages,
    loadingMore,
    loadingInitial,
    loadMoreMessages,
    refreshCurrentGroup
  };
}