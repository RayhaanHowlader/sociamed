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
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          permissionGranted.current = true;
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            permissionGranted.current = permission === 'granted';
          }).catch((error) => {
            console.error('[use-notifications] Error requesting permission:', error);
            // Silently fail on mobile devices
          });
        }
      }
    } catch (error) {
      console.error('[use-notifications] Error in permission check:', error);
      // Silently fail to prevent app crashes
    }
  }, []);

  const showNotification = useCallback((options: NotificationOptions) => {
    try {
      console.log('[use-notifications] showNotification called with:', options);
      console.log('[use-notifications] Document has focus:', document.hasFocus());
      
      // Check if Notification API is available
      if (!('Notification' in window)) {
        console.log('[use-notifications] Notification API not supported');
        return;
      }
      
      console.log('[use-notifications] Notification permission:', Notification.permission);
      
      // TEMPORARILY DISABLED: Don't show notification if page is focused
      // This is disabled for testing - uncomment to restore normal behavior
      // if (document.hasFocus()) {
      //   console.log('[use-notifications] Page has focus, skipping notification');
      //   return;
      // }

      if (Notification.permission === 'granted') {
        console.log('[use-notifications] Creating notification...');
        try {
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
        } catch (notificationError) {
          console.error('[use-notifications] Error creating notification:', notificationError);
          // Silently fail on mobile devices that don't support notifications
        }
      } else {
        console.log('[use-notifications] Notification permission not granted:', Notification.permission);
      }
    } catch (error) {
      console.error('[use-notifications] Error in showNotification:', error);
      // Silently fail to prevent app crashes on mobile
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        permissionGranted.current = permission === 'granted';
        return permission === 'granted';
      }
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch (error) {
      console.error('[use-notifications] Error requesting permission:', error);
      return false;
    }
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
