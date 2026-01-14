'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from './use-notifications';

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const { requestPermission, permission, isSupported } = useNotifications();

  useEffect(() => {
    // Show prompt if notifications are supported and permission is default
    if (isSupported && permission === 'default') {
      // Wait a bit before showing the prompt
      const timer = setTimeout(() => {
        setShow(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Remember dismissal in localStorage
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  // Don't show if already dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    if (dismissed === 'true') {
      setShow(false);
    }
  }, []);

  if (!show || !isSupported || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border border-slate-200 p-4 animate-in slide-in-from-bottom-5">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 mb-1">
            Enable Notifications
          </h3>
          <p className="text-sm text-slate-600 mb-3">
            Get notified when you receive new messages, even when you're not on this tab.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enable
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
