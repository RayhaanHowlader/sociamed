'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  PhoneOff,
  Mic,
  MicOff,
  X,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { io, Socket } from 'socket.io-client';
import { useVoiceCall } from './use-voice-call';
import { MessageBubble } from './message-bubble';
import { FilePreview } from './file-preview';
import { UploadProgress } from './upload-progress';
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
  const [friends, setFriends] = useState<FriendConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<FriendConversation | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filePreview, setFilePreview] = useState<{ url: string; type: 'image' | 'video' | 'audio'; file: File } | null>(null);
  const [error, setError] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
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
    socket: socketRef.current,
    currentUserId,
    friendId: selectedChat?.userId || null,
  });

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const res = await fetch('/api/friends/list', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) return;
        setFriends(data.friends ?? []);
        // Don't auto-select on mobile - let user choose
        // Only auto-select on desktop (md breakpoint and above)
        if (data.friends?.length) {
          // Check if we're on desktop using a media query approach
          const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
          if (isDesktop) {
            setSelectedChat(data.friends[0]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

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

    loadFriends();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://sociamed.onrender.com';
    const socket = io(socketUrl);
    socketRef.current = socket;
    console.log('[socket] connect', socketUrl);

    socket.on('chat:message', (payload: ChatMessage) => {
      // Ignore messages we already added locally
      if (payload.fromUserId === currentUserId) return;
      console.log('[socket] chat:message received', payload.id, payload.sharedPostData ? 'with shared post' : 'regular message');
      
      // Avoid duplicates by checking if message already exists
      setMessages((prev) => {
        const exists = prev.some(m => m.id === payload.id);
        if (exists) return prev;
        return [...prev, payload];
      });

      // Scroll to bottom when receiving a new message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Immediately acknowledge as seen back to the sender
      socket.emit('chat:seen', {
        messageId: payload.id,
        fromUserId: payload.fromUserId,
        toUserId: payload.toUserId,
      });
    });

    socket.on('chat:seen', ({ messageId }: { messageId: string }) => {
      console.log('[socket] chat:seen received', messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: 'seen' as const } : m)),
      );
    });

    socket.on('chat:message:id', ({ tempId, newId, filePublicId }: { tempId: string; newId: string; filePublicId?: string }) => {
      console.log('[socket] chat:message:id received', { tempId, newId });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: newId, filePublicId: filePublicId ?? m.filePublicId }
            : m,
        ),
      );
    });

    socket.on('chat:delete', ({ messageIds }: { messageIds: string[] }) => {
      if (!Array.isArray(messageIds) || messageIds.length === 0) return;
      console.log('[socket] chat:delete received', messageIds);
      setMessages((prev) =>
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
      // Fallback refresh to ensure IDs match latest history
      refreshCurrentChat();
    });

    return () => {
      console.log('[socket] disconnect');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!socketRef.current || !currentUserId) return;
    
    // Join room for selected chat
    if (selectedChat) {
      socketRef.current.emit('chat:join', { userId: currentUserId, friendId: selectedChat.userId });
    }
    
    // Join rooms for all friends so we can receive calls from any friend
    friends.forEach((friend) => {
      socketRef.current?.emit('chat:join', { userId: currentUserId, friendId: friend.userId });
    });
  }, [currentUserId, selectedChat, friends]);

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

  // Load initial messages (latest 5) whenever a chat is selected
  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUserId || !selectedChat) {
        setMessages([]);
        setHasMoreMessages(false);
        return;
      }
      try {
        const res = await fetch(`/api/chat/history?friendId=${selectedChat.userId}&limit=5`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(data.error || 'Unable to load chat history');
          return;
        }
        clearSelection();
        setMessages(data.messages ?? []);
        setHasMoreMessages(data.hasMore ?? false);
        
        // Scroll to bottom after loading initial messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (err) {
        console.error(err);
      }
    };

    loadHistory();
  }, [currentUserId, selectedChat]);

  // Load more messages when scrolling up
  const loadMoreMessages = useCallback(async () => {
    if (!currentUserId || !selectedChat || loadingMore || !hasMoreMessages) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    console.log('[scroll] loadMoreMessages start', {
      friendId: selectedChat.userId,
      before: oldestMessage.createdAt,
    });
    setLoadingMore(true);
    try {
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

      // Prepend older messages to the beginning
      setMessages((prev) => [...(data.messages ?? []), ...prev]);
      setHasMoreMessages(data.hasMore ?? false);
      console.log('[scroll] loadMoreMessages success', {
        received: data.messages?.length ?? 0,
        hasMore: data.hasMore,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [currentUserId, selectedChat, loadingMore, hasMoreMessages, messages]);

  // Handle scroll to detect when user scrolls to top
  useEffect(() => {
    if (!selectedChat) return;

    // Find the scroll container inside ScrollArea
    const findScrollContainer = () => {
      const scrollArea = messagesContainerRef.current;
      if (!scrollArea) return null;
      // ScrollArea from shadcn/ui wraps content in a div with data-radix-scroll-area-viewport
      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      return viewport || scrollArea;
    };

    let container: HTMLElement | null = null;
    let cleanup: (() => void) | null = null;

    // Wait for DOM to be ready
    const timeoutId = setTimeout(() => {
      container = findScrollContainer();
      if (!container) return;
      console.log('[scroll] container ready');

      const handleScroll = () => {
        // Check if scrolled near the top (within 100px)
        if (container && container.scrollTop < 100 && hasMoreMessages && !loadingMore) {
          const previousScrollHeight = container.scrollHeight;
          console.log('[scroll] near top -> loadMore', {
            scrollTop: container.scrollTop,
            hasMoreMessages,
            loadingMore,
          });
          loadMoreMessages().then(() => {
            // Maintain scroll position after loading more messages
            setTimeout(() => {
              if (container) {
                const newScrollHeight = container.scrollHeight;
                container.scrollTop = newScrollHeight - previousScrollHeight;
              }
            }, 0);
          });
        }
      };

      container.addEventListener('scroll', handleScroll);
      cleanup = () => container?.removeEventListener('scroll', handleScroll);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) cleanup();
    };
  }, [hasMoreMessages, loadingMore, selectedChat, messages.length, loadMoreMessages]);

  const handleSend = (extra?: Partial<ChatMessage>) => {
    if (!selectedChat || !currentUserId || !socketRef.current) return;
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
    socketRef.current.emit('chat:message', payload);

    // Persist to history collection (fire-and-forget)
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
        socketRef.current?.emit('chat:message:id', {
          fromUserId: currentUserId,
          toUserId: selectedChat.userId,
          tempId,
          newId,
          filePublicId: data.message.filePublicId,
        });
      })
      .catch((err) => console.error('Failed to save chat message', err));

    setMessage('');
  };

  const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

  const toggleMessageSelection = (id: string, isMine: boolean) => {
    if (!isMine) return;
    if (!isObjectId(id)) {
      // skip selecting messages that don't yet have a persisted id
      return;
    }
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
        setError(data.error || 'Failed to delete messages');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(m.id)
            ? { ...m, deleted: true, content: '', fileUrl: '', fileName: '', mimeType: '', isImage: false, filePublicId: '' }
            : m,
        ),
      );

      socketRef.current?.emit('chat:delete', {
        fromUserId: currentUserId,
        toUserId: selectedChat.userId,
        messageIds: ids,
      });

      await refreshCurrentChat();
      clearSelection();
    } catch (err) {
      console.error(err);
      setError('Failed to delete messages');
    }
  };

  const handleFileChange = (file: File) => {
    if (!selectedChat || !currentUserId) return;
    
    // Show preview for images, videos, and audio
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({ url: e.target?.result as string, type: 'image', file });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({ url: e.target?.result as string, type: 'video', file });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('audio/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({ url: e.target?.result as string, type: 'audio', file });
      };
      reader.readAsDataURL(file);
    } else {
      // For other file types, upload immediately without preview
      uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    if (!selectedChat || !currentUserId) return;
    
    setError(''); // Clear any previous errors
    setUploadingFile(true);
    setUploadProgress(0);
    
    // Small delay to ensure UI updates before upload starts
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      const form = new FormData();
      form.append('file', file);
      
      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ url: string; fileName: string; mimeType: string; isImage: boolean; publicId?: string }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (err) {
              console.error('Failed to parse upload response:', err);
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was cancelled'));
        });
        
        xhr.open('POST', '/api/chat/upload');
        xhr.withCredentials = true;
        xhr.send(form);
      });
      
      const data = await uploadPromise;
      
      // Ensure mimeType is set correctly
      const mimeType = data.mimeType || file.type || '';
      const isImage = data.isImage ?? mimeType.startsWith('image/');
      
      handleSend({
        fileUrl: data.url,
        fileName: data.fileName || file.name,
        mimeType: mimeType,
        filePublicId: data.publicId,
        isImage: isImage,
      });
      
      // Clear preview and reset
      setFilePreview(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'File upload failed. Please try again.';
      setError(errorMessage);
      // Don't clear preview on error so user can retry
    } finally {
      setUploadingFile(false);
      // Keep progress at 0 on error, or it will show 100% on success
    }
  };

  const handleSendPreview = () => {
    if (filePreview) {
      uploadFile(filePreview.file);
    } else {
      handleSend();
    }
  };

  const cancelPreview = () => {
    setFilePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    [friends],
  );

  const handleSharedPostClick = useCallback((postId: string) => {
    // Navigate to the feed and highlight the post
    // For now, we'll dispatch a custom event to switch to feed and scroll to the post
    window.dispatchEvent(new CustomEvent('navigate-to-post', { 
      detail: { postId } 
    }));
  }, []);

  return (
    <div className="h-full flex flex-col md:flex-row bg-white">
      {/* Friends List - Hidden on mobile when chat is selected */}
      <div className={cn(
        'w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col max-h-[40vh] md:max-h-none',
        selectedChat && 'hidden md:flex'
      )}>
        <div className="p-3 md:p4 border-b border-slate-200">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-200"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {friends.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 py-4">
                Add friends first to start conversations.
              </p>
            ) : (
              friends
                .filter((f) =>
                  `${f.name} ${f.username}`.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((conv) => (
              <div
                    key={conv.userId}
                className={cn(
                  'w-full p-3 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition-colors',
                      selectedChat?.userId === conv.userId && 'bg-blue-50',
                )}
              >
                  <Avatar 
                    className="cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to the friend's profile
                      window.dispatchEvent(new CustomEvent('view-profile', { 
                        detail: { userId: conv.userId } 
                      }));
                    }}
                  >
                      <AvatarImage src={conv.avatarUrl} />
                    <AvatarFallback>{conv.name[0]}</AvatarFallback>
                  </Avatar>
                <div 
                  className="flex-1 text-left overflow-hidden cursor-pointer"
                  onClick={() => setSelectedChat(conv)}
                >
                    <p className="font-semibold text-slate-900 text-sm">{conv.name}</p>
                      <p className="text-xs text-slate-500">{conv.username}</p>
                      <p className="text-sm text-slate-600 truncate">
                        Start a conversation with {conv.name}
                      </p>
                  </div>
              </div>
                ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat View - Full width on mobile when chat is selected */}
      <div className={cn(
        'flex-1 flex flex-col min-h-0',
        !selectedChat && 'hidden md:flex'
      )}>
        <div className="p-3 md:p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          {selectedChat ? (
          <div className="flex items-center gap-3">
            {/* Back button - only visible on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-600 hover:text-slate-900"
              onClick={() => setSelectedChat(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar 
              className="cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
              onClick={() => {
                // Navigate to the selected chat friend's profile
                window.dispatchEvent(new CustomEvent('view-profile', { 
                  detail: { userId: selectedChat.userId } 
                }));
              }}
            >
                <AvatarImage src={selectedChat.avatarUrl} />
              <AvatarFallback>{selectedChat.name[0]}</AvatarFallback>
            </Avatar>
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                // Navigate to the selected chat friend's profile
                window.dispatchEvent(new CustomEvent('view-profile', { 
                  detail: { userId: selectedChat.userId } 
                }));
              }}
            >
              <p className="font-semibold text-slate-900">{selectedChat.name}</p>
                <p className="text-sm text-slate-500">Say hi to your new friend.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a friend to start chatting.</p>
          )}
          <div className="flex gap-2 items-center flex-wrap justify-end sticky top-0 bg-white z-10 py-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-slate-600 hover:text-blue-600',
                (callState.isCalling || callState.isInCall) && 'text-blue-600 bg-blue-50'
              )}
              onClick={() => {
                if (callState.isInCall) {
                  endCall();
                } else if (!callState.isCalling && selectedChat) {
                  initiateCall();
                }
              }}
              disabled={!selectedChat || callState.isReceivingCall}
            >
              {callState.isInCall || callState.isCalling ? (
                <PhoneOff className="w-5 h-5" />
              ) : (
                <Phone className="w-5 h-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-blue-600">
              <Video className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900">
              <MoreVertical className="w-5 h-5" />
            </Button>
            <Button
              variant={selectMode ? 'secondary' : 'outline'}
              size="sm"
              disabled={!selectedChat}
              onClick={() => (selectMode ? clearSelection() : setSelectMode(true))}
              className="min-w-[92px]"
            >
              {selectMode ? 'Cancel' : 'Select'}
            </Button>
            {selectedMessageIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedMessages}
                className="min-w-[110px]"
              >
                Delete ({selectedMessageIds.size})
              </Button>
            )}
          </div>
        </div>

        <ScrollArea 
          className="flex-1 p-3 md:p-6 bg-slate-50 h-[calc(100vh-220px)]"
          ref={messagesContainerRef}
        >
          {selectedChat ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              {hasMoreMessages && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('[scroll] load more button click');
                      loadMoreMessages();
                    }}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load older messages'}
                  </Button>
                </div>
              )}

              {/* Loading indicator when loading more messages */}
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="text-sm text-slate-500">Loading older messages...</div>
                </div>
              )}
              
              {messages
                .filter(
                  (msg) =>
                    (msg.fromUserId === currentUserId && msg.toUserId === selectedChat.userId) ||
                    (msg.toUserId === currentUserId && msg.fromUserId === selectedChat.userId),
                )
                .map((msg) => {
                  const isMine = msg.fromUserId === currentUserId;
                  const selectable = selectMode && isMine && !msg.deleted;
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMine={isMine}
                      currentUserId={currentUserId || ''}
                      selectable={selectable}
                      selected={selectedMessageIds.has(msg.id)}
                      onSelectToggle={() => toggleMessageSelection(msg.id, isMine)}
                      onImageClick={(url) => handleImageClick({ url, message: msg })}
                      onSharedPostClick={handleSharedPostClick}
                    />
                  );
                })}
              
              {/* Scroll anchor for auto-scroll to bottom */}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Select a friend from the list to begin chatting.
          </div>
          )}
        </ScrollArea>

        <div className="p-3 md:p-4 border-t border-slate-200 bg-white">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* File Preview */}
            {filePreview && (
              <FilePreview preview={filePreview} onCancel={cancelPreview} />
            )}

            {/* Upload Progress Bar */}
            <UploadProgress progress={uploadProgress} isUploading={uploadingFile} />

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="w-4 h-4" />
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-auto p-1"
                  onClick={() => setError('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-blue-600"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedChat || uploadingFile}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-600 hover:text-blue-600">
                <Smile className="w-5 h-5" />
              </Button>
              <Input
                placeholder={selectedChat ? 'Type a message...' : 'Select a friend to start chatting'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 border-slate-200"
                disabled={!selectedChat || uploadingFile}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (filePreview) {
                      handleSendPreview();
                    } else {
                      handleSend();
                    }
                  }
                }}
              />
              <Button
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                disabled={!selectedChat || uploadingFile}
                onClick={() => {
                  if (filePreview) {
                    handleSendPreview();
                  } else {
                    handleSend();
                  }
                }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
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

      <Dialog open={callState.isReceivingCall && !callState.isInCall} onOpenChange={(open) => !open && !callState.isInCall && rejectCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incoming Call</DialogTitle>
            <DialogDescription>
              {(() => {
                const caller = friends.find((f) => f.userId === callState.callerId);
                return caller ? `${caller.name} is calling you...` : 'Someone is calling you...';
              })()}
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const caller = friends.find((f) => f.userId === callState.callerId);
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
        const callPartner = friends.find((f) => f.userId === callPartnerId) || selectedChat;
        
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
