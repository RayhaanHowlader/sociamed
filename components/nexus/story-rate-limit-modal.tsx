'use client';

import { AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface StoryRateLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rateLimitError: {
    message: string;
    hoursRemaining: number;
  } | null;
}

export function StoryRateLimitModal({ open, onOpenChange, rateLimitError }: StoryRateLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <span>Story Limit Reached</span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-slate-700 mb-4">{rateLimitError?.message}</p>
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-lg">
                  {rateLimitError?.hoursRemaining === 1 
                    ? '1 hour remaining' 
                    : `${rateLimitError?.hoursRemaining || 0} hours remaining`}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  You can create your next story after this time period
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}