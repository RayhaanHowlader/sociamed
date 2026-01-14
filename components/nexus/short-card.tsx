'use client';

import { Video, Heart, MessageCircle, Trash2, Share, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ShortItem {
  _id: string;
  caption: string;
  videoUrl: string;
  createdAt: string;
  duration: number;
  userId?: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  stats?: {
    likes?: number;
    comments?: number;
    views?: number;
  };
  liked?: boolean;
}

interface ShortCardProps {
  short: ShortItem;
  currentUserId?: string;
  onView: (short: ShortItem) => void;
  onLike: (shortId: string) => void;
  onDelete: (shortId: string) => void;
  onShare: (short: ShortItem) => void;
}

export function ShortCard({ short, currentUserId, onView, onLike, onDelete, onShare }: ShortCardProps) {
  const isOwnShort = currentUserId && short.userId === currentUserId;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow relative dark:border-slate-700 dark:bg-slate-900"
      onClick={() => onView(short)}
    >
      {isOwnShort && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(short._id);
          }}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
          aria-label="Delete short"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <CardContent className="p-0">
        <div className="relative aspect-[9/16] bg-black rounded-t-lg overflow-hidden">
          <video
            src={short.videoUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            onMouseEnter={(e) => {
              const video = e.currentTarget;
              video.play().catch(() => {
                // Ignore autoplay errors
              });
            }}
            onMouseLeave={(e) => {
              const video = e.currentTarget;
              video.pause();
              video.currentTime = 0;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarImage src={short.author.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs">
                  {short.author.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{short.author.name}</p>
                <p className="text-xs text-white/80">@{short.author.username}</p>
              </div>
            </div>
            {short.caption && (
              <p className="text-xs text-white line-clamp-2">{short.caption}</p>
            )}
            <div className="mt-2 flex items-center justify-between text-xs text-white">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(short._id);
                }}
                className="inline-flex items-center gap-1 hover:text-red-500 transition-colors"
              >
                <Heart
                  className={`w-4 h-4 ${short.liked ? 'fill-red-500 text-red-500' : ''}`}
                />
                <span>{short.stats?.likes ?? 0}</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{short.stats?.comments ?? 0}</span>
              </button>
              <div className="inline-flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{short.stats?.views ?? 0}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(short);
                }}
                className="inline-flex items-center gap-1 hover:text-green-500 transition-colors"
              >
                <Share className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

