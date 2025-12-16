'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';

interface ImageViewerData {
  url: string;
  senderName?: string;
  senderAvatar?: string;
  senderUsername?: string;
  timestamp?: string;
  caption?: string;
  fileName?: string;
}

interface ImageViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ImageViewerData | null;
}

export function ImageViewerModal({ open, onOpenChange, image }: ImageViewerModalProps) {
  if (!open || !image) {
    return null;
  }

  const formattedDate = image.timestamp
    ? format(new Date(image.timestamp), "MMM d, yyyy · h:mm a")
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden bg-slate-950 text-white border border-slate-800">
        <DialogTitle className="sr-only">
          {image.caption || image.fileName || 'Image Viewer'}
        </DialogTitle>
        <div className="grid gap-0 md:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)] max-h-[85vh]">
          <div className="relative bg-black flex items-center justify-center">
            <img
              src={image.url}
              alt={image.caption || image.fileName || 'Chat image'}
              className="max-h-[85vh] w-full object-contain"
            />
            <a
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open original
            </a>
          </div>

          <div className="flex flex-col justify-between bg-slate-900/80 p-6">
            <div className="space-y-4">
              {(image.senderName || image.senderUsername) && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={image.senderAvatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 text-white">
                      {image.senderName?.[0] ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-white">{image.senderName}</p>
                    {image.senderUsername && (
                      <p className="text-xs text-blue-200">{image.senderUsername}</p>
                    )}
                  </div>
                </div>
              )}

              {image.caption && (
                <div>
                  <p className="text-sm text-slate-100 leading-relaxed">{image.caption}</p>
                </div>
              )}

              {image.fileName && (
                <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                  {image.fileName}
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              {formattedDate && <p>{formattedDate}</p>}
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Tap outside or press Esc to close</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
