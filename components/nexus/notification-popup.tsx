'use client';

import { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NotificationPopupProps {
  notification: {
    id: string;
    fromUserId: string;
    profile: {
      name: string;
      username: string;
      avatarUrl?: string;
    };
  } | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onClose: () => void;
}

export function NotificationPopup({ notification, onAccept, onDecline, onClose }: NotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification, onClose]);

  if (!notification || !isVisible) return null;

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      )}
    >
      <Card className="w-96 shadow-lg border-blue-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={notification.profile.avatarUrl} />
              <AvatarFallback>{notification.profile.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-slate-900">{notification.profile.name}</p>
                  <p className="text-sm text-slate-600">
                    @{notification.profile.username} sent you a friend request
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  onClick={() => {
                    onAccept(notification.id);
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-slate-600"
                  onClick={() => {
                    onDecline(notification.id);
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                  }}
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

