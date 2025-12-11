"use client";

import { useEffect, useState, useRef } from 'react';
import { UserPlus, Check, MapPin, AlertCircle, UserMinus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  const [error, setError] = useState('');
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [unfriendModalOpen, setUnfriendModalOpen] = useState(false);
  const [userToUnfriend, setUserToUnfriend] = useState<Suggestion | null>(null);
  const [unfriending, setUnfriending] = useState(false);

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

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/friends/suggestions', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to load suggestions.');
        return;
      }
      setSuggestions(data.suggestions ?? []);
    } catch (err) {
      console.error(err);
      setError('Unable to load suggestions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkProfile();
    loadSuggestions();
    
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
      // Get the suggestion before updating state
      const suggestion = suggestions.find((s) => s.userId === userId);
      if (socketRef.current && suggestion && data.requestId && currentUserId) {
        socketRef.current.emit('friend:request:notify', {
          toUserId: userId,
          requestId: String(data.requestId),
          fromUserId: currentUserId,
          profile: {
            name: suggestion.name,
            username: suggestion.username,
            avatarUrl: suggestion.avatarUrl,
          },
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
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600" />
            Find friends
          </h1>
          <p className="text-sm text-slate-500">
            Discover people on Nexus and send them a friend request to start chatting.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {profileComplete === false && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">Profile Incomplete</p>
                  <p className="text-sm text-amber-700">
                    Please complete your profile to continue finding friends and sending friend requests.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-slate-500 text-sm">Loading suggestions...</p>
        ) : !profileComplete ? (
          <p className="text-slate-500 text-sm">Complete your profile to see friend suggestions.</p>
        ) : suggestions.length === 0 ? (
          <p className="text-slate-500 text-sm">No suggestions right now. Try again later.</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <Card key={s.userId} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={s.avatarUrl} />
                      <AvatarFallback>{s.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.username}</p>
                      {s.location && (
                        <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
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
                        className="bg-gradient-to-r from-blue-600 to-cyan-600"
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


