'use client';

import { useState, useEffect } from 'react';

interface MediaItem {
  url: string;
  publicId: string;
  type: 'image' | 'video';
}

interface Story {
  _id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content: string;
  mediaUrl: string;
  mediaPublicId: string;
  mediaItems?: MediaItem[];
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

export function useStoryData() {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(String(data.user.sub));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stories', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setStoryGroups(data.stories ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
    fetchCurrentUser();
  }, []);

  return {
    storyGroups,
    loading,
    currentUserId,
    fetchStories,
  };
}