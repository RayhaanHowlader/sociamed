'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePreviewProps {
  preview: { url: string; type: 'image' | 'video' | 'audio'; file: File };
  onCancel: () => void;
}

export function FilePreview({ preview, onCancel }: FilePreviewProps) {
  return (
    <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
      {preview.type === 'image' ? (
        <img
          src={preview.url}
          alt="Preview"
          className="max-h-48 w-full object-contain"
        />
      ) : preview.type === 'video' ? (
        <video
          src={preview.url}
          controls
          className="max-h-48 w-full object-contain"
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="p-4">
          <div className="flex items-center gap-3">
            <audio
              src={preview.url}
              controls
              className="flex-1"
              preload="metadata"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
          <p className="text-xs text-slate-600 mt-2 truncate">
            {preview.file.name}
          </p>
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
        onClick={onCancel}
      >
        <X className="w-4 h-4 text-red-600" />
      </Button>
    </div>
  );
}

