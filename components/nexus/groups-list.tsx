'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

interface GroupsListProps {
  groups: Group[];
  selectedGroup: Group | null;
  onGroupSelect: (group: Group) => void;
  onCreateGroup: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loadingGroups: boolean;
  searchingGroups: boolean;
  hasMoreGroups: boolean;
  loadingMoreGroups: boolean;
  onLoadMore: () => void;
  className?: string;
}

export function GroupsList({
  groups,
  selectedGroup,
  onGroupSelect,
  onCreateGroup,
  searchQuery,
  onSearchChange,
  loadingGroups,
  searchingGroups,
  hasMoreGroups,
  loadingMoreGroups,
  onLoadMore,
  className
}: GroupsListProps) {
  const loadMoreGroupsRef = useRef<HTMLDivElement | null>(null);
  const groupsObserverRef = useRef<IntersectionObserver | null>(null);

  // Setup intersection observer for lazy loading groups
  useEffect(() => {
    if (groupsObserverRef.current) {
      groupsObserverRef.current.disconnect();
    }

    groupsObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreGroups && !loadingMoreGroups && !loadingGroups) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreGroupsRef.current) {
      groupsObserverRef.current.observe(loadMoreGroupsRef.current);
    }

    return () => {
      if (groupsObserverRef.current) {
        groupsObserverRef.current.disconnect();
      }
    };
  }, [hasMoreGroups, loadingMoreGroups, loadingGroups, onLoadMore]);

  return (
    <div className={cn(
      'w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col max-h-[50vh] md:max-h-none',
      selectedGroup && 'hidden md:flex',
      className
    )}>
      <div className="p-2 md:p-3 lg:p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <h2 className="text-base md:text-lg lg:text-xl font-bold text-slate-900">Groups</h2>
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-8 w-8 md:h-9 md:w-auto md:px-3"
            onClick={onCreateGroup}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3 md:w-4 md:h-4" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 md:pl-10 border-slate-200 text-sm h-8 md:h-10"
          />
          {searchingGroups && (
            <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1 md:p-2">
          {loadingGroups ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="ml-2 text-slate-500 text-xs md:text-sm">Loading groups...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8">
              <p className="px-2 py-4 text-xs text-slate-500">
                {searchQuery ? `No groups found for "${searchQuery}"` : 'No groups yet. Create a new group to get started.'}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => onSearchChange('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <button
                  key={group._id}
                  onClick={() => onGroupSelect(group)}
                  className={cn(
                    'w-full p-2 md:p-3 rounded-lg flex items-center gap-2 md:gap-3 hover:bg-slate-50 transition-colors cursor-pointer',
                    selectedGroup && selectedGroup._id === group._id && 'bg-blue-50'
                  )}
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl md:text-2xl flex-shrink-0 overflow-hidden">
                    {group.icon?.startsWith('http') ? (
                      <img 
                        src={group.icon} 
                        alt={`${group.name} icon`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      group.icon
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                      <p className="font-semibold text-slate-900 text-xs md:text-sm truncate">{group.name}</p>
                      {group.isPrivate && <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 mb-0.5 md:mb-1">
                      {group.memberIds?.length ?? 0} members
                    </p>
                    <p className="text-xs md:text-sm text-slate-600 truncate break-words">
                      {group.lastMessage || 'Start the conversation'}
                    </p>
                  </div>
                </button>
              ))}
              
              {/* Lazy loading trigger */}
              {hasMoreGroups && (
                <div ref={loadMoreGroupsRef} className="flex items-center justify-center py-4">
                  {loadingMoreGroups && (
                    <>
                      <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="ml-2 text-slate-500 text-xs">Loading more...</span>
                    </>
                  )}
                </div>
              )}
              
              {!hasMoreGroups && groups.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-slate-500 text-xs">You've reached the end of your groups</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}