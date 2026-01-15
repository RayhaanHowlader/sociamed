"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { UserPlus, Check, MapPin, AlertCircle, UserMinus, Search, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { io, Socket } from 'socket.io-client';
import { UnfriendModal } from './unfriend-modal';

type FriendStatus = 'none' | 'friends' | 'outgoing' | 'incoming';

interface Suggestion {
  userId: string;
  name: string;
  username: string;
  avatarUrl: string;
  location: string;
  status: FriendStatus;
}

export function FindFriends() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [unfriendModalOpen, setUnfriendModalOpen] = useState(false);
  const [userToUnfriend, setUserToUnfriend] = useState<Suggestion | null>(null);
  const [unfriending, setUnfriending] = useState(false);
  
  // Pagination and search states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const checkProfile = async () => {
    try {
      const res = await fetch('/api/profile', { credentials: 'include' });
      if (!res.ok) {
        setProfileComplete(false);
        return;
      }
      const data = await res.json();
      const profile = data.profile;
      // Check if required fields (name and username) are present
      const isComplete = profile && profile.name && profile.username;
      setProfileComplete(isComplete);
    } catch (err) {
      console.error(err);
      setProfileComplete(false);
    }
  };

  const loadSuggestions = async (pageNum: number = 1, search: string = '', append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      if (search !== debouncedSearch) {
        setSearching(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '5',
        ...(search && { search })
      });

      const res = await fetch(`/api/friends/suggestions?${params}`, { credentials: 'include' });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Unable to load suggestions.');
        return;
      }

      if (append && pageNum > 1) {
        setSuggestions(prev => [...prev, ...(data.suggestions ?? [])]);
      } else {
        setSuggestions(data.suggestions ?? []);
      }
      
      setHasMore(data.hasMore ?? false);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      setError('Unable to load suggestions.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setSearching(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load suggestions when debounced search changes
  useEffect(() => {
    if (profileComplete !== null) {
      setPage(1);
      setHasMore(true);
      loadSuggestions(1, debouncedSearch, false);
    }
  }, [debouncedSearch, profileComplete]);

  useEffect(() => {
    checkProfile();
    
    // Get current user ID
    const loadCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.user?.sub) {
          setCurrentUserId(String(data.user.sub));
        }
      } catch (err) {
        console.error('Failed to load current user:', err);
      }
    };
    loadCurrentUser();
  }, []);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && profileComplete) {
          loadSuggestions(page + 1, debouncedSearch, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loading, page, debouncedSearch, profileComplete]);

  // Setup socket connection
  useEffect(() => {
    if (!currentUserId) return;
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const socket = io(socketUrl);
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  const sendRequest = async (userId: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toUserId: userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to send friend request.');
        return;
      }

      setSuggestions((prev) =>
        prev.map((s) => (s.userId === userId ? { ...s, status: 'outgoing' as FriendStatus } : s)),
      );

      // Emit notification to target user via socket
      console.log('[find-friends] API response:', data);
      if (socketRef.current && data.requestId && data.senderProfile && currentUserId) {
        console.log('[find-friends] Emitting friend:request:notify', {
          toUserId: userId,
          requestId: String(data.requestId),
          fromUserId: currentUserId,
          profile: data.senderProfile,
        });
        socketRef.current.emit('friend:request:notify', {
          toUserId: userId,
          requestId: String(data.requestId),
          fromUserId: currentUserId,
          profile: data.senderProfile,
        });
      } else {
        console.log('[find-friends] Socket not ready or missing data:', {
          socketReady: !!socketRef.current,
          requestId: data.requestId,
          senderProfile: data.senderProfile,
          currentUserId,
        });
      }
    } catch (err) {
      console.error(err);
      setError('Unable to send friend request.');
    }
  };

  const openUnfriendModal = (suggestion: Suggestion) => {
    setUserToUnfriend(suggestion);
    setUnfriendModalOpen(true);
  };

  const handleUnfriend = async () => {
    if (!userToUnfriend) return;

    try {
      setUnfriending(true);
      setError('');
      const res = await fetch(`/api/friends/${userToUnfriend.userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to unfriend user.');
        return;
      }

      // Update status to 'none' so they can send request again
      setSuggestions((prev) =>
        prev.map((s) => (s.userId === userToUnfriend.userId ? { ...s, status: 'none' as FriendStatus } : s)),
      );

      setUnfriendModalOpen(false);
      setUserToUnfriend(null);
    } catch (err) {
      console.error(err);
      setError('Unable to unfriend user.');
    } finally {
      setUnfriending(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Find friends
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Discover people on Nexus and send them a friend request to start chatting.
          </p>
        </div>

        {profileComplete && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
            <Input
              placeholder="Search friends by name, username, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500" />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {profileComplete === false && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-300">Profile Incomplete</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Please complete your profile to continue finding friends and sending friend requests.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-slate-500" />
            <span className="ml-2 text-slate-500 dark:text-slate-400 text-sm">Loading suggestions...</span>
          </div>
        ) : !profileComplete ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Complete your profile to see friend suggestions.</p>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8">
            <UserPlus className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {searchQuery ? `No friends found for "${searchQuery}"` : 'No suggestions right now. Try again later.'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <Card key={s.userId} className="border-slate-200 dark:border-slate-700 dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={s.avatarUrl} />
                      <AvatarFallback>{s.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">@{s.username}</p>
                      {s.location && (
                        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <MapPin className="w-3 h-3" />
                          {s.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    {s.status === 'none' && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                        onClick={() => sendRequest(s.userId)}
                        disabled={!profileComplete}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add friend
                      </Button>
                    )}
                    {s.status === 'outgoing' && (
                      <Button size="sm" variant="outline" disabled>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        Request sent
                      </Button>
                    )}
                    {s.status === 'incoming' && (
                      <Button size="sm" variant="outline" disabled>
                        Pending your response
                      </Button>
                    )}
                    {s.status === 'friends' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openUnfriendModal(s)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfriend
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Lazy loading trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                {loadingMore && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 dark:text-slate-500" />
                    <span className="ml-2 text-slate-500 dark:text-slate-400 text-sm">Loading more...</span>
                  </>
                )}
              </div>
            )}
            
            {!hasMore && suggestions.length > 0 && (
              <div className="text-center py-4">
                <p className="text-slate-500 dark:text-slate-400 text-sm">You've reached the end of suggestions</p>
              </div>
            )}
          </div>
        )}
      </div>

      <UnfriendModal
        open={unfriendModalOpen}
        onOpenChange={setUnfriendModalOpen}
        user={userToUnfriend ? {
          id: userToUnfriend.userId,
          name: userToUnfriend.name,
          username: userToUnfriend.username,
          avatarUrl: userToUnfriend.avatarUrl,
        } : null}
        onConfirm={handleUnfriend}
        unfriending={unfriending}
      />
    </div>
  );
}


