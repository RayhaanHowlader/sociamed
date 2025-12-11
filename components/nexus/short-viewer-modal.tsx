'use client';

import { useState, useEffect } from 'react';
import { Loader2, Heart, MessageCircle, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
  };
  liked?: boolean;
}

interface ShortComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
  };
}

interface ShortViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  short: ShortItem | null;
  currentUserId?: string;
  onLike: (shortId: string) => void;
  onDelete: (shortId: string) => void;
  onShortUpdated: (updatedShort: ShortItem) => void;
}

export function ShortViewerModal({
  open,
  onOpenChange,
  short,
  currentUserId,
  onLike,
  onDelete,
  onShortUpdated,
}: ShortViewerModalProps) {
  const isOwnShort = currentUserId && short?.userId === currentUserId;
  const [shortComments, setShortComments] = useState<ShortComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    if (open && short?._id) {
      void loadComments(short._id);
    } else {
      setShortComments([]);
      setCommentInput('');
    }
  }, [open, short]);

  const loadComments = async (shortId: string) => {
    try {
      setCommentsLoading(true);
      const res = await fetch(`/api/shorts/comments?shortId=${shortId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load comments');
        return;
      }
      setShortComments(data.comments ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const addComment = async () => {
    if (!short?._id) return;

    const text = commentInput.trim();
    if (!text) return;

    try {
      const res = await fetch('/api/shorts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shortId: short._id, content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to add comment');
        return;
      }

      setShortComments((prev) => [...prev, data.comment]);
      setCommentInput('');

      // Update short stats
      if (short) {
        const updatedShort = {
          ...short,
          stats: {
            likes: short.stats?.likes ?? 0,
            comments: (short.stats?.comments ?? 0) + 1,
          },
        };
        onShortUpdated(updatedShort);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!short) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={short.author.avatarUrl} />
                <AvatarFallback>{short.author.name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{short.author.name}</p>
                <p className="text-xs text-slate-500">{short.author.username}</p>
              </div>
            </div>
            {isOwnShort && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(short._id);
                  onOpenChange(false);
                }}
                className="ml-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 grid gap-4 md:grid-cols-[minmax(0,2fr),minmax(0,1fr)] items-start">
          <div className="bg-black rounded-xl overflow-hidden">
            <video
              src={short.videoUrl}
              controls
              autoPlay
              className="w-full h-full max-h-[70vh] object-contain"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <button
                type="button"
                onClick={() => onLike(short._id)}
                className="inline-flex items-center gap-1 hover:text-red-500 transition-colors"
              >
                <Heart
                  className={`w-4 h-4 ${short.liked ? 'fill-red-500 text-red-500' : ''}`}
                />
                <span>{short.stats?.likes ?? 0}</span>
              </button>
              <div className="inline-flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{short.stats?.comments ?? 0}</span>
              </div>
            </div>
            {short.caption && (
              <p className="text-sm text-slate-800">{short.caption}</p>
            )}
            <p className="text-xs text-slate-500">
              Shared {new Date(short.createdAt).toLocaleString()}
            </p>
            <div className="pt-2 border-t border-slate-200 space-y-3 max-h-[40vh] overflow-y-auto">
              {commentsLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading comments...
                </div>
              ) : shortComments.length === 0 ? (
                <p className="text-xs text-slate-400">No comments yet. Be the first to comment!</p>
              ) : (
                shortComments.map((comment) => (
                  <div key={comment.id} className="text-xs space-y-0.5">
                    <p className="font-semibold text-slate-700">
                      {comment.author.name}{' '}
                      <span className="text-slate-400">@{comment.author.username}</span>
                    </p>
                    <p className="text-slate-700">{comment.content}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <label className="text-xs font-medium text-slate-600">Add a comment</label>
              <Textarea
                rows={2}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Share your thoughts…"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-cyan-600"
                  onClick={addComment}
                >
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

