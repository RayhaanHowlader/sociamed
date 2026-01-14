"use client";

import { Trash2, AlertTriangle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ShortItem {
  _id: string;
  caption: string;
  videoUrl: string;
  createdAt: string;
  duration: number;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
}

interface DeleteShortModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  short: ShortItem | null;
  onConfirm: () => void;
  deleting?: boolean;
}

export function DeleteShortModal({
  open,
  onOpenChange,
  short,
  onConfirm,
  deleting = false,
}: DeleteShortModalProps) {
  if (!short) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 text-white shadow-lg shadow-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                Delete this short?
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                This action will permanently remove the video from Nexus and Cloudinary. You can’t undo this.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50/70 dark:bg-red-900/20 p-4 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-red-900 dark:text-red-300">
              <AlertTriangle className="w-5 h-5" />
              <div className="font-medium">You’re about to permanently delete this video.</div>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-red-700 dark:text-red-400">
              <li>• The short will be removed from everyone’s feed immediately.</li>
              <li>• The video file will be deleted from Cloudinary storage.</li>
              <li>• Likes and comments tied to this short will be lost.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-md shadow-red-500/30"
          >
            {deleting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Deleting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete short
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
