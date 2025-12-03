"use client";

import { useEffect, useState } from 'react';
import { UserPlus, Check, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

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
    loadSuggestions();
  }, []);

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
    } catch (err) {
      console.error(err);
      setError('Unable to send friend request.');
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

        {loading ? (
          <p className="text-slate-500 text-sm">Loading suggestions...</p>
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
                      <Button size="sm" variant="outline" disabled>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        Friends
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


