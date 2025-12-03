"use client";

import { useEffect, useState } from 'react';
import { Bell, Check, X, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface FriendRequestItem {
  id: string;
  fromUserId: string;
  createdAt: string;
  profile: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
}

export function Notifications() {
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/friends/requests', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to load notifications.');
        return;
      }
      setRequests(data.requests ?? []);
    } catch (err) {
      console.error(err);
      setError('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (id: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch(`/api/friends/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to update request.');
        return;
      }

      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      setError('Unable to update request.');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notifications
          </h1>
          <p className="text-sm text-slate-500">
            See new friend requests and respond to start chatting.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 text-sm">Loading notifications...</p>
        ) : requests.length === 0 ? (
          <p className="text-slate-500 text-sm">No new notifications.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={r.profile.avatarUrl} />
                      <AvatarFallback>{r.profile.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900">{r.profile.name}</p>
                      <p className="text-xs text-slate-500">
                        {r.profile.username} sent you a friend request.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-cyan-600"
                      onClick={() => handleAction(r.id, 'accept')}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-slate-600"
                      onClick={() => handleAction(r.id, 'decline')}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
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


