'use client';

import { UserMinus, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UnfriendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  } | null;
  onConfirm: () => void;
  unfriending: boolean;
}

export function UnfriendModal({
  open,
  onOpenChange,
  user,
  onConfirm,
  unfriending,
}: UnfriendModalProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <UserMinus className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Unfriend user</DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-1">
                This action will remove the friendship
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-red-500 to-orange-500 text-white">
                {user.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">@{user.username}</p>
            </div>
          </div>

          {/* Warning message */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Are you sure?</p>
              <p className="text-xs text-amber-700 mt-1">
                <span className="font-semibold">{user.name}</span> will be removed from your friends list. You will both be removed from shared groups (unless one of you is the group owner). You won't see their posts, stories, or notes in your feed anymore.
              </p>
            </div>
          </div>

          {/* Additional info */}
          <div className="text-xs text-slate-500 space-y-1">
            <p>• They will be removed from your friends list</p>
            <p>• You will be removed from their friends list</p>
            <p>• Both users will be removed from shared groups</p>
            <p>• You can send them a friend request again later</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={unfriending} className="px-6">
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-6"
            onClick={onConfirm}
            disabled={unfriending}
          >
            {unfriending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Unfriending...
              </span>
            ) : (
              <>
                <UserMinus className="w-4 h-4 mr-2" />
                Unfriend
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

