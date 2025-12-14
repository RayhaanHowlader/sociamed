'use client';

import { Home, MessageCircle, Users, User, Video, UserPlus, Bell, CircleDot, StickyNote, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeView: 'feed' | 'messages' | 'groups' | 'profile' | 'shorts' | 'friends' | 'notifications' | 'stories' | 'notes' | 'ai-assistant';
  onViewChange: (view: 'feed' | 'messages' | 'groups' | 'profile' | 'shorts' | 'friends' | 'notifications' | 'stories' | 'notes' | 'ai-assistant') => void;
  notificationCount?: number;
}

export function Sidebar({ activeView, onViewChange, notificationCount = 0 }: SidebarProps) {
  const navItems = [
    { id: 'feed' as const, icon: Home, label: 'Feed' },
    { id: 'stories' as const, icon: CircleDot, label: 'Stories' },
    { id: 'notes' as const, icon: StickyNote, label: 'Notes' },
    { id: 'messages' as const, icon: MessageCircle, label: 'Messages' },
    { id: 'groups' as const, icon: Users, label: 'Groups' },
    { id: 'ai-assistant' as const, icon: Bot, label: 'AI Assistant' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'friends' as const, icon: UserPlus, label: 'Find friends' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'shorts' as const, icon: Video, label: 'Shorts' },
  ];

  return (
    // Hidden on mobile, shown on md+; mobile nav is handled in the top header
    <aside className="hidden md:flex w-56 bg-white border-r border-slate-200 flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <h1 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Nexus
        </h1>
        <p className="text-[10px] text-slate-500">Connect & Share</p>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-2 min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const showBadge = item.id === 'notifications' && notificationCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </div>
              <span className="font-medium text-base">{item.label}</span>
            </button>
          );
        })}
      </nav>







      

    </aside>
  );
}
