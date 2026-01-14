'use client';

import { useRef } from 'react';
import { Hash, Upload, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  onGroupNameChange: (name: string) => void;
  groupIcon: string;
  onGroupIconChange: (icon: string) => void;
  customIconUrl: string;
  onCustomIconUrlChange: (url: string) => void;
  uploadingIcon: boolean;
  onIconUpload: (file: File) => void;
  selectedMemberIds: Set<string>;
  onToggleMember: (id: string) => void;
  friends: Friend[];
  loadingFriends: boolean;
  error: string;
  creating: boolean;
  onCreateGroup: () => void;
}

const ICON_OPTIONS = ['🎨', '🚀', '⚡', '☕', '💬', '📚', '🎮', '🎧'];

export function CreateGroupModal({
  open,
  onOpenChange,
  groupName,
  onGroupNameChange,
  groupIcon,
  onGroupIconChange,
  customIconUrl,
  onCustomIconUrlChange,
  uploadingIcon,
  onIconUpload,
  selectedMemberIds,
  onToggleMember,
  friends,
  loadingFriends,
  error,
  creating,
  onCreateGroup
}: CreateGroupModalProps) {
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  const handleRemoveCustomIcon = () => {
    onCustomIconUrlChange('');
    onGroupIconChange('🎨');
    if (iconInputRef.current) iconInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">Create a group</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Name your group, choose an icon, and add members from your friends list.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Group name
            </label>
            <Input
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              placeholder="Design Team"
              className="dark:bg-slate-900 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Group icon</p>
            
            {/* Custom Icon Preview */}
            {customIconUrl && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Custom icon:</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 overflow-hidden">
                    <img 
                      src={customIconUrl} 
                      alt="Custom group icon" 
                      className="w-full h-full object-cover pointer-events-none"
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.textContent = '💬';
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveCustomIcon}
                    className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {/* Upload Custom Icon Button */}
              <div>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onIconUpload(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingIcon}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors',
                    uploadingIcon && 'opacity-50 cursor-not-allowed',
                    customIconUrl && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  {uploadingIcon ? (
                    <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 border-t-blue-600 rounded-full animate-spin"></div>
                  ) : (
                    <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  )}
                </button>
              </div>

              {/* Emoji Options */}
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => {
                    onGroupIconChange(icon);
                    onCustomIconUrlChange(''); // Clear custom icon when emoji is selected
                  }}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-xl border border-transparent hover:border-blue-300 dark:hover:border-blue-500',
                    groupIcon === icon && !customIconUrl && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose an emoji or upload a custom image (recommended: 64x64px)
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Add members</p>
            {loadingFriends ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading friends…</p>
            ) : friends.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You don&apos;t have any friends yet. Add friends to invite them to groups.
              </p>
            ) : (
              <ScrollArea className="h-40 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900">
                <div className="p-3 space-y-2">
                  {friends.map((friend) => (
                    <label
                      key={friend.id}
                      className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMemberIds.has(friend.id)}
                        onCheckedChange={() => onToggleMember(friend.id)}
                      />
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={friend.avatarUrl} />
                        <AvatarFallback>{friend.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{friend.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">@{friend.username}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="dark:text-slate-300 dark:hover:bg-slate-700">
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            onClick={onCreateGroup}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Create group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}