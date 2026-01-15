'use client';

import { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

interface PostCommentsProps {
  postId: string;
  comments: PostComment[];
  commentValue: string;
  isOpen: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  currentUserId: string | null;
  onCommentChange: (postId: string, value: string) => void;
  onAddComment: (postId: string) => void;
  onLoadMore: (postId: string) => void;
}

export function PostComments({
  postId,
  comments,
  commentValue,
  isOpen,
  hasMore,
  loadingMore,
  currentUserId,
  onCommentChange,
  onAddComment,
  onLoadMore,
}: PostCommentsProps) {
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  return (
    <>
      {comments.length > 0 && (
        <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3">
          <div
            ref={commentsContainerRef}
            className="max-h-[300px] overflow-y-auto space-y-2 text-sm pr-2"
            onScroll={(e) => {
              const container = e.currentTarget;
              const { scrollTop, scrollHeight, clientHeight } = container;
              // Load more when scrolled near bottom (within 50px)
              if (
                scrollHeight - (scrollTop + clientHeight) < 50 &&
                hasMore &&
                !loadingMore
              ) {
                onLoadMore(postId);
              }
            }}
          >
            {comments.map((c) => (
              <div key={c.id} className="text-slate-700 dark:text-slate-200">
                <span 
                  className="font-semibold cursor-pointer hover:underline dark:text-white"
                  onClick={() => {
                    if (c.userId && c.userId !== currentUserId) {
                      window.dispatchEvent(new CustomEvent('view-profile', { detail: { userId: c.userId } }));
                    }
                  }}
                >
                  {c.author.name}
                </span>{' '}
                <span className="text-slate-500 dark:text-slate-400 text-xs">{c.author.username}</span>
                <div>{c.content}</div>
              </div>
            ))}
            {/* Load more button or loading indicator */}
            {hasMore && !loadingMore && (
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLoadMore(postId)}
                  className="text-xs"
                >
                  Load more comments
                </Button>
              </div>
            )}
            {loadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Input
          value={commentValue}
          onChange={(e) => onCommentChange(postId, e.target.value)}
          placeholder="Add a comment..."
          className="h-8 text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
        />
        <Button
          type="button"
          size="sm"
          className="h-8 px-3 bg-gradient-to-r from-blue-600 to-cyan-600"
          onClick={() => onAddComment(postId)}
        >
          Post
        </Button>
      </div>
    </>
  );
}