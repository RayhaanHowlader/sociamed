'use client';

import { AlertCircle, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RemoveMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  } | null;
  groupName: string;
  groupIcon: string;
  onConfirm: () => void;
  removing: boolean;
}

export function RemoveMemberModal({
  open,
  onOpenChange,
  member,
  groupName,
  groupIcon,
  onConfirm,
  removing,
}: RemoveMemberModalProps) {
  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <UserX className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Remove member</DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                This action will remove the member from the group
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Group info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm overflow-hidden">
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
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{groupName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Group</p>
            </div>
          </div>

          {/* Member info */}
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <Avatar className="w-10 h-10">
              <AvatarImage src={member.avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-red-500 to-orange-500 text-white">
                {member.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{member.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{member.username}</p>
            </div>
          </div>

          {/* Warning message */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Are you sure?</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                <span className="font-semibold">{member.name}</span> will be removed from{' '}
                <span className="font-semibold">{groupName}</span>. They will no longer be able to see group messages
                or participate in the conversation.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={removing} className="px-6">
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-6"
            onClick={onConfirm}
            disabled={removing}
          >
            {removing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Removing...
              </span>
            ) : (
              'Remove member'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

