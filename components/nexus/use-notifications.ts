'use client';

import { useEffect, useCallback, useRef } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
}

export function useNotifications() {
  const permissionGranted = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        permissionGranted.current = true;
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          permissionGranted.current = permission === 'granted';
        });
      }
    }
  }, []);

  const showNotification = useCallback((options: NotificationOptions) => {
    console.log('[use-notifications] showNotification called with:', options);
    console.log('[use-notifications] Document has focus:', document.hasFocus());
    console.log('[use-notifications] Notification permission:', Notification.permission);
    
    // TEMPORARILY DISABLED: Don't show notification if page is focused
    // This is disabled for testing - uncomment to restore normal behavior
    // if (document.hasFocus()) {
    //   console.log('[use-notifications] Page has focus, skipping notification');
    //   return;
    // }

    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('[use-notifications] Creating notification...');
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        tag: options.tag,
        data: options.data,
        badge: '/icon-192x192.png',
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Handle notification click based on data
        if (options.data?.type === 'message' && options.data?.userId) {
          window.dispatchEvent(new CustomEvent('open-chat', {
            detail: { userId: options.data.userId }
          }));
        }
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } else {
      console.log('[use-notifications] Notification not supported or permission not granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      permissionGranted.current = permission === 'granted';
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  return {
    showNotification,
    requestPermission,
    isSupported: 'Notification' in window,
    permission: typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default',
  };
}
