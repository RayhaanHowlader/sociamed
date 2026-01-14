'use client';

import { Bell } from 'lucide-react';
import { useNotifications } from './use-notifications';

export function NotificationTestButton() {
  const { showNotification, permission, requestPermission } = useNotifications();

  const handleTest = async () => {
    if (permission === 'default') {
      const granted = await requestPermission();
      if (!granted) {
        alert('Please allow notifications to test');
        return;
      }
    }

    if (permission === 'denied') {
      alert('Notifications are blocked. Please enable them in your browser settings.');
      return;
    }

    showNotification({
      title: 'Test Notification',
      body: 'This is a test notification from Nexus!',
      icon: '/icon-192x192.png',
      tag: 'test-notification',
      data: { type: 'test' }
    });
  };

  return (
    <button
      onClick={handleTest}
      className="fixed bottom-20 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      title="Test Notifications"
    >
      <Bell className="w-5 h-5" />
    </button>
  );
}
