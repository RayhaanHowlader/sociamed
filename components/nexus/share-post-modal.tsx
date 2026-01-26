'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Send, AlertCircle, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

interface Friend {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface Post {
  _id: string;
  content: string;
  imageUrl?: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

interface SharePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post | null;
  onShareSuccess?: (sharedCount: number) => void;
  socket?: Socket | null; // Use existing socket instead of creating new one
  isSocketConnected?: boolean;
}

export function SharePostModal({ open, onOpenChange, post, onShareSuccess, socket, isSocketConnected }: SharePostModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (open) {
      loadFriends();
      setSelectedFriends(new Set());
      setMessage('');
      setError('');
    }
  }, [open]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/friends/list', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load friends');
        return;
      }
      setFriends(data.friends ?? []);
    } catch (err) {
      console.error(err);
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleShare = async () => {
    if (!post || selectedFriends.size === 0) return;

    setSharing(true);
    setError('');

    try {
      const res = await fetch('/api/posts/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          postId: post._id,
          friendIds: Array.from(selectedFriends),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to share post');
        return;
      }

      // Emit socket events for real-time delivery using existing socket
      if (socket && data.messages) {
        console.log('[share] Using existing socket, connected:', isSocketConnected);
        console.log('[share] Emitting socket messages:', data.messages.length);
        console.log('[share] Messages to emit:', data.messages);
        
        if (isSocketConnected) {
          data.messages.forEach((message: any, index: number) => {
            console.log(`[share] Emitting message ${index + 1}/${data.messages.length}:`, {
              id: message.id,
              fromUserId: message.fromUserId,
              toUserId: message.toUserId,
              hasSharedPost: !!message.sharedPostData,
              content: message.content?.substring(0, 50) + '...'
            });
            socket.emit('chat:message', message);
          });
        } else {
          console.log('[share] Socket not connected, messages will be delivered on next refresh');
        }
      }

      // Call success callback and close modal
      onShareSuccess?.(data.sharedCount || selectedFriends.size);
      onOpenChange(false);
      setSelectedFriends(new Set());
      setMessage('');
    } catch (err) {
      console.error(err);
      setError('Failed to share post');
    } finally {
      setSharing(false);
    }
  };

  const filteredFriends = friends.filter((friend) =>
    `${friend.name} ${friend.username}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[90vw] max-h-[85vh] overflow-y-auto dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Share Post</DialogTitle>
          <DialogDescription className="dark:text-slate-300">
            Share this post with your friends via messages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-1">
          {/* Compact Post Preview */}
          {post && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 border dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={post.author.avatarUrl} />
                  <AvatarFallback className="text-xs">{post.author.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{post.author.name}</p>
                </div>
              </div>
              {post.content && (
                <p className="text-xs text-slate-700 dark:text-slate-300 mb-1 overflow-hidden" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {post.content}
                </p>
              )}
              {post.imageUrl && (
                <div className="rounded-md overflow-hidden">
                  <img 
                    src={post.imageUrl} 
                    alt="Post content" 
                    className="w-full h-16 object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Search Friends */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
            />
          </div>

          {/* Friends List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Select friends ({selectedFriends.size} selected)
            </p>
            
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                {friends.length === 0 ? 'No friends found' : 'No friends match your search'}
              </p>
            ) : (
              <ScrollArea className="h-32 sm:h-40">
                <div className="space-y-1">
                  {filteredFriends.map((friend) => (
                    <button
                      key={friend.userId}
                      onClick={() => toggleFriendSelection(friend.userId)}
                      className={`w-full p-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                        selectedFriends.has(friend.userId) 
                          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' 
                          : 'dark:border-transparent'
                      }`}
                    >
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={friend.avatarUrl} />
                        <AvatarFallback className="text-xs">{friend.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{friend.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{friend.username}</p>
                      </div>
                      {selectedFriends.has(friend.userId) && (
                        <div className="w-4 h-4 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Add a message (optional)</p>
            <Textarea
              placeholder="Say something about this post..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[50px] resize-none text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
              maxLength={200}
              rows={2}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 text-right">{message.length}/200</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border dark:border-red-800">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Separator className="dark:bg-slate-700" />

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={sharing}
              className="w-full sm:w-auto dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={selectedFriends.size === 0 || sharing}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 w-full sm:w-auto"
            >
              {sharing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Share ({selectedFriends.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}