'use client';

import { ImageViewerModal } from './image-viewer-modal';
import { ChatSearchMedia } from './chat-search-media';

interface FriendConversation {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface ImageViewerData {
  url: string;
  senderName?: string;
  senderAvatar?: string;
  senderUsername?: string;
  timestamp?: string;
  caption?: string;
  fileName?: string;
}

interface ModalManagementProps {
  selectedChat: FriendConversation | null;
  currentUserId: string | null;
  imageViewerOpen: boolean;
  imageViewerData: ImageViewerData | null;
  searchMediaOpen: boolean;
  onImageViewerChange: (open: boolean) => void;
  onSearchMediaChange: (open: boolean) => void;
  onImageClick: (url: string) => void;
  onClearImageViewer: () => void;
}

export function ModalManagement({
  selectedChat,
  currentUserId,
  imageViewerOpen,
  imageViewerData,
  searchMediaOpen,
  onImageViewerChange,
  onSearchMediaChange,
  onImageClick,
  onClearImageViewer,
}: ModalManagementProps) {
  return (
    <>
      <ImageViewerModal
        open={imageViewerOpen}
        onOpenChange={(open) => {
          onImageViewerChange(open);
          if (!open) {
            onClearImageViewer();
          }
        }}
        image={imageViewerData}
      />

      <ChatSearchMedia
        open={searchMediaOpen}
        onOpenChange={onSearchMediaChange}
        friendId={selectedChat?.userId || ''}
        currentUserId={currentUserId || ''}
        friendName={selectedChat?.name || ''}
        friendAvatar={selectedChat?.avatarUrl}
        onImageClick={(url) => {
          onImageClick(url);
          onSearchMediaChange(false);
        }}
      />
    </>
  );
}