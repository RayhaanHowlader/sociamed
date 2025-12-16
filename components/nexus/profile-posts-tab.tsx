'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserPost {
  id: string;
  content: string;
  imageUrl: string;
  createdAt: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  liked?: boolean;
}

interface PostComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
  };
}

interface ProfilePostsTabProps {
  posts: UserPost[];
  loadingPosts: boolean;
  hasMorePosts: boolean;
  loadingMorePosts: boolean;
  postComments: Record<string, PostComment[]>;
  commentInputs: Record<string, string>;
  onToggleLike: (postId: string) => void;
  onLoadComments: (postId: string) => void;
  onAddComment: (postId: string) => void;
  onLoadMorePosts: () => void;
  onCommentInputChange: (postId: string, value: string) => void;
}

export function ProfilePostsTab({
  posts,
  loadingPosts,
  hasMorePosts,
  loadingMorePosts,
  postComments,
  commentInputs,
  onToggleLike,
  onLoadComments,
  onAddComment,
  onLoadMorePosts,
  onCommentInputChange,
}: ProfilePostsTabProps) {
  if (loadingPosts) {
    return (
      <div className="text-center py-12 text-slate-500">
        Loading your posts...
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Your posts will appear here.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const commentsForPost = postComments[post.id] ?? [];
        const commentValue = commentInputs[post.id] ?? '';
        return (
          <Card
            key={post.id}
            className="border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <CardContent className="p-5 space-y-3">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {post.content}
              </p>
              {post.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-100">
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>
                  {new Date(post.createdAt).toLocaleString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>
                  {post.stats.likes} likes · {post.stats.comments} comments
                </span>
              </div>

              <div className="flex items-center gap-4 pt-2 text-sm">
                <button
                  type="button"
                  onClick={() => onToggleLike(post.id)}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-rose-600"
                >
                  <Heart
                    className="w-4 h-4"
                    fill={post.liked ? '#fb7185' : 'none'}
                  />
                  <span>{post.liked ? 'Liked' : 'Like'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onLoadComments(post.id)}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Comments</span>
                </button>
              </div>

              {commentsForPost.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {commentsForPost.map((c) => (
                    <div key={c.id} className="text-xs text-slate-700">
                      <span className="font-semibold">{c.author.name}</span>{' '}
                      <span className="text-slate-500">{c.author.username}</span>
                      <div>{c.content}</div>
                    </div>
                  ))}
                </div>
              )}

              {postComments[post.id] && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={commentValue}
                    onChange={(e) => onCommentInputChange(post.id, e.target.value)}
                    placeholder="Add a comment..."
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3 bg-gradient-to-r from-blue-600 to-cyan-600"
                    onClick={() => onAddComment(post.id)}
                  >
                    Post
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      
      {/* Load more posts button */}
      {hasMorePosts && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={onLoadMorePosts}
            disabled={loadingMorePosts}
            className="text-sm"
          >
            {loadingMorePosts ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Load more posts
          </Button>
        </div>
      )}
    </div>
  );
}