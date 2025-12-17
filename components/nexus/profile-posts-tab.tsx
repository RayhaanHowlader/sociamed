'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

interface ProfilePostsTabProps {
  posts: UserPost[];
  loadingPosts: boolean;
  hasMorePosts: boolean;
  loadingMorePosts: boolean;
  onLoadMorePosts: () => void;
}

export function ProfilePostsTab({
  posts,
  loadingPosts,
  hasMorePosts,
  loadingMorePosts,
  onLoadMorePosts,
}: ProfilePostsTabProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll using IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current || !hasMorePosts || loadingMorePosts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !loadingMorePosts) {
          onLoadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMorePosts, loadingMorePosts, onLoadMorePosts]);

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
      {posts.map((post) => (
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
            </CardContent>
          </Card>
        ))}
      
      {/* Infinite scroll trigger and loading indicator */}
      {hasMorePosts && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loadingMorePosts && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading more posts...
            </div>
          )}
        </div>
      )}
      
      {/* End message */}
      {!hasMorePosts && posts.length > 0 && (
        <div className="text-center py-6 text-slate-400 text-sm">
          You've reached the end
        </div>
      )}
    </div>
  );
}