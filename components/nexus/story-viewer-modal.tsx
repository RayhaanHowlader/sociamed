'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Story {
  _id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content: string;
  mediaUrl: string;
  mediaPublicId: string;
  mediaItems?: Array<{
    url: string;
    publicId: string;
    type: 'image' | 'video';
  }>;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  expiresAt: string;
}

interface StoryGroup {
  userId: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  stories: Story[];
  storyCount: number;
}

interface StoryViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeStoryGroup: StoryGroup | null;
  activeStoryIndex: number;
  activeMediaIndex: number;
  progress: number;
  currentUserId: string | null;
  onStoryIndexChange: (index: number) => void;
  onMediaIndexChange: (index: number) => void;
  onProgressReset: () => void;
  onProgressUpdate: (progress: number) => void;
  onNextStory: () => void;
  onPrevStory: () => void;
  onEditStory: (story: Story) => void;
  onDeleteStory: (storyId: string) => void;
  onMediaDurationChange: (duration: number) => void;
}

export function StoryViewerModal({
  open,
  onOpenChange,
  activeStoryGroup,
  activeStoryIndex,
  activeMediaIndex,
  progress,
  currentUserId,
  onStoryIndexChange,
  onMediaIndexChange,
  onProgressReset,
  onProgressUpdate,
  onNextStory,
  onPrevStory,
  onEditStory,
  onDeleteStory,
  onMediaDurationChange,
}: StoryViewerModalProps) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  if (!activeStoryGroup || !activeStoryGroup.stories[activeStoryIndex]) {
    return null;
  }

  const currentStory = activeStoryGroup.stories[activeStoryIndex];
  const mediaItems = currentStory.mediaItems || (currentStory.mediaUrl ? [{
    url: currentStory.mediaUrl,
    publicId: currentStory.mediaPublicId,
    type: currentStory.type as 'image' | 'video'
  }] : []);

  const isFirstMedia = activeMediaIndex === 0;
  const isFirstStory = activeStoryIndex === 0;
  const isLastMedia = activeMediaIndex >= mediaItems.length - 1;
  const isLastStory = activeStoryIndex >= activeStoryGroup.stories.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 bg-black dark:bg-black dark:border-slate-800">
        <DialogTitle className="sr-only">
          {activeStoryGroup?.author.name}'s Story
        </DialogTitle>
        <DialogDescription className="sr-only">
          Viewing story from {activeStoryGroup?.author.name}
        </DialogDescription>
        <div className="relative h-[600px]">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 z-20 p-2 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex gap-1">
              {activeStoryGroup.stories.map((story, idx) => {
                const storyMediaItems = story.mediaItems || (story.mediaUrl ? [{
                  url: story.mediaUrl,
                  publicId: story.mediaPublicId,
                  type: story.type as 'image' | 'video'
                }] : []);
                const mediaCount = Math.max(storyMediaItems.length, 1);
                
                return (
                  <div key={idx} className="flex gap-1 flex-1">
                    {Array.from({ length: mediaCount }).map((_, mediaIdx) => {
                      const isActive = idx === activeStoryIndex && mediaIdx === activeMediaIndex;
                      const isPast = idx < activeStoryIndex || (idx === activeStoryIndex && mediaIdx < activeMediaIndex);
                      
                      return (
                        <div
                          key={mediaIdx}
                          className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden cursor-pointer"
                          onClick={() => {
                            onStoryIndexChange(idx);
                            onMediaIndexChange(mediaIdx);
                            onProgressReset();
                          }}
                        >
                          <div
                            className="h-full bg-white transition-all duration-100 rounded-full"
                            style={{
                              width: isPast ? '100%' : isActive ? `${progress}%` : '0%',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Story Content */}
          <div className="h-full w-full flex items-center justify-center overflow-hidden">
            {currentStory.type === 'text' ? (
              <div className="text-white text-center p-8">
                <p className="text-2xl md:text-4xl font-bold whitespace-pre-wrap">
                  {currentStory.content}
                </p>
              </div>
            ) : (() => {
              const currentMedia = mediaItems[activeMediaIndex];
              if (!currentMedia) return null;

              if (currentMedia.type === 'image') {
                return (
                  <img
                    src={currentMedia.url}
                    alt="Story"
                    className="w-full h-full object-cover"
                  />
                );
              } else {
                return (
                  <video
                    key={`${activeStoryIndex}-${activeMediaIndex}-${currentMedia.url}`}
                    ref={videoElementRef}
                    src={currentMedia.url}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    playsInline
                    muted={false}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      const duration = video.duration || 5;
                      onMediaDurationChange(duration);
                      onProgressReset();
                    }}
                    onTimeUpdate={(e) => {
                      const video = e.currentTarget;
                      if (video.duration) {
                        const currentProgress = (video.currentTime / video.duration) * 100;
                        onProgressUpdate(currentProgress);
                      }
                    }}
                    onEnded={() => {
                      // Small delay before auto-advancing to prevent immediate closure
                      setTimeout(onNextStory, 200);
                    }}
                  />
                );
              }
            })()}
          </div>

          {/* Author Info */}
          <div className="absolute top-12 left-0 right-0 z-10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={activeStoryGroup.author.avatarUrl} />
                  <AvatarFallback>{activeStoryGroup.author.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold">{activeStoryGroup.author.name}</p>
                  <p className="text-white/70 text-sm">@{activeStoryGroup.author.username}</p>
                </div>
              </div>
              {currentUserId === activeStoryGroup.userId && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStory(currentStory);
                      onOpenChange(false);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStory(currentStory._id);
                      onOpenChange(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
            onClick={onPrevStory}
            disabled={isFirstMedia && isFirstStory}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
            onClick={onNextStory}
            disabled={isLastMedia && isLastStory}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}