'use client';

import { useEffect, useCallback, useRef } from 'react';
import { Pin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GroupMessageBubble } from './group-message-bubble';

interface Group {
  _id: string;
  name: string;
  icon: string;
  memberIds: string[];
  lastMessage?: string;
  lastActivityAt?: string;
  isPrivate?: boolean;
  ownerId?: string;
  allowMemberEdit?: boolean;
  allowMemberInvite?: boolean;
}

interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface GroupMessage {
  id: string;
  groupId: string;
  fromUserId: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  filePublicId?: string;
  isImage?: boolean;
  createdAt: string;
  deleted?: boolean;
  deletedBy?: string;
  pinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  type?: 'text' | 'poll' | 'file';
  pollId?: string;
  poll?: {
    _id: string;
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes: number;
      voters: string[];
    }>;
    allowMultiple: boolean;
    anonymous: boolean;
    createdBy: string;
    createdAt: string;
    expiresAt: string;
    totalVotes: number;
    author: {
      name: string;
      username: string;
      avatarUrl: string;
    };
  };
}

interface GroupMessagesAreaProps {
  selectedGroup: Group | null;
  messages: GroupMessage[];
  pinnedMessages: GroupMessage[];
  showPinnedMessages: boolean;
  onTogglePinnedMessages: (show: boolean) => void;
  hasMoreMessages: boolean;
  loadingMore: boolean;
  onLoadMoreMessages: () => void;
  groupMembers: Friend[];
  currentUserId: string | null;
  isCurrentUserAdmin: boolean;
  selectMode: boolean;
  selectedMessageIds: Set<string>;
  onToggleMessageSelection: (id: string, isMine: boolean) => void;
  onImageClick: (payload: { url: string; message: GroupMessage }) => void;
  onPinToggle: (messageId: string, shouldPin: boolean) => void;
  onPollVote: (pollId: string, optionIds: string[]) => void;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function GroupMessagesArea({
  selectedGroup,
  messages,
  pinnedMessages,
  showPinnedMessages,
  onTogglePinnedMessages,
  hasMoreMessages,
  loadingMore,
  onLoadMoreMessages,
  groupMembers,
  currentUserId,
  isCurrentUserAdmin,
  selectMode,
  selectedMessageIds,
  onToggleMessageSelection,
  onImageClick,
  onPinToggle,
  onPollVote,
  messagesContainerRef,
  messagesEndRef
}: GroupMessagesAreaProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const lastScrollTop = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled scroll handler to prevent excessive API calls
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    if (!target || isLoadingRef.current || !hasMoreMessages) return;

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Throttle scroll events
    scrollTimeoutRef.current = setTimeout(() => {
      const { scrollTop, scrollHeight, clientHeight } = target;
      
      // Check if scrolled near the top (within 150px threshold) and scrolling up
      if (scrollTop < 150 && scrollTop < lastScrollTop.current) {
        console.log('[scroll] Near top, loading more messages', { scrollTop, hasMoreMessages });
        isLoadingRef.current = true;
        onLoadMoreMessages();
      }
      
      lastScrollTop.current = scrollTop;
    }, 100); // 100ms throttle
  }, [hasMoreMessages, onLoadMoreMessages]);

  // Reset loading flag when loading completes
  useEffect(() => {
    if (!loadingMore) {
      isLoadingRef.current = false;
      // Small delay to allow DOM to update before enabling scroll detection again
      setTimeout(() => {
        lastScrollTop.current = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')?.scrollTop || 0;
      }, 100);
    }
  }, [loadingMore]);

  // Attach scroll listener
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollElement) return;

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Preserve scroll position when new messages are loaded at the top
  const previousScrollHeight = useRef(0);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollElement) return;

    if (previousScrollHeight.current > 0 && messages.length > 0) {
      const newScrollHeight = scrollElement.scrollHeight;
      const heightDifference = newScrollHeight - previousScrollHeight.current;
      
      if (heightDifference > 0) {
        // Maintain scroll position by adjusting for new content height
        scrollElement.scrollTop = scrollElement.scrollTop + heightDifference;
      }
    }
    
    previousScrollHeight.current = scrollElement.scrollHeight;
  }, [messages.length]);

  // Intersection Observer for more reliable top detection
  useEffect(() => {
    if (!topSentinelRef.current || !hasMoreMessages || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingRef.current) {
          console.log('[intersection] Top sentinel visible, loading more messages');
          isLoadingRef.current = true;
          onLoadMoreMessages();
        }
      },
      {
        root: scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]'),
        rootMargin: '50px 0px 0px 0px', // Trigger 50px before reaching the top
        threshold: 0.1
      }
    );

    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreMessages, loadingMore, onLoadMoreMessages]);
  return (
    <ScrollArea 
      className="flex-1 p-3 md:p-6 bg-slate-50 dark:bg-slate-950 h-[calc(100vh-220px)]"
      ref={scrollAreaRef}
    >
      <div className="space-y-3 md:space-y-4 max-w-3xl mx-auto">
        {/* Pinned Messages Section */}
        {pinnedMessages.length > 0 && showPinnedMessages && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Pinned Messages ({pinnedMessages.length})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTogglePinnedMessages(false)}
                className="h-6 px-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pinnedMessages.map((msg) => {
                const member = groupMembers.find((m) => m.id === msg.fromUserId);
                const displayName = member?.name || 'Unknown';
                const avatarUrl = member?.avatarUrl;
                const isMine = msg.fromUserId === currentUserId;

                return (
                  <GroupMessageBubble
                    key={`pinned-${msg.id}`}
                    message={msg}
                    isMine={isMine}
                    displayName={displayName}
                    avatarUrl={avatarUrl}
                    selectable={false}
                    selected={false}
                    onSelectToggle={() => {}}
                    ownerId={selectedGroup?.ownerId}
                    currentUserId={currentUserId || undefined}
                    onImageClick={onImageClick}
                    onPinToggle={onPinToggle}
                    onPollVote={onPollVote}
                    isAdmin={isCurrentUserAdmin}
                    isPinnedView={true}
                  />
                );
              })}
            </div>
          </div>
        )}
        
        {/* Show Pinned Messages Button (when hidden) */}
        {pinnedMessages.length > 0 && !showPinnedMessages && (
          <div className="flex justify-center mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTogglePinnedMessages(true)}
              className="text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
            >
              <Pin className="w-3 h-3 mr-1" />
              Show {pinnedMessages.length} Pinned Message{pinnedMessages.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}

        {/* Top sentinel for intersection observer */}
        {hasMoreMessages && (
          <div ref={topSentinelRef} className="h-1 w-full" />
        )}

        {/* Loading indicator for lazy loading */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              Loading older messages...
            </div>
          </div>
        )}
        
        {/* Manual load more button (fallback) */}
        {hasMoreMessages && !loadingMore && (
          <div className="flex justify-center py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('[group scroll] manual load more button click');
                onLoadMoreMessages();
              }}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 dark:border-slate-700"
            >
              Load older messages
            </Button>
          </div>
        )}

        {/* No more messages indicator */}
        {!hasMoreMessages && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              Beginning of conversation
            </div>
          </div>
        )}
        
        {messages.map((msg) => {
          const isMine = msg.fromUserId === currentUserId;
          const memberInfo =
            msg.fromUserId && !isMine
              ? groupMembers.find((m) => m.id === msg.fromUserId)
              : undefined;
          const displayName = isMine
            ? 'You'
            : memberInfo?.name || 'Member';
          const avatarUrl = isMine ? undefined : memberInfo?.avatarUrl;
          const selectable = selectMode && !msg.deleted && (isMine || selectedGroup?.ownerId === currentUserId);

          return (
            <GroupMessageBubble
              key={msg.id}
              message={msg}
              isMine={isMine}
              displayName={displayName}
              avatarUrl={avatarUrl}
              selectable={selectable}
              selected={selectedMessageIds.has(msg.id)}
              onSelectToggle={() => onToggleMessageSelection(msg.id, isMine)}
              ownerId={selectedGroup?.ownerId}
              currentUserId={currentUserId || undefined}
              onImageClick={onImageClick}
              onPinToggle={onPinToggle}
              onPollVote={onPollVote}
              isAdmin={isCurrentUserAdmin}
              isPinnedView={false}
            />
          );
        })}
        
        {/* Scroll anchor for auto-scroll to bottom */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}