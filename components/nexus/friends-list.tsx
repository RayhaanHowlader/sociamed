'use client';

import { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface FriendConversation {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface FriendsListProps {
  friends: FriendConversation[];
  selectedChat: FriendConversation | null;
  searchQuery: string;
  searchingFriends: boolean;
  loadingFriends: boolean;
  loadingMoreFriends: boolean;
  hasMoreFriends: boolean;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onSelectChat: (friend: FriendConversation) => void;
  onViewProfile: (userId: string) => void;
  onLoadMoreFriends: () => void;
  className?: string;
}

export function FriendsList({
  friends,
  selectedChat,
  searchQuery,
  searchingFriends,
  loadingFriends,
  loadingMoreFriends,
  hasMoreFriends,
  onSearchChange,
  onClearSearch,
  onSelectChat,
  onViewProfile,
  onLoadMoreFriends,
  className,
}: FriendsListProps) {
  const loadMoreFriendsRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreFriends && !loadingMoreFriends && !loadingFriends) {
          onLoadMoreFriends();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreFriendsRef.current) {
      observerRef.current.observe(loadMoreFriendsRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMoreFriends, loadingMoreFriends, loadingFriends, onLoadMoreFriends]);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-slate-200">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-4">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 border-slate-200"
          />
          {searchingFriends && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Friends List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loadingFriends ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="ml-2 text-slate-500 text-sm">Loading friends...</span>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-500 px-2 py-4">
                {searchQuery ? `No friends found for "${searchQuery}"` : 'Add friends first to start conversations.'}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={onClearSearch}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <>
              {friends.map((conv) => (
                <FriendListItem
                  key={conv.userId}
                  friend={conv}
                  isSelected={selectedChat?.userId === conv.userId}
                  onSelect={() => onSelectChat(conv)}
                  onViewProfile={() => onViewProfile(conv.userId)}
                />
              ))}
              
              {/* Lazy loading trigger */}
              {hasMoreFriends && (
                <div ref={loadMoreFriendsRef} className="flex items-center justify-center py-4">
                  {loadingMoreFriends && (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="ml-2 text-slate-500 text-sm">Loading more...</span>
                    </>
                  )}
                </div>
              )}
              
              {!hasMoreFriends && friends.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-slate-500 text-xs">You've reached the end of your friends list</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface FriendListItemProps {
  friend: FriendConversation;
  isSelected: boolean;
  onSelect: () => void;
  onViewProfile: () => void;
}

function FriendListItem({ friend, isSelected, onSelect, onViewProfile }: FriendListItemProps) {
  return (
    <div
      className={cn(
        'w-full p-3 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer',
        isSelected && 'bg-blue-50',
      )}
    >
      <Avatar 
        className="cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onViewProfile();
        }}
      >
        <AvatarImage src={friend.avatarUrl} />
        <AvatarFallback>{friend.name[0]}</AvatarFallback>
      </Avatar>
      <div 
        className="flex-1 text-left overflow-hidden cursor-pointer"
        onClick={onSelect}
      >
        <p className="font-semibold text-slate-900 text-sm">{friend.name}</p>
        <p className="text-xs text-slate-500">@{friend.username}</p>
        <p className="text-sm text-slate-600 truncate">
          Start a conversation with {friend.name}
        </p>
      </div>
    </div>
  );
}