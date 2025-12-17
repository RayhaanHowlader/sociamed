'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BannerImageViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string;
  userName?: string;
  userUsername?: string;
  userAvatarUrl?: string;
}

export function BannerImageViewer({ 
  open, 
  onOpenChange, 
  imageUrl, 
  userName, 
  userUsername,
  userAvatarUrl 
}: BannerImageViewerProps) {
  if (!open || !imageUrl) {
    return null;
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${userName || 'user'}-banner-image.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s Banner Image`,
          text: `Check out ${userName}'s banner image`,
          url: imageUrl,
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(imageUrl);
        alert('Image URL copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden bg-slate-950 text-white border border-slate-800">
        <DialogTitle className="sr-only">
          {userName ? `${userName}'s Banner Image` : 'Banner Image'}
        </DialogTitle>
        <div className="grid gap-0 md:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)] max-h-[85vh]">
          <div className="relative bg-black flex items-center justify-center">
            <img
              src={imageUrl}
              alt={`${userName}'s banner image`}
              className="max-h-[85vh] w-full object-contain"
            />
            <a
              href={imageUrl}
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
              {userName && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={userAvatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 text-white">
                      {userName[0]?.toUpperCase() ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-semibold text-white">{userName}</p>
                    {userUsername && (
                      <p className="text-sm text-blue-200">@{userUsername}</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-slate-300 leading-relaxed">Banner Image</p>
                <p className="text-xs text-slate-400 mt-1">Profile cover photo</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Tap outside or press Esc to close
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}