'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  useEffect(() => {
    if (open) {
      loadFriends();
      setSelectedMemberIds(new Set());
      setSearchQuery('');
      setError('');
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl">
              {groupIcon}
            </div>
            <span>Add members to {groupName}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 mt-2">
            Select friends to invite to this group. You can search and select multiple members at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4 py-4">
          {/* Search bar */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Selected count */}
          {selectedMemberIds.size > 0 && (
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {selectedMemberIds.size} {selectedMemberIds.size === 1 ? 'member' : 'members'} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMemberIds(new Set())}
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Friends list */}
          <div className="flex-1 min-h-0 border border-slate-200 rounded-lg bg-white">
            {loadingFriends ? (
              <div className="flex items-center justify-center h-full py-12">
                <p className="text-sm text-slate-500">Loading friends…</p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <UserPlus className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {availableFriends.length === 0 ? 'All friends are already in this group' : 'No friends found'}
                </p>
                <p className="text-xs text-slate-500">
                  {availableFriends.length === 0
                    ? 'You have added all your friends to this group.'
                    : 'Try adjusting your search terms.'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {filteredFriends.map((friend) => (
                    <label
                      key={friend.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedMemberIds.has(friend.id)
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'hover:bg-slate-50 border-2 border-transparent'
                      }`}
                    >
                      <Checkbox
                        checked={selectedMemberIds.has(friend.id)}
                        onCheckedChange={() => toggleMember(friend.id)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={friend.avatarUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                          {friend.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{friend.name}</p>
                        <p className="text-xs text-slate-500 truncate">@{friend.username}</p>
                      </div>
                      {selectedMemberIds.has(friend.id) && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t border-slate-200 pt-4 mt-4">
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={adding} className="px-6">
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-6"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

