'use client';

import { useRef } from 'react';
import { Type, ImageIcon, Video, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface MediaPreview {
  url: string;
  type: 'image' | 'video';
  file: File;
}

interface StoryCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyType: 'text' | 'image' | 'video';
  textContent: string;
  mediaFiles: File[];
  mediaPreviews: MediaPreview[];
  uploading: boolean;
  onStoryTypeChange: (type: 'text' | 'image' | 'video') => void;
  onTextContentChange: (content: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: (index: number) => void;
  onCreateStory: () => void;
}

export function StoryCreateModal({
  open,
  onOpenChange,
  storyType,
  textContent,
  mediaFiles,
  mediaPreviews,
  uploading,
  onStoryTypeChange,
  onTextContentChange,
  onFileChange,
  onRemoveMedia,
  onCreateStory,
}: StoryCreateModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTypeChange = (type: 'text' | 'image' | 'video') => {
    onStoryTypeChange(type);
    if (type !== 'text') {
      fileInputRef.current?.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Story Type Selection */}
          <div className="flex gap-2">
            <Button
              variant={storyType === 'text' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleTypeChange('text')}
            >
              <Type className="w-4 h-4 mr-2" />
              Text
            </Button>
            <Button
              variant={storyType === 'image' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleTypeChange('image')}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Image{mediaFiles.length > 0 && ` (${mediaFiles.length})`}
            </Button>
            <Button
              variant={storyType === 'video' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleTypeChange('video')}
            >
              <Video className="w-4 h-4 mr-2" />
              Video{mediaFiles.length > 0 && ` (${mediaFiles.length})`}
            </Button>
          </div>

          {/* Text Story */}
          {storyType === 'text' && (
            <Textarea
              placeholder="What's on your mind?"
              value={textContent}
              onChange={(e) => onTextContentChange(e.target.value)}
              className="min-h-[200px]"
              maxLength={500}
            />
          )}

          {/* Media Previews - Multiple */}
          {mediaPreviews.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                {mediaPreviews.length} {mediaPreviews.length === 1 ? 'file' : 'files'} selected
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {preview.type === 'image' ? (
                      <img
                        src={preview.url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 md:h-40 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <video
                        src={preview.url}
                        className="w-full h-32 md:h-40 object-cover rounded-lg border border-slate-200"
                        controls
                      />
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveMedia(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Input - Multiple */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={onFileChange}
            className="hidden"
          />

          <Button
            onClick={onCreateStory}
            disabled={uploading || (storyType === 'text' && !textContent.trim()) || (storyType !== 'text' && mediaPreviews.length === 0)}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading story...
              </>
            ) : (
              'Create Story'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}