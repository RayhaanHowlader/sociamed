'use client';

import { useRef, useState } from 'react';
import { Type, ImageIcon, Video, X, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { VideoRecorder } from './video-recorder';

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
  isEditing?: boolean;
  onStoryTypeChange: (type: 'text' | 'image' | 'video') => void;
  onTextContentChange: (content: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: (index: number) => void;
  onCreateStory: () => void;
  onVideoRecorded?: (videoBlob: Blob, videoUrl: string) => void;
}

export function StoryCreateModal({
  open,
  onOpenChange,
  storyType,
  textContent,
  mediaFiles,
  mediaPreviews,
  uploading,
  isEditing = false,
  onStoryTypeChange,
  onTextContentChange,
  onFileChange,
  onRemoveMedia,
  onCreateStory,
  onVideoRecorded,
}: StoryCreateModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);

  const handleTypeChange = (type: 'text' | 'image' | 'video') => {
    onStoryTypeChange(type);
    if (type === 'image') {
      fileInputRef.current?.click();
    } else if (type === 'video') {
      // Don't auto-open file picker for video, let user choose between file or camera
    }
  };

  const handleVideoRecorded = (videoBlob: Blob, videoUrl: string) => {
    console.log('Story modal received video:', { 
      blobSize: videoBlob.size, 
      blobType: videoBlob.type, 
      videoUrl: videoUrl.substring(0, 50) + '...' 
    });
    
    if (onVideoRecorded) {
      onVideoRecorded(videoBlob, videoUrl);
    }
    setVideoRecorderOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Story' : 'Create Story'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Story Type Selection */}
          <div className="flex gap-2">
            <Button
              variant={storyType === 'text' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleTypeChange('text')}
              disabled={isEditing}
            >
              <Type className="w-4 h-4 mr-2" />
              Text
            </Button>
            <Button
              variant={storyType === 'image' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleTypeChange('image')}
              disabled={isEditing}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Image{mediaFiles.length > 0 && ` (${mediaFiles.length})`}
            </Button>
            <Button
              variant={storyType === 'video' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleTypeChange('video')}
              disabled={isEditing}
            >
              <Video className="w-4 h-4 mr-2" />
              Video{mediaFiles.length > 0 && ` (${mediaFiles.length})`}
            </Button>
          </div>
          
          {isEditing && (
            <p className="text-xs text-slate-500 text-center">
              Story type cannot be changed when editing
            </p>
          )}

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

          {/* Video Recording Options */}
          {storyType === 'video' && mediaPreviews.length === 0 && !isEditing && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Choose how to add video:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center gap-2"
                  onClick={() => setVideoRecorderOpen(true)}
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-sm">Record Video</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Video className="w-6 h-6" />
                  <span className="text-sm">Upload Video</span>
                </Button>
              </div>
            </div>
          )}

          {/* Add Media Options for Editing */}
          {isEditing && (storyType === 'image' || storyType === 'video') && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Add more media:</p>
              <div className="flex gap-3">
                {storyType === 'video' && (
                  <Button
                    variant="outline"
                    className="flex-1 h-12 flex items-center gap-2"
                    onClick={() => setVideoRecorderOpen(true)}
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-sm">Record Video</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 h-12 flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {storyType === 'image' ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  <span className="text-sm">Upload {storyType === 'image' ? 'Image' : 'Video'}</span>
                </Button>
              </div>
            </div>
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
                      <div className="relative w-full h-32 md:h-40 rounded-lg border border-slate-200 overflow-hidden bg-black">
                        <video
                          src={preview.url}
                          className="w-full h-full object-cover"
                          controls
                          preload="metadata"
                          playsInline
                          muted
                          onLoadStart={() => console.log('Video loading started:', preview.url)}
                          onLoadedData={() => console.log('Video data loaded:', preview.url)}
                          onError={(e) => console.error('Video load error:', e, preview.url)}
                        />
                        {/* Video overlay indicator */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          Video
                        </div>
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={() => onRemoveMedia(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10">
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
                {isEditing ? 'Updating story...' : 'Uploading story...'}
              </>
            ) : (
              isEditing ? 'Update Story' : 'Create Story'
            )}
          </Button>
        </div>
      </DialogContent>

      <VideoRecorder
        open={videoRecorderOpen}
        onOpenChange={setVideoRecorderOpen}
        onVideoRecorded={handleVideoRecorded}
      />
    </Dialog>
  );
}