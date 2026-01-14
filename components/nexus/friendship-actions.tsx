'use client';

import { useState, useEffect } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnfriendModal } from './unfriend-modal';
import { io } from 'socket.io-client';

interface FriendshipActionsProps {
  viewedUserId: string | null;
  currentUserId: string | null;
  isOwnProfile: boolean;
  profile: {
    name: string;
    username: string;
    avatarUrl: string;
  } | null;
}

export function FriendshipActions({
  viewedUserId,
  currentUserId,
  isOwnProfile,
  profile,
}: FriendshipActionsProps) {
  const [isFriend, setIsFriend] = useState(false);
  const [unfriendModalOpen, setUnfriendModalOpen] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Check friendship status
  useEffect(() => {
    const checkFriendship = async () => {
      if (!viewedUserId || !currentUserId || isOwnProfile) {
        setIsFriend(false);
        return;
      }

      try {
        const res = await fetch('/api/friends/list', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          const friends = data.friends || [];
          const friend = friends.find((f: any) => f.userId === viewedUserId);
          setIsFriend(!!friend);
        }
      } catch (err) {
        console.error(err);
        setIsFriend(false);
      }
    };

    checkFriendship();
  }, [viewedUserId, currentUserId, isOwnProfile]);

  const handleSendFriendRequest = async () => {
    if (!viewedUserId) return;
    
    setSendingRequest(true);
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toUserId: viewedUserId }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Emit socket notification
        if (data.requestId && data.senderProfile && currentUserId) {
          const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://sociamed.onrender.com';
          const socket = io(socketUrl);
          
          socket.on('connect', () => {
            socket.emit('friend:request:notify', {
              toUserId: viewedUserId,
              requestId: String(data.requestId),
              fromUserId: currentUserId,
              profile: data.senderProfile,
            });
            
            // Disconnect after emitting
            setTimeout(() => socket.disconnect(), 1000);
          });
        }
        
        alert('Friend request sent!');
      } else {
        alert(data.error || 'Failed to send friend request');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleUnfriend = async () => {
    if (!viewedUserId) return;
    
    setUnfriending(true);
    try {
      const res = await fetch(`/api/friends/${viewedUserId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (res.ok) {
        setIsFriend(false);
        setUnfriendModalOpen(false);
        // Reload page to update groups and feed
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to unfriend user');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setUnfriending(false);
    }
  };

  // Don't render anything for own profile
  if (isOwnProfile || !profile || !viewedUserId) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2 mt-4 sm:mt-0">
        {isFriend ? (
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setUnfriendModalOpen(true)}
            disabled={unfriending}
          >
            <UserMinus className="w-4 h-4 mr-2" />
            Unfriend
          </Button>
        ) : (
          <Button
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={handleSendFriendRequest}
            disabled={sendingRequest}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {sendingRequest ? 'Sending...' : 'Add Friend'}
          </Button>
        )}
      </div>

      <UnfriendModal
        open={unfriendModalOpen}
        onOpenChange={setUnfriendModalOpen}
        user={{
          id: viewedUserId,
          name: profile.name,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
        }}
        onConfirm={handleUnfriend}
        unfriending={unfriending}
      />
    </>
  );
}