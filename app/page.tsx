'use client';

import { useEffect, useState, useRef } from 'react';
import { LogOut, Menu, X, Home as HomeIcon, BookOpen, MessageSquare, Users, User, UserPlus, Bell, Video, FileText, Bot } from 'lucide-react';
import { Sidebar } from '@/components/nexus/sidebar';
import { Feed } from '@/components/nexus/feed';
import { DirectMessages } from '@/components/nexus/direct-messages';
import { GroupChats } from '@/components/nexus/group-chats';
import { Profile } from '@/components/nexus/profile';
import { Shorts } from '@/components/nexus/shorts';
import { FindFriends } from '@/components/nexus/find-friends';
import { Notifications } from '@/components/nexus/notifications';
import { Stories } from '@/components/nexus/stories';
import { Notes } from '@/components/nexus/notes';
import { AIAssistant } from '@/components/nexus/ai-assistant';
import { NotificationPopup } from '@/components/nexus/notification-popup';
import LoginPage from '@/components/LoginPage';
import SignupPage from '@/components/SignupPage';
import { io, Socket } from 'socket.io-client';

interface FriendRequestNotification {
  id: string;
  fromUserId: string;
  profile: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
}

export default function Home() {
  const [activeView, setActiveView] =
    useState<'feed' | 'messages' | 'groups' | 'profile' | 'shorts' | 'friends' | 'notifications' | 'stories' | 'notes' | 'ai-assistant'>('feed');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authChecked, setAuthChecked] = useState(false);
  const [shortsModalOpen, setShortsModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentNotification, setCurrentNotification] = useState<FriendRequestNotification | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  // On first load, ask the server if the auth cookie is valid so the session
  // is maintained across refreshes.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await res.json();
        setIsLoggedIn(res.ok);
        if (res.ok && data.user?.sub) {
          setCurrentUserId(String(data.user.sub));
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // Listen for profile view events
  useEffect(() => {
    const handleViewProfile = (e: CustomEvent<{ userId: string }>) => {
      setViewingUserId(e.detail.userId);
      setActiveView('profile');
    };

    const handleNavigateToPost = (e: CustomEvent<{ postId: string }>) => {
      // Switch to feed view and let the Feed component handle highlighting the post
      setActiveView('feed');
      // Dispatch another event that the Feed component can listen to
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('highlight-post', { 
          detail: { postId: e.detail.postId } 
        }));
      }, 100);
    };

    const handleNavigateToShort = (e: CustomEvent<{ short: any }>) => {
      // Switch to shorts view and let the Shorts component handle opening the short
      setActiveView('shorts');
      // Dispatch another event that the Shorts component can listen to
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-short', { 
          detail: { short: e.detail.short } 
        }));
      }, 100);
    };

    window.addEventListener('view-profile' as any, handleViewProfile as EventListener);
    window.addEventListener('navigate-to-post' as any, handleNavigateToPost as EventListener);
    window.addEventListener('navigate-to-short' as any, handleNavigateToShort as EventListener);
    
    return () => {
      window.removeEventListener('view-profile' as any, handleViewProfile as EventListener);
      window.removeEventListener('navigate-to-post' as any, handleNavigateToPost as EventListener);
      window.removeEventListener('navigate-to-short' as any, handleNavigateToShort as EventListener);
    };
  }, []);

  // Load notification count
  const loadNotificationCount = async () => {
    try {
      // Load friend requests
      const friendRes = await fetch('/api/friends/requests', { credentials: 'include' });
      const friendData = await friendRes.json();
      
      // Load other notifications
      const notifRes = await fetch('/api/notifications', { credentials: 'include' });
      const notifData = await notifRes.json();
      
      if (friendRes.ok && notifRes.ok) {
        const friendCount = friendData.requests?.length || 0;
        const otherCount = notifData.notifications?.length || 0;
        setNotificationCount(friendCount + otherCount);
      }
    } catch (err) {
      console.error('Failed to load notification count:', err);
    }
  };

  // Setup socket connection and notification listener
  useEffect(() => {
    if (!currentUserId || !isLoggedIn) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://sociamed.onrender.com';
    const socket = io(socketUrl);
    socketRef.current = socket;

    // Join notification room
    socket.emit('notification:join', { userId: currentUserId });

    // Listen for friend request notifications
    socket.on('friend:request', (data: FriendRequestNotification) => {
      setCurrentNotification(data);
      setNotificationCount((prev) => prev + 1);
      
      // Play notification sound
      if (notificationSoundRef.current) {
        notificationSoundRef.current.play().catch((err) => {
          console.error('Failed to play notification sound:', err);
        });
      }
    });

    // Listen for group removal notifications
    socket.on('group:member:removed', () => {
      setNotificationCount((prev) => prev + 1);
      
      // Play notification sound
      if (notificationSoundRef.current) {
        notificationSoundRef.current.play().catch((err) => {
          console.error('Failed to play notification sound:', err);
        });
      }
    });

    // Load initial notification count
    loadNotificationCount();

    // Listen for notifications being marked as read
    const handleNotificationsRead = () => {
      loadNotificationCount();
    };
    window.addEventListener('notifications:read', handleNotificationsRead);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      window.removeEventListener('notifications:read', handleNotificationsRead);
    };
  }, [currentUserId, isLoggedIn]);

  // Initialize notification sound
  useEffect(() => {
    notificationSoundRef.current = new Audio('/water.mp3');
    notificationSoundRef.current.volume = 0.5;
    notificationSoundRef.current.preload = 'auto';
  }, []);

  // Reload notification count when viewing notifications page
  useEffect(() => {
    if (activeView === 'notifications') {
      // Reload notifications to get fresh count after marking as read
      const timer = setTimeout(() => {
      loadNotificationCount();
      }, 1000); // Wait a bit for notifications to be marked as read
      return () => clearTimeout(timer);
    }
  }, [activeView]);

  const handleNotificationAccept = async (id: string) => {
    try {
      const res = await fetch(`/api/friends/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'accept' }),
      });
      if (res.ok) {
        setNotificationCount((prev) => Math.max(0, prev - 1));
        setCurrentNotification(null);
        loadNotificationCount();
      }
    } catch (err) {
      console.error('Failed to accept notification:', err);
    }
  };

  const handleNotificationDecline = async (id: string) => {
    try {
      const res = await fetch(`/api/friends/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'decline' }),
      });
      if (res.ok) {
        setNotificationCount((prev) => Math.max(0, prev - 1));
        setCurrentNotification(null);
        loadNotificationCount();
      }
    } catch (err) {
      console.error('Failed to decline notification:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore errors, we'll still clear local state
    } finally {
      setIsLoggedIn(false);
      setAuthMode('login');
      setShortsModalOpen(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading your session...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    if (authMode === 'signup') {
      return (
        <SignupPage
          onSwitchToLogin={() => setAuthMode('login')}
        />
      );
    }

    return (
      <LoginPage
        onLoginSuccess={() => setIsLoggedIn(true)}
        onSwitchToSignup={() => setAuthMode('signup')}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          if (view === 'notifications') {
            loadNotificationCount();
          }
          if (view === 'profile') {
            setViewingUserId(null); // Reset to own profile
          }
        }}
        notificationCount={notificationCount}
      />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top navbar */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-md p-1 text-slate-700 hover:bg-slate-100"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-base tracking-tight">N</span>
            </div>
            <div>
              <p className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Nexus
              </p>
              <p className="text-xs text-slate-500">Connect &amp; Share</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 shadow-sm hover:bg-slate-100 hover:border-slate-300 transition"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </header>

        {/* Mobile nav drawer overlay */}
        {mobileNavOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Mobile nav drawer - slides in from left */}
        <div
          className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-base tracking-tight">N</span>
                </div>
                <div>
                  <p className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Nexus
                  </p>
                  <p className="text-xs text-slate-500">Connect & Share</p>
                </div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex items-center justify-center rounded-md p-1 text-slate-700 hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto py-2">
              {[
                { id: 'feed', label: 'Feed', icon: HomeIcon },
                { id: 'stories', label: 'Stories', icon: BookOpen },
                { id: 'notes', label: 'Notes', icon: FileText },
                { id: 'messages', label: 'Messages', icon: MessageSquare },
                { id: 'groups', label: 'Groups', icon: Users },
                { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'friends', label: 'Find friends', icon: UserPlus },
                { id: 'notifications', label: 'Notifications', icon: Bell, badge: notificationCount > 0 ? notificationCount : undefined },
                { id: 'shorts', label: 'Shorts', icon: Video },
              ].map((item) => {
                const Icon = item.icon;
                return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id as typeof activeView);
                    setMobileNavOpen(false);
                    if (item.id === 'notifications') {
                      loadNotificationCount();
                    }
                    if (item.id === 'profile') {
                      setViewingUserId(null); // Reset to own profile
                    }
                  }}
                    className={`flex items-center justify-start gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors w-full ${
                      activeView === item.id ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600' : ''
                  }`}
                >
                    <Icon className={`w-5 h-5 ${activeView === item.id ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                </button>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 text-slate-500" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <section className="flex-1 overflow-hidden min-h-0 h-full">
        {activeView === 'feed' && <Feed />}
        {activeView === 'stories' && <Stories />}
        {activeView === 'notes' && <Notes />}
        {activeView === 'messages' && <DirectMessages />}
        {activeView === 'groups' && <GroupChats />}
        {activeView === 'ai-assistant' && <AIAssistant />}
        {activeView === 'profile' && <Profile userId={viewingUserId || undefined} />}
          {activeView === 'friends' && <FindFriends />}
          {activeView === 'notifications' && <Notifications />}
          {activeView === 'shorts' && (
            <Shorts
              createModalOpen={shortsModalOpen}
              onCloseCreateModal={() => setShortsModalOpen(false)}
            />
          )}
        </section>
      </main>

      {/* Notification Popup */}
      <NotificationPopup
        notification={currentNotification}
        onAccept={handleNotificationAccept}
        onDecline={handleNotificationDecline}
        onClose={() => setCurrentNotification(null)}
      />
    </div>
  );
}