'use client';

import { Settings, Trash2, ArrowLeft, Users, MoreVertical, Lock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Group {
  _id: string;
  name: string;
  icon: string;
  memberIds: string[];
  lastMessage?: string;
  lastActivityAt?: string;
  isPrivate?: boolean;
  ownerId?: string;
  allowMemberEdit?: boolean;
  allowMemberInvite?: boolean;
}

interface GroupChatHeaderProps {
  selectedGroup: Group;
  onBackClick: () => void;
  onAddMemberClick: () => void;
  onToggleMembersClick: () => void;
  onSearchMediaClick: () => void;
  onSettingsClick: () => void;
  onDeleteClick: () => void;
  onSelectModeToggle: () => void;
  onDeleteSelected: () => void;
  canInviteMembers: boolean;
  selectMode: boolean;
  selectedMessageIds: Set<string>;
}

export function GroupChatHeader({
  selectedGroup,
  onBackClick,
  onAddMemberClick,
  onToggleMembersClick,
  onSearchMediaClick,
  onSettingsClick,
  onDeleteClick,
  onSelectModeToggle,
  onDeleteSelected,
  canInviteMembers,
  selectMode,
  selectedMessageIds
}: GroupChatHeaderProps) {
  return (
    <div className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2 md:gap-3">
        {/* Back button - only visible on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          onClick={onBackClick}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl overflow-hidden">
          {selectedGroup.icon?.startsWith('http') ? (
            <img 
              src={selectedGroup.icon} 
              alt={`${selectedGroup.name} icon`}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.textContent = '💬';
              }}
            />
          ) : (
            selectedGroup.icon || '💬'
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 dark:text-white">{selectedGroup.name}</p>
            {selectedGroup.isPrivate && <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {selectedGroup.memberIds?.length ?? 0} members
          </p>
        </div>
      </div>
      <div className="flex gap-2 items-center flex-wrap justify-end sticky top-0 bg-white dark:bg-slate-900 z-10 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          onClick={onAddMemberClick}
          disabled={!canInviteMembers}
          title={canInviteMembers ? "Add members" : "You don't have permission to add members"}
        >
          <UserPlus className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          onClick={onToggleMembersClick}
          title="View members"
        >
          <Users className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          onClick={onSearchMediaClick}
          title="Search messages and media"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          onClick={onSettingsClick}
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
          onClick={onDeleteClick}
        >
          <Trash2 className="w-5 h-5" />
        </Button>
        <Button
          variant={selectMode ? 'secondary' : 'outline'}
          size="sm"
          disabled={!selectedGroup}
          onClick={onSelectModeToggle}
          className="min-w-[92px]"
        >
          {selectMode ? 'Cancel' : 'Select'}
        </Button>
        {selectedMessageIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
            className="min-w-[110px]"
          >
            Delete ({selectedMessageIds.size})
          </Button>
        )}
      </div>
    </div>
  );
}