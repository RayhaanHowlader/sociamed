'use client';

import { Plus, Type } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

interface StoryGroup {
  userId: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  stories: Array<{
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
  }>;
  storyCount: number;
}

interface StoryCardProps {
  group?: StoryGroup;
  isCreateCard?: boolean;
  onCreateClick?: () => void;
  onStoryClick?: (group: StoryGroup, index: number) => void;
}

export function StoryCard({ group, isCreateCard = false, onCreateClick, onStoryClick }: StoryCardProps) {
  if (isCreateCard) {
    return (
      <Card
        className="flex-shrink-0 w-24 md:w-32 h-40 md:h-48 rounded-xl cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-slate-300 hover:border-blue-500"
        onClick={onCreateClick}
      >
        <div className="h-full flex flex-col items-center justify-center gap-2 p-4">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
            <Plus className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <p className="text-xs md:text-sm font-medium text-slate-600 text-center">Create Story</p>
        </div>
      </Card>
    );
  }

  if (!group) return null;

  return (
    <Card
      className="flex-shrink-0 w-24 md:w-32 h-40 md:h-48 rounded-xl cursor-pointer hover:shadow-lg transition-shadow overflow-hidden relative"
      onClick={() => onStoryClick?.(group, 0)}
    >
      <div className="h-full relative">
        {group.stories[0]?.type === 'image' && group.stories[0]?.mediaUrl ? (
          <img
            src={group.stories[0].mediaUrl}
            alt={group.author.name}
            className="w-full h-full object-cover"
          />
        ) : group.stories[0]?.type === 'video' && group.stories[0]?.mediaUrl ? (
          <video
            src={group.stories[0].mediaUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Type className="w-12 h-12 text-white opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6 border-2 border-white">
              <AvatarImage src={group.author.avatarUrl} />
              <AvatarFallback className="text-xs">{group.author.name[0]}</AvatarFallback>
            </Avatar>
            <p className="text-white text-xs font-medium truncate">{group.author.name}</p>
          </div>
        </div>
        {group.storyCount > 1 && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {group.storyCount}
          </div>
        )}
      </div>
    </Card>
  );
}