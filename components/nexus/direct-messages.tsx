'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useVoiceCall } from './use-voice-call';
import { FriendsList } from './friends-list';
import { ChatHeader } from './chat-header';
import { MessageInputArea } from './message-input-area';
import { MessagesArea } from './messages-area';
import { useFriendsManagement } from './use-friends-management';
import { useMessagesManagement } from './use-messages-management';
import { useFileUpload } from './use-file-upload';
import { useSocketManagement } from './use-socket-management';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

  // Stable callback functions to prevent socket re-initialization
  const handleMessageReceived = useCallback((message: ChatMessage) => {
    messagesManagement.setMessages((prev) => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        return prev;
      }
      return [...prev, message];
    });
  }, [messagesManagement.setMessages]);

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
  const { socket, isConnected, sendMessage, sendMessageIdUpdate, sendDeleteNotification } = useSocketManagement({
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
        
        if (isCancelled) return; // Don't update state if component unmounted or chat changed
        
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

    messagesManagement.setMessages((prev) => [...prev, payload]);
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
        messagesManagement.setMessages((prev) =>
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
  };

  // File upload with preview
  const handleFileChange = async (file: File) => {
    if (!selectedChat || !currentUserId) return;
    
    const result = fileUpload.handleFileChange(file);
    if (result.shouldUploadImmediately) {
      try {
        const uploadResult = await fileUpload.uploadFile(file);
        handleSend(uploadResult);
      } catch (err) {
        console.error('File upload failed:', err);
      }
    }
  };

  const handleSendPreview = async () => {
    if (fileUpload.filePreview) {
      try {
        const uploadResult = await fileUpload.uploadFile(fileUpload.filePreview.file);
        handleSend(uploadResult);
      } catch (err) {
        console.error('File upload failed:', err);
      }
    } else {
      handleSend();
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

  const handleImageClick = useCallback(
    (payload: { url: string; message: ChatMessage }) => {
      const sender = friendsManagement.friends.find((f) => f.userId === payload.message.fromUserId);
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
    [friendsManagement.friends],
  );

  const handleSharedPostClick = useCallback((postId: string) => {
    // Navigate to the feed and highlight the post
    // For now, we'll dispatch a custom event to switch to feed and scroll to the post
    window.dispatchEvent(new CustomEvent('navigate-to-post', { 
      detail: { postId } 
    }));
  }, []);

  const handleSharedShortClick = useCallback((short: any) => {
    // Navigate to the shorts section and open the short viewer
    window.dispatchEvent(new CustomEvent('navigate-to-short', { 
      detail: { short } 
    }));
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessage((prev) => prev + emoji);
  }, []);

  const handleVoiceTextReceived = useCallback((text: string) => {
    setMessage(text);
  }, []);

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
      handleSend({
        content: `🎤 Voice message (${Math.round(duration)}s)`,
        fileUrl: uploadData.url,
        fileName: uploadData.fileName || 'voice-message.webm',
        mimeType: 'audio/webm',
        isImage: false,
      });

    } catch (err) {
      console.error('Voice message error:', err);
    }
  }, [selectedChat, currentUserId, handleSend]);

  return (
    <div className="h-full flex flex-col md:flex-row bg-white">
      {/* Friends List - Hidden on mobile when chat is selected */}
      <FriendsList
        friends={friendsManagement.friends}
        selectedChat={selectedChat}
        searchQuery={friendsManagement.searchQuery}
        searchingFriends={friendsManagement.searchingFriends}
        loadingFriends={friendsManagement.loadingFriends && friendsManagement.friendsPage === 1}
        loadingMoreFriends={friendsManagement.loadingMoreFriends}
        hasMoreFriends={friendsManagement.hasMoreFriends}
        onSearchChange={friendsManagement.setSearchQuery}
        onClearSearch={() => friendsManagement.setSearchQuery('')}
        onSelectChat={setSelectedChat}
        onViewProfile={(userId) => {
          window.dispatchEvent(new CustomEvent('view-profile', { 
            detail: { userId } 
          }));
        }}
        onLoadMoreFriends={friendsManagement.handleLoadMoreFriends}
        className={cn(
          'w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 max-h-[40vh] md:max-h-none',
          selectedChat && 'hidden md:flex'
        )}
      />

      {/* Chat View - Full width on mobile when chat is selected */}
      <div className={cn(
        'flex-1 flex flex-col min-h-0',
        !selectedChat && 'hidden md:flex'
      )}>
        <ChatHeader
          selectedChat={selectedChat}
          callState={callState}
          selectMode={messagesManagement.selectMode}
          selectedMessageIds={messagesManagement.selectedMessageIds}
          onBackClick={() => setSelectedChat(null)}
          onProfileClick={(userId) => {
            window.dispatchEvent(new CustomEvent('view-profile', { 
              detail: { userId } 
            }));
          }}
          onCallClick={initiateCall}
          onEndCall={endCall}
          onSearchMediaClick={() => setSearchMediaOpen(true)}
          onSelectModeToggle={() => messagesManagement.setSelectMode(true)}
          onDeleteMessages={handleDeleteMessages}
          onClearSelection={messagesManagement.clearSelection}
        />
        


        <MessagesArea
          selectedChat={selectedChat}
          messages={messagesManagement.messages}
          currentUserId={currentUserId}
          hasMoreMessages={messagesManagement.hasMoreMessages}
          loadingMore={messagesManagement.loadingMore}
          selectMode={messagesManagement.selectMode}
          selectedMessageIds={messagesManagement.selectedMessageIds}
          onLoadMoreMessages={messagesManagement.loadMoreMessages}
          onMessageSelectToggle={messagesManagement.toggleMessageSelection}
          onImageClick={handleImageClick}
          onSharedPostClick={handleSharedPostClick}
          onSharedShortClick={handleSharedShortClick}
        />

        <MessageInputArea
          selectedChat={selectedChat}
          message={message}
          uploadingFile={fileUpload.uploadingFile}
          uploadProgress={fileUpload.uploadProgress}
          filePreview={fileUpload.filePreview}
          error={fileUpload.error}
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
      </div>

      {/* Incoming Call Dialog */}
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

      <Dialog open={callState.isReceivingCall && !callState.isInCall} onOpenChange={(open) => !open && !callState.isInCall && rejectCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incoming Call</DialogTitle>
            <DialogDescription>
              {(() => {
                const caller = friendsManagement.friends.find((f) => f.userId === callState.callerId);
                return caller ? `${caller.name} is calling you...` : 'Someone is calling you...';
              })()}
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const caller = friendsManagement.friends.find((f) => f.userId === callState.callerId);
            if (!caller) return null;
            return (
              <div className="flex flex-col items-center gap-6 py-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={caller.avatarUrl} />
                  <AvatarFallback className="text-3xl">{caller.name[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-xl font-semibold">{caller.name}</p>
                  <p className="text-sm text-slate-500">@{caller.username}</p>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="rounded-full w-16 h-16"
                    onClick={rejectCall}
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      // Answer the call - this has user interaction context for audio
                      await answerCall();
                    }}
                  >
                    <Phone className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Active Call UI - Show when in call or calling - stays open until call ends */}
      {(() => {
        // Debug logging
        if (callState.isInCall || callState.isCalling) {
          console.log('Call dialog should be visible:', {
            isInCall: callState.isInCall,
            isCalling: callState.isCalling,
            callId: callState.callId,
            callerId: callState.callerId,
            hasRemoteStream: !!callState.remoteStream,
          });
        }
        
        return (callState.isInCall || callState.isCalling) && (() => {
        // Determine who we're calling with
        // If we initiated the call, use selectedChat
        // If we received the call, use the caller
        const callPartnerId = callState.isCalling 
          ? selectedChat?.userId 
          : callState.callerId || selectedChat?.userId;
        const callPartner = friendsManagement.friends.find((f) => f.userId === callPartnerId) || selectedChat;
        
        if (!callPartner) {
          // If we don't have the partner info yet, show a loading state
          return (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
              <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="flex flex-col items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-semibold">Connecting...</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <div className="flex flex-col items-center gap-6">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={callPartner.avatarUrl} />
                  <AvatarFallback className="text-4xl">{callPartner.name[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-2xl font-semibold">{callPartner.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {callState.isCalling ? 'Calling...' : callState.isInCall ? (callState.remoteStream ? 'Connected' : 'Connecting...') : ''}
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full w-14 h-14"
                    onClick={toggleMute}
                  >
                    {callState.isMuted ? (
                      <MicOff className="w-6 h-6" />
                    ) : (
                      <Mic className="w-6 h-6" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    className="rounded-full w-14 h-14"
                    onClick={endCall}
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })();
      })()}

      {/* Hidden audio elements for call audio */}
      <audio 
        ref={localAudioRef} 
        autoPlay 
        muted 
        playsInline
        controls={false}
        style={{ display: 'none', position: 'fixed', top: '-9999px' }}
      />
      <audio 
        ref={remoteAudioRef} 
        autoPlay 
        playsInline
        controls={false}
        style={{ display: 'none', position: 'fixed', top: '-9999px' }}
        onLoadedMetadata={(e) => {
          console.log('Remote audio metadata loaded');
          const audio = e.target as HTMLAudioElement;
          audio.play().catch((err) => console.error('Auto-play failed on metadata:', err));
        }}
        onCanPlay={(e) => {
          console.log('Remote audio can play');
          const audio = e.target as HTMLAudioElement;
          audio.play().catch((err) => console.error('Auto-play failed on canplay:', err));
        }}
      />
    </div>
  );
}
