'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface DeleteGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGroup: Group | null;
  deleteError: string;
  deleting: boolean;
  onDeleteGroup: () => void;
}

export function DeleteGroupModal({
  open,
  onOpenChange,
  selectedGroup,
  deleteError,
  deleting,
  onDeleteGroup
}: DeleteGroupModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete group</DialogTitle>
          <DialogDescription>
            This will permanently delete the group and its conversations for all members. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-slate-700">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{selectedGroup?.name}</span>?
          </p>
          {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700"
            onClick={onDeleteGroup}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}