'use client';

import { useState, useEffect } from 'react';
import { Loader2, Heart, MessageCircle, Trash2, Eye } from 'lucide-react';
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
  views?: number; // Add views at top level
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
  const [viewTracked, setViewTracked] = useState(false);
  const [views, setViews] = useState(0);
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null);
  const [totalWatchTime, setTotalWatchTime] = useState(0);

  // Track the current short ID to prevent unnecessary reloads
  const [currentShortId, setCurrentShortId] = useState<string | null>(null);

  useEffect(() => {
    if (open && short?._id) {
      // Only reload comments if it's a different short
      if (currentShortId !== short._id) {
        void loadComments(short._id);
        setCurrentShortId(short._id);
        setViewTracked(false);
        setVideoStartTime(null);
        setTotalWatchTime(0);
      }
      // Always update views from the short object (but don't reload comments)
      setViews(short.stats?.views || 0);
    } else {
      setShortComments([]);
      setCommentInput('');
      setViewTracked(false);
      setViews(0);
      setCurrentShortId(null);
      setVideoStartTime(null);
      setTotalWatchTime(0);
    }
  }, [open, short?._id, short?.stats?.views]); // Depend on views to update when parent updates

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

  const trackView = async (watchTime: number = 0, completed: boolean = false) => {
    if (!short?._id) {
      console.log('No short ID available for view tracking');
      return;
    }

    if (viewTracked) {
      console.log('View already tracked for this session, skipping');
      return;
    }

    console.log('Tracking view for short:', short._id, 'Watch time:', watchTime, 'Completed:', completed);
    try {
      const res = await fetch('/api/shorts/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          shortId: short._id,
          watchTime,
          completed
        }),
      });
      const data = await res.json();
      console.log('View tracking response:', data);
      
      if (res.ok && data.newView) {
        // Only update if it's actually a new view
        console.log('New view tracked, incrementing local count');
        
        // Update local views state immediately (increment by 1)
        setViews(prev => prev + 1);
        setViewTracked(true);
        
        // Update short stats in parent component with incremented value
        if (short) {
          const currentViews = short.stats?.views || short.views || 0;
          const updatedShort = {
            ...short,
            stats: {
              ...short.stats,
              views: currentViews + 1,
            },
            views: currentViews + 1, // Also update the top-level views field
          };
          console.log('Updating short with incremented views:', updatedShort);
          onShortUpdated(updatedShort);
        }
      } else if (res.ok && !data.newView) {
        // View was already counted, just mark as tracked
        console.log('View already counted, marking as tracked');
        setViewTracked(true);
      } else {
        console.error('View tracking failed:', data);
      }
    } catch (err) {
      console.error('Error tracking view:', err);
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

      // Update short stats - preserve all existing stats including views
      if (short) {
        const updatedShort = {
          ...short,
          stats: {
            ...short.stats, // Preserve all existing stats
            comments: (short.stats?.comments ?? 0) + 1, // Only increment comments
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
      <DialogContent className="w-[95vw] max-w-6xl h-[95vh] max-h-[900px] p-0 gap-0 overflow-hidden dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader className="p-3 md:p-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <DialogTitle className="flex items-center justify-between dark:text-white">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 h-6 md:h-8 md:w-8">
                <AvatarImage src={short.author.avatarUrl} />
                <AvatarFallback>{short.author.name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs md:text-sm font-semibold dark:text-white">{short.author.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">@{short.author.username}</p>
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
                className="ml-auto h-8 px-3"
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col md:grid md:grid-cols-[minmax(0,2fr),minmax(0,1fr)] gap-0 md:gap-4 p-3 md:p-4 min-h-0 overflow-hidden">
          {/* Video Section */}
          <div className="bg-black rounded-lg md:rounded-xl overflow-hidden flex-shrink-0 h-[40vh] md:h-auto">
            <video
              src={short.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              style={{ maxHeight: '70vh' }}
              onPlay={(e) => {
                // Track when video starts playing
                const video = e.currentTarget;
                setVideoStartTime(video.currentTime);
              }}
              onPause={(e) => {
                // Update total watch time when paused
                const video = e.currentTarget;
                if (videoStartTime !== null) {
                  const watchedDuration = video.currentTime - videoStartTime;
                  setTotalWatchTime(prev => prev + watchedDuration);
                  setVideoStartTime(null);
                }
              }}
              onSeeking={(e) => {
                // Reset start time when seeking
                const video = e.currentTarget;
                setVideoStartTime(video.currentTime);
              }}
              onEnded={(e) => {
                // Track view when video ends completely
                const video = e.currentTarget;
                if (videoStartTime !== null) {
                  const watchedDuration = video.currentTime - videoStartTime;
                  const finalWatchTime = totalWatchTime + watchedDuration;
                  console.log('Video ended! Total watch time:', finalWatchTime, 'seconds');
                  trackView(Math.round(finalWatchTime), true);
                } else {
                  console.log('Video ended! Total watch time:', totalWatchTime, 'seconds');
                  trackView(Math.round(totalWatchTime), true);
                }
              }}
            />
          </div>
          
          {/* Content Section - Scrollable on mobile */}
          <div className="flex-1 flex flex-col min-h-0 mt-3 md:mt-0">
            {/* Stats and Actions */}
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 flex-shrink-0 mb-3">
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
              <div className="inline-flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{views}</span>
              </div>
            </div>
            
            {/* Caption and Date */}
            <div className="flex-shrink-0 space-y-2 mb-3">
              {short.caption && (
                <p className="text-sm text-slate-800 dark:text-slate-200 break-words">{short.caption}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Shared {new Date(short.createdAt).toLocaleString()}
              </p>
            </div>
            
            {/* Comments Section - Scrollable */}
            <div className="flex-1 min-h-0 border-t border-slate-200 dark:border-slate-700 pt-3">
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto space-y-3 mb-3">
                  {commentsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading comments...
                    </div>
                  ) : shortComments.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500">No comments yet. Be the first to comment!</p>
                  ) : (
                    shortComments.map((comment) => (
                      <div key={comment.id} className="text-xs space-y-0.5">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          {comment.author.name}{' '}
                          <span className="text-slate-400 dark:text-slate-500">@{comment.author.username}</span>
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 break-words">{comment.content}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Add Comment Section - Fixed at bottom */}
                <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Add a comment</label>
                  <Textarea
                    rows={2}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Share your thoughts…"
                    className="text-sm resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 h-8 px-4"
                      onClick={addComment}
                      disabled={!commentInput.trim()}
                    >
                      Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

