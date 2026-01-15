"use client";

import { useEffect, useState } from 'react';
import { Bell, Check, X, AlertCircle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { io, Socket } from 'socket.io-client';

interface FriendRequestItem {
  id: string;
  type: 'friend_request';
  fromUserId: string;
  createdAt: string | Date;
  profile: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
}

interface GroupRemovalNotification {
  id: string;
  type: 'group_removed';
  userId: string;
  groupId: string;
  groupName: string;
  removedBy: string;
  removedByProfile: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string | Date;
  read?: boolean;
}

type NotificationItem = FriendRequestItem | GroupRemovalNotification;

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Load friend requests
      const friendRes = await fetch('/api/friends/requests', { credentials: 'include' });
      const friendData = await friendRes.json();
      
      // Load other notifications
      const notifRes = await fetch('/api/notifications', { credentials: 'include' });
      const notifData = await notifRes.json();
      
      if (!friendRes.ok && !notifRes.ok) {
        setError('Unable to load notifications.');
        return;
      }

      // Combine friend requests with other notifications
      const friendRequests: FriendRequestItem[] = (friendData.requests ?? []).map((r: any) => ({
        id: r.id,
        type: 'friend_request' as const,
        fromUserId: r.fromUserId,
        createdAt: r.createdAt,
        profile: r.profile,
      }));

      // Get profiles for group removal notifications (only unread ones)
      const groupRemovals = (notifData.notifications ?? []).filter(
        (n: any) => n.type === 'group_removed' && !n.read
      );
      
      const allNotifications: NotificationItem[] = [
        ...friendRequests,
        ...groupRemovals.map((n: any) => ({
          id: n.id,
          type: 'group_removed' as const,
          userId: n.userId,
          groupId: n.groupId,
          groupName: n.groupName,
          removedBy: n.removedBy,
          removedByProfile: n.removedByProfile || n.removedByProfile,
          createdAt: n.createdAt,
          read: n.read || false,
        })),
      ].sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });

      setNotifications(allNotifications);
    } catch (err) {
      console.error(err);
      setError('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.user?.sub) {
          setCurrentUserId(String(data.user.sub));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCurrentUser();
  }, []);

  // Setup socket for real-time notifications
  useEffect(() => {
    if (!currentUserId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://sociamed.onrender.com';
    const socket = io(socketUrl);
    
    socket.emit('notification:join', { userId: currentUserId });

    socket.on('group:member:removed', (data: GroupRemovalNotification) => {
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          type: 'group_removed',
          userId: data.userId,
          groupId: data.groupId,
          groupName: data.groupName,
          removedBy: data.removedBy,
          removedByProfile: data.removedByProfile,
          createdAt: new Date(),
        },
        ...prev,
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  useEffect(() => {
    loadNotifications();
  }, []);

  // Mark notifications as read when viewing the page
  useEffect(() => {
    const markAsRead = async () => {
      if (notifications.length === 0 || loading) return;

      // Get unread group removal notification IDs
      const unreadGroupRemovalIds = notifications
        .filter((n) => n.type === 'group_removed' && !n.read)
        .map((n) => n.id);

      if (unreadGroupRemovalIds.length === 0) return;

      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notificationIds: unreadGroupRemovalIds }),
        });
        
        // Update local state to mark as read
        setNotifications((prev) =>
          prev.map((n) => (n.type === 'group_removed' && !n.read ? { ...n, read: true } : n))
        );

        // Trigger a custom event to update notification count in parent
        window.dispatchEvent(new CustomEvent('notifications:read'));
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    };

    // Mark as read after a short delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      markAsRead();
    }, 500);

    return () => clearTimeout(timer);
  }, [notifications.length, loading]);

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

      setNotifications((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      setError('Unable to update request.');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            See new friend requests and group notifications.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm">No new notifications.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              if (notif.type === 'friend_request') {
                return (
                  <Card key={notif.id} className="border-slate-200 dark:border-slate-700 shadow-sm dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={notif.profile.avatarUrl} />
                          <AvatarFallback>{notif.profile.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{notif.profile.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {notif.profile.username} sent you a friend request.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-cyan-600"
                          onClick={() => handleAction(notif.id, 'accept')}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-slate-600 dark:text-slate-400 dark:border-slate-700"
                          onClick={() => handleAction(notif.id, 'decline')}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              } else if (notif.type === 'group_removed') {
                return (
                  <Card key={notif.id} className="border-slate-200 dark:border-slate-700 shadow-sm dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">Removed from group</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          You were removed from <span className="font-medium">{notif.groupName}</span> by{' '}
                          <span className="font-medium">{notif.removedByProfile.name}</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}


