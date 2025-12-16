'use client';

import { Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Post {
  _id: string;
  content: string;
  imageUrl?: string;
  imagePublicId?: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  userId: string;
  stats?: {
    likes: number;
    comments: number;
    shares: number;
  };
  liked?: boolean;
}

interface PostActionsProps {
  post: Post;
  onLike: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onShare: (post: Post) => void;
}

export function PostActions({ post, onLike, onToggleComments, onShare }: PostActionsProps) {
  return (
    <>
      <Separator className="mb-4" />
      <div className="flex items-center justify-between text-slate-600">
        <Button
          variant="ghost"
          size="sm"
          className="hover:text-rose-600 hover:bg-rose-50"
          onClick={() => onLike(post._id)}
        >
          <Heart
            className="w-5 h-5 mr-2"
            fill={post.liked ? '#fb7185' : 'none'}
          />
          {post.stats?.likes ?? 0}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hover:text-blue-600 hover:bg-blue-50"
          onClick={() => onToggleComments(post._id)}
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          {post.stats?.comments ?? 0}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="hover:text-green-600 hover:bg-green-50"
          onClick={() => onShare(post)}
        >
          <Share2 className="w-5 h-5 mr-2" />
          {post.stats?.shares ?? 0}
        </Button>
        <Button variant="ghost" size="icon" className="hover:text-amber-600 hover:bg-amber-50">
          <Bookmark className="w-5 h-5" />
        </Button>
      </div>
    </>
  );
}