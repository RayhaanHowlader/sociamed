'use client';

import { useCallback } from 'react';

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
  sharedPostData?: {
    content: string;
    imageUrl?: string;
    author: {
      userId: string;
      name: string;
      username: string;
      avatarUrl?: string;
    };
    createdAt: string;
  };
}

interface UseMessageHandlersProps {
  selectedChat: FriendConversation | null;
  currentUserId: string | null;
  friends: FriendConversation[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  setImageViewerData: React.Dispatch<React.SetStateAction<any>>;
  setImageViewerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  socket: any;
  sendMessage: (message: ChatMessage) => void;
  sendMessageIdUpdate: (fromUserId: string, toUserId: string, tempId: string, newId: string, filePublicId?: string) => void;
}

export function useMessageHandlers({
  selectedChat,
  currentUserId,
  friends,
  setMessages,
  setMessage,
  setImageViewerData,
  setImageViewerOpen,
  socket,
  sendMessage,
  sendMessageIdUpdate,
}: UseMessageHandlersProps) {
  
  // Message sending function
  const handleSend = useCallback((message: string, extra?: Partial<ChatMessage>) => {
    if (!selectedChat || !currentUserId || !socket) return;
    if (!message.trim() && !extra?.fileUrl) return;

    const tempId = `${Date.now()}`;
    const payload: ChatMessage = {
      id: tempId,
      fromUserId: currentUserId,
      toUserId: selectedChat.userId,
      content: message.trim(),
      fileUrl: extra?.fileUrl,
      fileName: extra?.fileName,
      mimeType: extra?.mimeType,
      filePublicId: extra?.filePublicId,
      isImage: extra?.isImage,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, payload]);
    sendMessage(payload);

    // Persist to database
    fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        toUserId: payload.toUserId,
        content: payload.content,
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        filePublicId: payload.filePublicId,
        isImage: payload.isImage,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.message?._id) return;
        const newId = String(data.message._id || data.message.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: newId,
                  filePublicId: data.message.filePublicId ?? m.filePublicId,
                }
              : m,
          ),
        );
        sendMessageIdUpdate(currentUserId, selectedChat.userId, tempId, newId, data.message.filePublicId);
      })
      .catch((err) => console.error('Failed to save chat message', err));

    setMessage('');
  }, [selectedChat, currentUserId, socket, setMessages, sendMessage, sendMessageIdUpdate, setMessage]);

  const handleImageClick = useCallback(
    (payload: { url: string; message: ChatMessage }) => {
      const sender = friends.find((f) => f.userId === payload.message.fromUserId);
      setImageViewerData({
        url: payload.url,
        senderName: sender?.name,
        senderAvatar: sender?.avatarUrl,
        senderUsername: sender?.username,
        timestamp: payload.message.createdAt,
        caption: payload.message.content,
        fileName: payload.message.fileName,
      });
      setImageViewerOpen(true);
    },
    [friends, setImageViewerData, setImageViewerOpen],
  );

  const handleSharedPostClick = useCallback(async (postId: string) => {
    console.log('[handleSharedPostClick] Clicked on shared post:', postId);
    try {
      // Fetch the post data
      const response = await fetch(`/api/posts/${postId}`, {
        credentials: 'include',
      });
      
      console.log('[handleSharedPostClick] API response status:', response.status);
      
      if (!response.ok) {
        console.error('[handleSharedPostClick] Failed to fetch post data, status:', response.status);
        return;
      }
      
      const postData = await response.json();
      console.log('[handleSharedPostClick] Fetched post data:', postData);
      
      // Dispatch event to open post modal with the fetched data
      console.log('[handleSharedPostClick] Dispatching open-chat-post-modal event');
      window.dispatchEvent(new CustomEvent('open-chat-post-modal', { 
        detail: { post: postData.post } 
      }));
    } catch (error) {
      console.error('[handleSharedPostClick] Error fetching shared post:', error);
    }
  }, []);

  const handleSharedShortClick = useCallback((short: any) => {
    // Navigate to the shorts section and open the short viewer
    window.dispatchEvent(new CustomEvent('navigate-to-short', { 
      detail: { short } 
    }));
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessage((prev) => prev + emoji);
  }, [setMessage]);

  const handleVoiceTextReceived = useCallback((text: string) => {
    setMessage(text);
  }, [setMessage]);

  const handleVoiceMessageSent = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!selectedChat || !currentUserId) return;

    try {
      // Upload audio file
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');

      const uploadRes = await fetch('/api/chat/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload voice message');
      }

      // Send voice message
      handleSend(`🎤 Voice message (${Math.round(duration)}s)`, {
        fileUrl: uploadData.url,
        fileName: uploadData.fileName || 'voice-message.webm',
        mimeType: 'audio/webm',
        isImage: false,
      });

    } catch (err) {
      console.error('Voice message error:', err);
    }
  }, [selectedChat, currentUserId, handleSend]);

  return {
    handleSend,
    handleImageClick,
    handleSharedPostClick,
    handleSharedShortClick,
    handleEmojiSelect,
    handleVoiceTextReceived,
    handleVoiceMessageSent,
  };
}