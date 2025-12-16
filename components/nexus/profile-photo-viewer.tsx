'use client';

import { useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfilePhotoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrl?: string;
  userName: string;
  userUsername: string;
  fallbackText: string;
}

export function ProfilePhotoViewer({
  open,
  onOpenChange,
  photoUrl,
  userName,
  userUsername,
  fallbackText,
}: ProfilePhotoViewerProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleDownload = async () => {
    if (!photoUrl) return;
    
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${userUsername}-profile-photo.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const handleShare = async () => {
    if (!photoUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userName}'s Profile Photo`,
          text: `Check out ${userName}'s profile photo`,
          url: photoUrl,
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(photoUrl);
        // You could show a toast notification here
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  const resetImageState = () => {
    setImageLoading(true);
    setImageError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={photoUrl} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                  {fallbackText}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-semibold">{userName}</p>
                <p className="text-white/70 text-sm">@{userUsername}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {photoUrl && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className="text-white hover:bg-white/20"
                    title="Share photo"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    className="text-white hover:bg-white/20"
                    title="Download photo"
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Photo Content */}
          <div className="flex-1 flex items-center justify-center p-4">
            {photoUrl && !imageError ? (
              <div className="relative max-w-full max-h-full">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <img
                  src={photoUrl}
                  alt={`${userName}'s profile photo`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                  style={{ display: imageLoading ? 'none' : 'block' }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-white">{fallbackText}</span>
                </div>
                <p className="text-white text-lg font-semibold mb-2">{userName}</p>
                <p className="text-white/70">@{userUsername}</p>
                {imageError && (
                  <p className="text-white/50 text-sm mt-4">Failed to load profile photo</p>
                )}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-black/50 backdrop-blur-sm">
            <p className="text-white/70 text-center text-sm">
              {photoUrl ? `${userName}'s Profile Photo` : `${userName} hasn't set a profile photo yet`}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}