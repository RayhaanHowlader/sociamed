'use client';

import { Bell, BellOff } from 'lucide-react';
import { useNotifications } from './use-notifications';

export function NotificationStatusIndicator() {
  const { permission, requestPermission, isSupported } = useNotifications();

  if (!isSupported) return null;

  const handleClick = async () => {
    if (permission === 'default') {
      await requestPermission();
    } else if (permission === 'denied') {
      alert('Notifications are blocked. Please enable them in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Find "Notifications"\n3. Change to "Allow"\n4. Refresh the page');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        permission === 'granted'
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : permission === 'denied'
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
      }`}
      title={
        permission === 'granted'
          ? 'Notifications enabled'
          : permission === 'denied'
          ? 'Notifications blocked - Click to learn how to enable'
          : 'Click to enable notifications'
      }
    >
      {permission === 'granted' ? (
        <>
          <Bell className="w-3 h-3" />
          <span>Notifications On</span>
        </>
      ) : (
        <>
          <BellOff className="w-3 h-3" />
          <span>
            {permission === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}
          </span>
        </>
      )}
    </button>
  );
}
