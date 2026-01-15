'use client';

import { useEffect, useState, useCallback } from 'react';
import { useVoiceCall } from './use-voice-call';
import { useVideoCall } from './use-video-call';
import { useFriendsManagement } from './use-friends-management';
import { useMessagesManagement } from './use-messages-management';
import { useFileUpload } from './use-file-upload';
import { useSocketManagement } from './use-socket-management';
import { useMessageHandlers } from './use-message-handlers';
import { useNotifications } from './use-notifications';
import { ChatLayout } from './chat-layout';
import { CallUI } from './call-ui';
import { EchoFreeCallUI } from './echo-free-call-ui';
import { CallAudioElements } from './call-audio-elements';
import { ChatSearchMedia } from './chat-search-media';
import { ImageViewerModal } from './image-viewer-modal';

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

export function DirectMessages() {
  const [selectedChat, setSelectedChat] = useState<FriendConversation | null>(null);
  const [message, setMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerData, setImageViewerData] = useState<{
    url: string;
    senderName?: string;
    senderAvatar?: string;
    senderUsername?: string;
    timestamp?: string;
    caption?: string;
    fileName?: string;
  } | null>(null);
  const [searchMediaOpen, setSearchMediaOpen] = useState(false);

  // Custom hooks
  const friendsManagement = useFriendsManagement();
  const messagesManagement = useMessagesManagement(currentUserId, selectedChat);
  const fileUpload = useFileUpload();
  const { showNotification } = useNotifications();

  // Stable callback functions to prevent socket re-initialization
  const handleMessageReceived = useCallback((message: ChatMessage) => {
    console.log('[direct-messages] Received message:', {
      id: message.id,
      fromUserId: message.fromUserId,
      hasSharedPost: !!message.sharedPostData,
      selectedChatUserId: selectedChat?.userId
    });

    messagesManagement.setMessages((prev) => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        console.log('[direct-messages] Message already exists, skipping');
        return prev;
      }
      
      console.log('[direct-messages] Adding new message to state');
      
      // Show notification if message is from someone else
      if (message.fromUserId !== currentUserId) {
        try {
          const sender = friendsManagement.friends.find(f => f.userId === message.fromUserId);
          
          let notificationBody = message.content;
          if (message.fileUrl && message.isImage) {
            notificationBody = '📷 Sent a photo';
          } else if (message.fileUrl && message.mimeType?.startsWith('audio/')) {
            notificationBody = '🎤 Sent a voice message';
          } else if (message.fileUrl) {
            notificationBody = `📎 Sent a file: ${message.fileName || 'file'}`;
          } else if (message.sharedPostData) {
            notificationBody = '📝 Shared a post';
          }
          
          showNotification({
            title: sender?.name || 'New Message',
            body: notificationBody,
            icon: sender?.avatarUrl,
            tag: `message-${message.fromUserId}`,
            data: {
              type: 'message',
              userId: message.fromUserId,
              messageId: message.id,
            }
          });
        } catch (error) {
          console.error('[direct-messages] Error showing notification:', error);
          // Continue with message handling even if notification fails
        }
      }
      
      return [...prev, message];
    });
  }, [messagesManagement.setMessages, selectedChat?.userId, currentUserId, friendsManagement.friends, showNotification]);

  const handleMessageSeen = useCallback((messageId: string) => {
    messagesManagement.setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: 'seen' as const } : m)),
    );
  }, [messagesManagement.setMessages]);

  const handleMessageIdUpdated = useCallback((tempId: string, newId: string, filePublicId?: string) => {
    messagesManagement.setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId
          ? { ...m, id: newId, filePublicId: filePublicId ?? m.filePublicId }
          : m,
      ),
    );
  }, [messagesManagement.setMessages]);

  const handleMessagesDeleted = useCallback((messageIds: string[]) => {
    messagesManagement.setMessages((prev) =>
      prev.map((m) =>
        messageIds.includes(m.id)
          ? {
              ...m,
              deleted: true,
              content: '',
              fileUrl: '',
              fileName: '',
              mimeType: '',
              isImage: false,
            }
          : m,
      ),
    );
  }, [messagesManagement.setMessages]);

  // Socket management
  const { socket, sendMessage, sendMessageIdUpdate, sendDeleteNotification } = useSocketManagement({
    currentUserId,
    selectedChat,
    friends: friendsManagement.friends,
    onMessageReceived: handleMessageReceived,
    onMessageSeen: handleMessageSeen,
    onMessageIdUpdated: handleMessageIdUpdated,
    onMessagesDeleted: handleMessagesDeleted,
    onRefreshChat: messagesManagement.refreshCurrentChat,
  });

  // Voice call hook
  const {
    callState,
    initiateCall,
    answerCall,
    endCall,
    rejectCall,
    toggleMute,
    localAudioRef,
    remoteAudioRef,
  } = useVoiceCall({
    socket,
    currentUserId,
    friendId: selectedChat?.userId || null,
  });

  // Video call hook
  const {
    callState: videoCallState,
    startCall: startVideoCall,
    answerCall: answerVideoCall,
    rejectCall: rejectVideoCall,
    endCall: endVideoCall,
    toggleMute: toggleVideoMute,
    toggleVideo,
    toggleSpeaker,
    localVideoRef,
    remoteVideoRef,
  } = useVideoCall({
    socket,
    currentUserId: currentUserId || '',
  });

  // Message handlers hook
  const {
    handleSend: handleSendMessage,
    handleImageClick,
    handleSharedPostClick,
    handleSharedShortClick,
    handleEmojiSelect,
    handleVoiceTextReceived,
    handleVoiceMessageSent,
  } = useMessageHandlers({
    selectedChat,
    currentUserId,
    friends: friendsManagement.friends,
    setMessages: messagesManagement.setMessages,
    setMessage,
    setImageViewerData,
    setImageViewerOpen,
    socket,
    sendMessage,
    sendMessageIdUpdate,
  });

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.user?.sub) {
          setCurrentUserId(String(data.user.sub));
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadCurrentUser();
  }, []);

  // Load initial messages when chat is selected
  useEffect(() => {
    let isCancelled = false;
    
    const loadHistory = async () => {
      if (!currentUserId || !selectedChat) {
        if (!isCancelled) {
          messagesManagement.setMessages([]);
          messagesManagement.setHasMoreMessages(false);
        }
        return;
      }
      
      try {
        const res = await fetch(`/api/chat/history?friendId=${selectedChat.userId}&limit=5`, {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (isCancelled) return;
        
        if (!res.ok) {
          console.error(data.error || 'Unable to load chat history');
          return;
        }
        
        messagesManagement.clearSelection();
        messagesManagement.setMessages(data.messages ?? []);
        messagesManagement.setHasMoreMessages(data.hasMore ?? false);
      } catch (err) {
        if (!isCancelled) {
          console.error(err);
        }
      }
    };

    loadHistory();
    
    return () => {
      isCancelled = true;
    };
  }, [currentUserId, selectedChat?.userId]);

  // Message sending function
  const handleSend = (extra?: Partial<ChatMessage>) => {
    handleSendMessage(message, extra);
  };

  // File upload with preview
  const handleFileChange = async (file: File) => {
    if (!selectedChat || !currentUserId) return;
    
    const result = fileUpload.handleFileChange(file);
    if (result.shouldUploadImmediately) {
      try {
        const uploadResult = await fileUpload.uploadFile(file);
        handleSendMessage(message, uploadResult);
      } catch (err) {
        console.error('File upload failed:', err);
      }
    }
  };

  const handleSendPreview = async () => {
    if (fileUpload.filePreview) {
      try {
        const uploadResult = await fileUpload.uploadFile(fileUpload.filePreview.file);
        handleSendMessage(message, uploadResult);
      } catch (err) {
        console.error('File upload failed:', err);
      }
    } else {
      handleSendMessage(message);
    }
  };

  // Delete messages with socket notification
  const handleDeleteMessages = async () => {
    try {
      const result = await messagesManagement.deleteSelectedMessages();
      if (result?.success && result.messageIds.length > 0) {
        sendDeleteNotification(currentUserId!, selectedChat!.userId, result.messageIds);
      }
    } catch (err) {
      console.error('Failed to delete messages:', err);
    }
  };

  return (
    <>
      <ChatLayout
        // Friends data
        friends={friendsManagement.friends}
        selectedChat={selectedChat}
        searchQuery={friendsManagement.searchQuery}
        searchingFriends={friendsManagement.searchingFriends}
        loadingFriends={friendsManagement.loadingFriends && friendsManagement.friendsPage === 1}
        loadingMoreFriends={friendsManagement.loadingMoreFriends}
        hasMoreFriends={friendsManagement.hasMoreFriends}
        
        // Messages data
        messages={messagesManagement.messages}
        currentUserId={currentUserId}
        hasMoreMessages={messagesManagement.hasMoreMessages}
        loadingMore={messagesManagement.loadingMore}
        selectMode={messagesManagement.selectMode}
        selectedMessageIds={messagesManagement.selectedMessageIds}
        
        // Message input data
        message={message}
        uploadingFile={fileUpload.uploadingFile}
        uploadProgress={fileUpload.uploadProgress}
        filePreview={fileUpload.filePreview}
        error={fileUpload.error}
        
        // Call state
        callState={callState}
        
        // Event handlers
        onSearchChange={friendsManagement.setSearchQuery}
        onClearSearch={() => friendsManagement.setSearchQuery('')}
        onSelectChat={setSelectedChat}
        onViewProfile={(userId) => {
          window.dispatchEvent(new CustomEvent('view-profile', { 
            detail: { userId } 
          }));
        }}
        onLoadMoreFriends={friendsManagement.handleLoadMoreFriends}
        onBackClick={() => setSelectedChat(null)}
        onProfileClick={(userId) => {
          window.dispatchEvent(new CustomEvent('view-profile', { 
            detail: { userId } 
          }));
        }}
        onCallClick={initiateCall}
        onVideoCallClick={() => selectedChat && startVideoCall(selectedChat.userId, true)}
        onEndCall={endCall}
        onSearchMediaClick={() => setSearchMediaOpen(true)}
        onSelectModeToggle={() => messagesManagement.setSelectMode(true)}
        onDeleteMessages={handleDeleteMessages}
        onClearSelection={messagesManagement.clearSelection}
        onLoadMoreMessages={messagesManagement.loadMoreMessages}
        onMessageSelectToggle={messagesManagement.toggleMessageSelection}
        onImageClick={handleImageClick}
        onSharedPostClick={handleSharedPostClick}
        onSharedShortClick={handleSharedShortClick}
        onMessageChange={setMessage}
        onFileChange={handleFileChange}
        onEmojiSelect={handleEmojiSelect}
        onVoiceTextReceived={handleVoiceTextReceived}
        onVoiceMessageSent={handleVoiceMessageSent}
        onSend={handleSend}
        onSendPreview={handleSendPreview}
        onCancelPreview={fileUpload.cancelPreview}
        onClearError={fileUpload.clearError}
      />

      <CallUI
        callState={callState}
        selectedChat={selectedChat}
        friends={friendsManagement.friends}
        onAnswerCall={answerCall}
        onRejectCall={rejectCall}
        onEndCall={endCall}
        onToggleMute={toggleMute}
      />

      <EchoFreeCallUI
        callState={videoCallState}
        selectedChat={selectedChat}
        friends={friendsManagement.friends}
        onAnswerCall={answerVideoCall}
        onRejectCall={rejectVideoCall}
        onEndCall={endVideoCall}
        onToggleMute={toggleVideoMute}
        onToggleVideo={toggleVideo}
        onToggleSpeaker={toggleSpeaker}
      />

      {/* Debug video call state */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black text-white p-2 text-xs z-50 max-w-xs">
          <div>Video Call Debug:</div>
          <div>isInCall: {videoCallState.isInCall.toString()}</div>
          <div>isCalling: {videoCallState.isCalling.toString()}</div>
          <div>isVideoCall: {videoCallState.isVideoCall.toString()}</div>
          <div>isVideoEnabled: {videoCallState.isVideoEnabled.toString()}</div>
          <div>localStream: {videoCallState.localStream ? 'Yes' : 'No'}</div>
          <div>remoteStream: {videoCallState.remoteStream ? 'Yes' : 'No'}</div>
          <div>localTracks: {videoCallState.localStream?.getTracks().length || 0}</div>
          <div>remoteTracks: {videoCallState.remoteStream?.getTracks().length || 0}</div>
          {videoCallState.localStream && (
            <div>localVideo: {videoCallState.localStream.getVideoTracks().length > 0 ? 'Yes' : 'No'}</div>
          )}
          {videoCallState.remoteStream && (
            <div>remoteVideo: {videoCallState.remoteStream.getVideoTracks().length > 0 ? 'Yes' : 'No'}</div>
          )}
        </div>
      )}

      <CallAudioElements
        localAudioRef={localAudioRef}
        remoteAudioRef={remoteAudioRef}
      />

      <ImageViewerModal
        open={imageViewerOpen}
        onOpenChange={(open) => {
          setImageViewerOpen(open);
          if (!open) {
            setImageViewerData(null);
          }
        }}
        image={imageViewerData}
      />

      <ChatSearchMedia
        open={searchMediaOpen}
        onOpenChange={setSearchMediaOpen}
        friendId={selectedChat?.userId || ''}
        currentUserId={currentUserId || ''}
        friendName={selectedChat?.name || ''}
        friendAvatar={selectedChat?.avatarUrl}
        onImageClick={(url) => {
          setImageViewerData({
            url,
            senderName: selectedChat?.name,
            senderAvatar: selectedChat?.avatarUrl,
          });
          setImageViewerOpen(true);
          setSearchMediaOpen(false);
        }}
      />
    </>
  );
}