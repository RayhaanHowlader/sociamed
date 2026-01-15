'use client';

import { cn } from '@/lib/utils';
import { FriendsList } from './friends-list';
import { ChatHeader } from './chat-header';
import { MessageInputArea } from './message-input-area';
import { MessagesArea } from './messages-area';

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

interface CallState {
  isInCall: boolean;
  isCalling: boolean;
  isReceivingCall: boolean;
  callId: string | null;
  callerId: string | null;
  isMuted: boolean;
  remoteStream: MediaStream | null;
}

interface FilePreview {
  file: File;
  url: string;
  type: 'image' | 'audio' | 'video';
}

interface ChatLayoutProps {
  // Friends data
  friends: FriendConversation[];
  selectedChat: FriendConversation | null;
  searchQuery: string;
  searchingFriends: boolean;
  loadingFriends: boolean;
  loadingMoreFriends: boolean;
  hasMoreFriends: boolean;
  
  // Messages data
  messages: ChatMessage[];
  currentUserId: string | null;
  hasMoreMessages: boolean;
  loadingMore: boolean;
  selectMode: boolean;
  selectedMessageIds: Set<string>;
  
  // Message input data
  message: string;
  uploadingFile: boolean;
  uploadProgress: number;
  filePreview: FilePreview | null;
  error: string;
  
  // Call state
  callState: CallState;
  
  // Event handlers
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onSelectChat: (chat: FriendConversation) => void;
  onViewProfile: (userId: string) => void;
  onLoadMoreFriends: () => void;
  onBackClick: () => void;
  onProfileClick: (userId: string) => void;
  onCallClick: () => void;
  onVideoCallClick: () => void;
  onEndCall: () => void;
  onSearchMediaClick: () => void;
  onSelectModeToggle: () => void;
  onDeleteMessages: () => void;
  onClearSelection: () => void;
  onLoadMoreMessages: () => void;
  onMessageSelectToggle: (messageId: string, isMine: boolean) => void;
  onImageClick: (payload: { url: string; message: ChatMessage }) => void;
  onSharedPostClick: (postId: string) => void;
  onSharedShortClick: (short: any) => void;
  onMessageChange: (message: string) => void;
  onFileChange: (file: File) => void;
  onEmojiSelect: (emoji: string) => void;
  onVoiceTextReceived: (text: string) => void;
  onVoiceMessageSent: (audioBlob: Blob, duration: number) => void;
  onSend: () => void;
  onSendPreview: () => void;
  onCancelPreview: () => void;
  onClearError: () => void;
}

export function ChatLayout({
  // Friends data
  friends,
  selectedChat,
  searchQuery,
  searchingFriends,
  loadingFriends,
  loadingMoreFriends,
  hasMoreFriends,
  
  // Messages data
  messages,
  currentUserId,
  hasMoreMessages,
  loadingMore,
  selectMode,
  selectedMessageIds,
  
  // Message input data
  message,
  uploadingFile,
  uploadProgress,
  filePreview,
  error,
  
  // Call state
  callState,
  
  // Event handlers
  onSearchChange,
  onClearSearch,
  onSelectChat,
  onViewProfile,
  onLoadMoreFriends,
  onBackClick,
  onProfileClick,
  onCallClick,
  onVideoCallClick,
  onEndCall,
  onSearchMediaClick,
  onSelectModeToggle,
  onDeleteMessages,
  onClearSelection,
  onLoadMoreMessages,
  onMessageSelectToggle,
  onImageClick,
  onSharedPostClick,
  onSharedShortClick,
  onMessageChange,
  onFileChange,
  onEmojiSelect,
  onVoiceTextReceived,
  onVoiceMessageSent,
  onSend,
  onSendPreview,
  onCancelPreview,
  onClearError,
}: ChatLayoutProps) {
  return (
    <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-900">
      {/* Friends List - Hidden on mobile when chat is selected */}
      <FriendsList
        friends={friends}
        selectedChat={selectedChat}
        searchQuery={searchQuery}
        searchingFriends={searchingFriends}
        loadingFriends={loadingFriends}
        loadingMoreFriends={loadingMoreFriends}
        hasMoreFriends={hasMoreFriends}
        onSearchChange={onSearchChange}
        onClearSearch={onClearSearch}
        onSelectChat={onSelectChat}
        onViewProfile={onViewProfile}
        onLoadMoreFriends={onLoadMoreFriends}
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
          selectMode={selectMode}
          selectedMessageIds={selectedMessageIds}
          onBackClick={onBackClick}
          onProfileClick={onProfileClick}
          onCallClick={onCallClick}
          onVideoCallClick={onVideoCallClick}
          onEndCall={onEndCall}
          onSearchMediaClick={onSearchMediaClick}
          onSelectModeToggle={onSelectModeToggle}
          onDeleteMessages={onDeleteMessages}
          onClearSelection={onClearSelection}
        />

        <MessagesArea
          selectedChat={selectedChat}
          messages={messages}
          currentUserId={currentUserId}
          hasMoreMessages={hasMoreMessages}
          loadingMore={loadingMore}
          selectMode={selectMode}
          selectedMessageIds={selectedMessageIds}
          onLoadMoreMessages={onLoadMoreMessages}
          onMessageSelectToggle={onMessageSelectToggle}
          onImageClick={onImageClick}
          onSharedPostClick={onSharedPostClick}
          onSharedShortClick={onSharedShortClick}
        />

        <MessageInputArea
          selectedChat={selectedChat}
          message={message}
          uploadingFile={uploadingFile}
          uploadProgress={uploadProgress}
          filePreview={filePreview}
          error={error}
          onMessageChange={onMessageChange}
          onFileChange={onFileChange}
          onEmojiSelect={onEmojiSelect}
          onVoiceTextReceived={onVoiceTextReceived}
          onVoiceMessageSent={onVoiceMessageSent}
          onSend={onSend}
          onSendPreview={onSendPreview}
          onCancelPreview={onCancelPreview}
          onClearError={onClearError}
        />
      </div>
    </div>
  );
}