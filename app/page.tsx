'use client';

import { useEffect, useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
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
import LoginPage from '@/components/LoginPage';
import SignupPage from '@/components/SignupPage';

export default function Home() {
  const [activeView, setActiveView] =
    useState<'feed' | 'messages' | 'groups' | 'profile' | 'shorts' | 'friends' | 'notifications' | 'stories' | 'notes'>('feed');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authChecked, setAuthChecked] = useState(false);
  const [shortsModalOpen, setShortsModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // On first load, ask the server if the auth cookie is valid so the session
  // is maintained across refreshes.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        setIsLoggedIn(res.ok);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

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
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
        }}
        onCreateShort={() => {
          setActiveView('shorts');
          setShortsModalOpen(true);
        }}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="h-14 md:h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-md p-1 text-slate-700 hover:bg-slate-100"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg tracking-tight">N</span>
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
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 md:px-4 py-1.5 text-[11px] md:text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 hover:border-slate-300 transition"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </header>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white">
            <nav className="flex flex-col py-2">
              {[
                { id: 'feed', label: 'Feed' },
                { id: 'stories', label: 'Stories' },
                { id: 'notes', label: 'Notes' },
                { id: 'messages', label: 'Messages' },
                { id: 'groups', label: 'Groups' },
                { id: 'profile', label: 'Profile' },
                { id: 'friends', label: 'Find friends' },
                { id: 'notifications', label: 'Notifications' },
                { id: 'shorts', label: 'Shorts' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id as typeof activeView);
                    setMobileNavOpen(false);
                  }}
                  className={`flex items-center justify-start px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 ${
                    activeView === item.id ? 'bg-slate-100 font-medium' : ''
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Main content */}
        <section className="flex-1 overflow-hidden">
        {activeView === 'feed' && <Feed />}
        {activeView === 'stories' && <Stories />}
        {activeView === 'notes' && <Notes />}
        {activeView === 'messages' && <DirectMessages />}
        {activeView === 'groups' && <GroupChats />}
        {activeView === 'profile' && <Profile />}
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
    </div>
  );
}
