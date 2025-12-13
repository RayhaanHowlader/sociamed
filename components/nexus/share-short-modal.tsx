'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Send, X, AlertCircle, Loader2 } from 'lucide-react';
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

interface Friend {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface Short {
  _id: string;
  caption: string;
  videoUrl: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  duration: number;
}

interface ShareShortModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  short: Short | null;
  onShareSuccess?: (sharedCount: number) => void;
}

export function ShareShortModal({ open, onOpenChange, short, onShareSuccess }: ShareShortModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Load friends when modal opens
  useEffect(() => {
    if (!open) return;

    const loadFriends = async () => {
      try {
        const res = await fetch('/api/friends/list', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          setFriends(data.friends || []);
        }
      } catch (err) {
        console.error('Failed to load friends:', err);
      }
    };

    loadFriends();
  }, [open]);

  // Initialize socket connection
  useEffect(() => {
    if (!open) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const socket = io(socketUrl);
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [open]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedFriends(new Set());
      setMessage('');
      setError('');
      setSuccess(false);
      setSearchQuery('');
    }
  }, [open]);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleShare = async () => {
    if (!short || selectedFriends.size === 0) {
      setError('Please select at least one friend to share with');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shorts/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shortId: short._id,
          friendIds: Array.from(selectedFriends),
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to share short');
      }

      // Emit socket events for real-time delivery
      if (socketRef.current && data.sharedMessages) {
        data.sharedMessages.forEach((sharedMessage: any) => {
          socketRef.current?.emit('chat:message', sharedMessage);
        });
      }

      setSuccess(true);
      onShareSuccess?.(selectedFriends.size);

      // Close modal after a short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (err) {
      console.error('Share error:', err);
      setError(err instanceof Error ? err.message : 'Failed to share short');
    } finally {
      setLoading(false);
    }
  };

  if (!short) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Short</DialogTitle>
          <DialogDescription>
            Share this short with your friends via direct messages
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">Short Shared!</h3>
            <p className="text-sm text-green-600">
              Your short has been shared with {selectedFriends.size} friend{selectedFriends.size !== 1 ? 's' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Friends Search */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected Friends Count */}
              {selectedFriends.size > 0 && (
                <p className="text-sm text-slate-600">
                  {selectedFriends.size} friend{selectedFriends.size !== 1 ? 's' : ''} selected
                </p>
              )}

              {/* Friends List */}
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {filteredFriends.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      {searchQuery ? 'No friends found' : 'No friends available'}
                    </p>
                  ) : (
                    filteredFriends.map((friend) => (
                      <div
                        key={friend.userId}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedFriends.has(friend.userId)
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => toggleFriend(friend.userId)}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={friend.avatarUrl} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{friend.name}</p>
                          <p className="text-xs text-slate-500">@{friend.username}</p>
                        </div>
                        <div className={`w-4 h-4 rounded border-2 ${
                          selectedFriends.has(friend.userId)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-slate-300'
                        }`}>
                          {selectedFriends.has(friend.userId) && (
                            <X className="w-3 h-3 text-white transform rotate-45" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Optional Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add a message (optional)</label>
              <Textarea
                placeholder="Say something about this short..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-slate-500 text-right">{message.length}/200</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={loading || selectedFriends.size === 0}
                className="flex-1"
              >
                {loading ? (
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
        )}
      </DialogContent>
    </Dialog>
  );
}