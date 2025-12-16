'use client';

import { useState, useEffect, useRef } from 'react';

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

export function useStoryViewer() {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(5);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (viewerOpen && activeStoryGroup) {
      const currentStory = activeStoryGroup.stories[activeStoryIndex];
      const mediaItems = currentStory?.mediaItems || (currentStory?.mediaUrl ? [{
        url: currentStory.mediaUrl,
        publicId: currentStory.mediaPublicId,
        type: currentStory.type as 'image' | 'video'
      }] : []);

      const currentMedia = mediaItems[activeMediaIndex];
      const isVideo = currentMedia?.type === 'video';
      const duration = isVideo ? mediaDuration : 5;
      const intervalMs = duration * 1000;

      // Auto-advance media items or stories based on duration
      const interval = setInterval(() => {
        if (mediaItems.length > 1 && activeMediaIndex < mediaItems.length - 1) {
          setActiveMediaIndex((prev) => prev + 1);
        } else {
          setActiveStoryIndex((prev) => {
            if (prev < activeStoryGroup.stories.length - 1) {
              setActiveMediaIndex(0);
              return prev + 1;
            } else {
              setViewerOpen(false);
              return prev;
            }
          });
        }
      }, intervalMs);

      // Progress bar - only update for images (videos use onTimeUpdate)
      if (!isVideo) {
        const progressUpdateInterval = 50;
        const progressIncrement = (100 / duration) * (progressUpdateInterval / 1000);

        progressIntervalRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              return 0;
            }
            return Math.min(prev + progressIncrement, 100);
          });
        }, progressUpdateInterval);
      } else {
        progressIntervalRef.current = null;
      }

      return () => {
        clearInterval(interval);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    } else {
      setProgress(0);
      setActiveMediaIndex(0);
      setMediaDuration(5);
    }
  }, [viewerOpen, activeStoryGroup, activeStoryIndex, activeMediaIndex, mediaDuration]);

  const openStoryViewer = (group: StoryGroup, index: number = 0) => {
    setActiveStoryGroup(group);
    setActiveStoryIndex(index);
    setActiveMediaIndex(0);
    setViewerOpen(true);
    setProgress(0);
  };

  const nextStory = () => {
    if (activeStoryGroup) {
      const currentStory = activeStoryGroup.stories[activeStoryIndex];
      const mediaItems = currentStory.mediaItems || (currentStory.mediaUrl ? [{
        url: currentStory.mediaUrl,
        publicId: currentStory.mediaPublicId,
        type: currentStory.type as 'image' | 'video'
      }] : []);

      if (mediaItems.length > 1 && activeMediaIndex < mediaItems.length - 1) {
        setActiveMediaIndex(activeMediaIndex + 1);
        setProgress(0);
      } else if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
        setActiveStoryIndex(activeStoryIndex + 1);
        setActiveMediaIndex(0);
        setProgress(0);
      }
    }
  };

  const prevStory = () => {
    if (activeStoryGroup) {
      const currentStory = activeStoryGroup.stories[activeStoryIndex];
      const mediaItems = currentStory.mediaItems || (currentStory.mediaUrl ? [{
        url: currentStory.mediaUrl,
        publicId: currentStory.mediaPublicId,
        type: currentStory.type as 'image' | 'video'
      }] : []);

      if (mediaItems.length > 1 && activeMediaIndex > 0) {
        setActiveMediaIndex(activeMediaIndex - 1);
        setProgress(0);
      } else if (activeStoryIndex > 0) {
        const prevStory = activeStoryGroup.stories[activeStoryIndex - 1];
        const prevMediaItems = prevStory.mediaItems || (prevStory.mediaUrl ? [{
          url: prevStory.mediaUrl,
          publicId: prevStory.mediaPublicId,
          type: prevStory.type as 'image' | 'video'
        }] : []);
        setActiveStoryIndex(activeStoryIndex - 1);
        setActiveMediaIndex(prevMediaItems.length - 1);
        setProgress(0);
      }
    }
  };

  return {
    viewerOpen,
    setViewerOpen,
    activeStoryGroup,
    activeStoryIndex,
    setActiveStoryIndex,
    activeMediaIndex,
    setActiveMediaIndex,
    progress,
    setProgress,
    mediaDuration,
    setMediaDuration,
    openStoryViewer,
    nextStory,
    prevStory,
  };
}