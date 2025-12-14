'use client';

import { X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

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

interface GroupMembersSidebarProps {
  show: boolean;
  selectedGroup: Group;
  groupMembers: Friend[];
  loadingMembers: boolean;
  currentUserId: string | null;
  isCurrentUserAdmin: boolean;
  onRemoveMember: (member: Friend) => void;
}

export function GroupMembersSidebar({
  show,
  selectedGroup,
  groupMembers,
  loadingMembers,
  currentUserId,
  isCurrentUserAdmin,
  onRemoveMember
}: GroupMembersSidebarProps) {
  if (!show) return null;

  return (
    <div className="w-72 border-l border-slate-200 bg-white">
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Members</h3>
        <p className="text-sm text-slate-500">
          {selectedGroup.memberIds?.length ?? 0} total
        </p>
      </div>
      <ScrollArea className="h-[calc(100%-80px)]">
        <div className="p-4 space-y-3">
          {loadingMembers ? (
            <p className="text-xs text-slate-500">Loading members…</p>
          ) : groupMembers.length === 0 ? (
            <p className="text-xs text-slate-500">No members found for this group.</p>
          ) : (
            groupMembers.map((member) => {
              const isAdmin = selectedGroup.ownerId === member.id;
              const isCurrentUser = currentUserId === member.id;
              const canRemove = isCurrentUserAdmin && !isAdmin && !isCurrentUser;
              
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {member.name}
                    </p>
                    <p className="text-xs text-slate-500">@{member.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isAdmin ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {isAdmin ? 'Admin' : 'Member'}
                    </Badge>
                    {canRemove && (
                      <button
                        onClick={() => onRemoveMember(member)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove member"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}