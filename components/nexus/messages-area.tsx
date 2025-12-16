'use client';

import { useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './message-bubble';

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

interface MessagesAreaProps {
  selectedChat: FriendConversation | null;
  messages: ChatMessage[];
  currentUserId: string | null;
  hasMoreMessages: boolean;
  loadingMore: boolean;
  selectMode: boolean;
  selectedMessageIds: Set<string>;
  onLoadMoreMessages: () => void;
  onMessageSelectToggle: (id: string, isMine: boolean) => void;
  onImageClick: (payload: { url: string; message: ChatMessage }) => void;
  onSharedPostClick: (postId: string) => void;
  onSharedShortClick: (short: any) => void;
}

export function MessagesArea({
  selectedChat,
  messages,
  currentUserId,
  hasMoreMessages,
  loadingMore,
  selectMode,
  selectedMessageIds,
  onLoadMoreMessages,
  onMessageSelectToggle,
  onImageClick,
  onSharedPostClick,
  onSharedShortClick,
}: MessagesAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    let scrollTimeout: NodeJS.Timeout | null = null;

    // Wait for DOM to be ready
    const timeoutId = setTimeout(() => {
      container = findScrollContainer();
      if (!container) return;

      const handleScroll = () => {
        // Mark that user is actively scrolling
        isUserScrollingRef.current = true;
        
        // Clear previous timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Reset user scrolling flag after scroll stops
        scrollTimeoutRef.current = setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 1000);
        
        // Debounce scroll events to prevent excessive API calls
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = setTimeout(() => {
          // Check if scrolled near the top (within 100px)
          if (container && container.scrollTop < 100 && hasMoreMessages && !loadingMore) {
            const previousScrollHeight = container.scrollHeight;
            const previousScrollTop = container.scrollTop;
            
            onLoadMoreMessages();
            
            // Maintain scroll position after loading more messages
            setTimeout(() => {
              if (container) {
                const newScrollHeight = container.scrollHeight;
                const heightDifference = newScrollHeight - previousScrollHeight;
                container.scrollTop = previousScrollTop + heightDifference;
              }
            }, 100);
          }
        }, 150); // 150ms debounce
      };

      container.addEventListener('scroll', handleScroll, { passive: true });
      cleanup = () => {
        container?.removeEventListener('scroll', handleScroll);
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) cleanup();
    };
  }, [hasMoreMessages, loadingMore, selectedChat?.userId, onLoadMoreMessages]);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom and not actively scrolling)
  useEffect(() => {
    const container = messagesContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!container) return;

    // Don't auto-scroll if user is actively scrolling through history
    if (isUserScrollingRef.current) return;

    // Only auto-scroll if user is near the bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Scroll to bottom when chat is first selected
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [selectedChat?.userId]);

  const filteredMessages = messages.filter(
    (msg) =>
      selectedChat &&
      ((msg.fromUserId === currentUserId && msg.toUserId === selectedChat.userId) ||
        (msg.toUserId === currentUserId && msg.fromUserId === selectedChat.userId))
  );



  return (
    <ScrollArea 
      className="flex-1 p-3 md:p-6 bg-slate-50 h-[calc(100vh-220px)]"
      ref={messagesContainerRef}
    >
      {selectedChat ? (
        <div className="space-y-4 max-w-3xl mx-auto">
          {/* Beginning of conversation indicator */}
          {!hasMoreMessages && filteredMessages.length > 0 && (
            <div className="flex flex-col items-center py-8 space-y-3 border-b border-slate-200 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-slate-700">Beginning of conversation</p>
                <p className="text-xs text-slate-500">
                  This is where your conversation with {selectedChat?.name} started
                </p>
              </div>
            </div>
          )}

          {hasMoreMessages && (
            <div className="flex justify-center py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMoreMessages}
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
          
          {filteredMessages.map((msg) => {
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
                onSelectToggle={() => onMessageSelectToggle(msg.id, isMine)}
                onImageClick={(url) => onImageClick({ url, message: msg })}
                onSharedPostClick={onSharedPostClick}
                onSharedShortClick={onSharedShortClick}
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
  );
}