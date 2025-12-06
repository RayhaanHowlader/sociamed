'use client';

import { Home, MessageCircle, Users, User, Plus, Video, UserPlus, Bell, CircleDot, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeView: 'feed' | 'messages' | 'groups' | 'profile' | 'shorts' | 'friends' | 'notifications' | 'stories' | 'notes';
  onViewChange: (view: 'feed' | 'messages' | 'groups' | 'profile' | 'shorts' | 'friends' | 'notifications' | 'stories' | 'notes') => void;
  onCreateShort: () => void;
}

export function Sidebar({ activeView, onViewChange, onCreateShort }: SidebarProps) {
  const navItems = [
    { id: 'feed' as const, icon: Home, label: 'Feed' },
    { id: 'stories' as const, icon: CircleDot, label: 'Stories' },
    { id: 'notes' as const, icon: StickyNote, label: 'Notes' },
    { id: 'messages' as const, icon: MessageCircle, label: 'Messages' },
    { id: 'groups' as const, icon: Users, label: 'Groups' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'friends' as const, icon: UserPlus, label: 'Find friends' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'shorts' as const, icon: Video, label: 'Shorts' },
  ];

  return (
    // Hidden on mobile, shown on md+; mobile nav is handled in the top header
    <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col">
      <div className="p-4 md:p-6 border-b border-slate-200">
        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Nexus
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">Connect & Share</p>
      </div>

      <nav className="flex-1 px-2 py-2 md:p-4 space-y-1 md:space-y-2 max-h-[50vh] md:max-h-none overflow-y-auto md:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm md:text-base">{item.label}</span>
            </button>
          );
        })}
      </nav>







      

      <div className="p-3 md:p-4 border-t border-slate-200">
        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          onClick={onCreateShort}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Short
        </Button>
      </div>
    </aside>
  );
}
