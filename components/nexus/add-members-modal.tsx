'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Check, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { io, Socket } from 'socket.io-client';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface AddMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  groupIcon: string;
  existingMemberIds: string[];
  onSuccess: () => void;
}

export function AddMembersModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  groupIcon,
  existingMemberIds,
  onSuccess,
}: AddMembersModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (open) {
      loadFriends();
      setSelectedMemberIds(new Set());
      setSearchQuery('');
      setError('');
      
      // Connect socket for notifications
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://sociamed.onrender.com';
      const socket = io(socketUrl);
      socketRef.current = socket;
      
      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [open]);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const res = await fetch('/api/friends/list', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setFriends(
          (data.friends ?? []).map((f: any) => ({
            id: f.userId,
            name: f.name ?? 'User',
            username: f.username ?? '',
            avatarUrl: f.avatarUrl ?? '',
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedMemberIds.size === 0) return;

    try {
      setAdding(true);
      setError('');
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          addMemberIds: Array.from(selectedMemberIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to add members');
        return;
      }

      // Emit socket notifications for each added member
      if (socketRef.current && data.socketPayloads && Array.isArray(data.socketPayloads)) {
        console.log('[add-members] Emitting notifications for added members:', data.socketPayloads);
        data.socketPayloads.forEach((payload: any) => {
          socketRef.current?.emit('group:member:added:notify', payload);
        });
      }

      onSuccess();
      onOpenChange(false);
      setSelectedMemberIds(new Set());
    } catch (err) {
      console.error(err);
      setError('Unable to add members');
    } finally {
      setAdding(false);
    }
  };

  const availableFriends = friends.filter((friend) => !existingMemberIds.includes(friend.id));
  const filteredFriends = availableFriends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl h-[90vh] max-h-[600px] flex flex-col gap-0 p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg sm:text-xl shadow-sm overflow-hidden flex-shrink-0">
              {groupIcon?.startsWith('http') ? (
                <img 
                  src={groupIcon} 
                  alt={`${groupName} icon`}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.textContent = '💬';
                  }}
                />
              ) : (
                groupIcon || '💬'
              )}
            </div>
            <span className="truncate text-sm sm:text-lg">Add members to {groupName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
            Select friends to invite to this group. You can search and select multiple members at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-3 p-6 pt-4">
          {/* Search bar */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Selected count */}
          {selectedMemberIds.size > 0 && (
            <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-300 truncate">
                {selectedMemberIds.size} {selectedMemberIds.size === 1 ? 'member' : 'members'} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMemberIds(new Set())}
                className="h-6 sm:h-7 px-2 sm:px-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 flex-shrink-0 ml-2"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Friends list */}
          <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
            {loadingFriends ? (
              <div className="flex items-center justify-center h-full py-12">
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading friends…</p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                  {availableFriends.length === 0 ? 'All friends are already in this group' : 'No friends found'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  {availableFriends.length === 0
                    ? 'You have added all your friends to this group.'
                    : 'Try adjusting your search terms to find more friends.'}
                </p>
              </div>
            ) : (
              <div className="h-full overflow-auto custom-scrollbar">
                <div className="p-2 sm:p-3 space-y-1 sm:space-y-2">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedMemberIds.has(friend.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700 border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                      }`}
                      onClick={() => toggleMember(friend.id)}
                    >
                      <Checkbox
                        checked={selectedMemberIds.has(friend.id)}
                        onCheckedChange={() => toggleMember(friend.id)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 flex-shrink-0"
                      />
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                        <AvatarImage src={friend.avatarUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold text-xs sm:text-sm">
                          {friend.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{friend.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{friend.username}</p>
                      </div>
                      {selectedMemberIds.has(friend.id) && (
                        <div className="flex-shrink-0">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex-shrink-0 flex items-start gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 break-words">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 p-6 pt-4 bg-white dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              variant="ghost" 
              type="button" 
              onClick={() => onOpenChange(false)} 
              disabled={adding} 
              className="px-4 sm:px-6 order-2 sm:order-1 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-4 sm:px-6 order-1 sm:order-2 text-sm"
              onClick={handleAdd}
              disabled={adding || selectedMemberIds.size === 0}
            >
              {adding ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </span>
              ) : (
                `Add ${selectedMemberIds.size > 0 ? `${selectedMemberIds.size} ` : ''}${selectedMemberIds.size === 1 ? 'Member' : 'Members'}`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

