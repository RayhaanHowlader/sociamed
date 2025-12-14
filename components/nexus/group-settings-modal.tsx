'use client';

import { Hash } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface GroupSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGroup: Group | null;
  settingsName: string;
  onSettingsNameChange: (name: string) => void;
  settingsAllowEdit: boolean;
  onSettingsAllowEditChange: (allow: boolean) => void;
  settingsAllowInvite: boolean;
  onSettingsAllowInviteChange: (allow: boolean) => void;
  settingsAddMemberIds: Set<string>;
  onToggleSettingsMember: (id: string) => void;
  friends: Friend[];
  loadingFriends: boolean;
  canEditGroupMeta: boolean;
  isCurrentUserAdmin: boolean;
  canInviteMembers: boolean;
  error: string;
  savingSettings: boolean;
  onSaveSettings: () => void;
}

export function GroupSettingsModal({
  open,
  onOpenChange,
  selectedGroup,
  settingsName,
  onSettingsNameChange,
  settingsAllowEdit,
  onSettingsAllowEditChange,
  settingsAllowInvite,
  onSettingsAllowInviteChange,
  settingsAddMemberIds,
  onToggleSettingsMember,
  friends,
  loadingFriends,
  canEditGroupMeta,
  isCurrentUserAdmin,
  canInviteMembers,
  error,
  savingSettings,
  onSaveSettings
}: GroupSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Group settings</DialogTitle>
          <DialogDescription>Manage this group&apos;s name, permissions and members.</DialogDescription>
        </DialogHeader>
        {selectedGroup && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                Group name
              </label>
              <Input
                value={settingsName}
                onChange={(e) => onSettingsNameChange(e.target.value)}
                disabled={!canEditGroupMeta}
              />
              {!canEditGroupMeta && (
                <p className="text-[11px] text-slate-500">
                  Only the admin or when allowed by admin can change the group name.
                </p>
              )}
            </div>

            {isCurrentUserAdmin && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Permissions</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <Checkbox
                      checked={settingsAllowEdit}
                      onCheckedChange={(v) => onSettingsAllowEditChange(Boolean(v))}
                    />
                    <span>Allow members to edit group name &amp; icon</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <Checkbox
                      checked={settingsAllowInvite}
                      onCheckedChange={(v) => onSettingsAllowInviteChange(Boolean(v))}
                    />
                    <span>Allow members to add new members</span>
                  </label>
                </div>
              </div>
            )}

            {(isCurrentUserAdmin || canInviteMembers) && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Add members</p>
                {loadingFriends ? (
                  <p className="text-xs text-slate-500">Loading friends…</p>
                ) : friends.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    You don&apos;t have any friends yet to add to this group.
                  </p>
                ) : (
                  <ScrollArea className="h-32 border border-slate-200 rounded-md">
                    <div className="p-3 space-y-2">
                      {friends.filter((friend) => !selectedGroup.memberIds.includes(friend.id))
                        .length === 0 ? (
                        <p className="text-xs text-slate-500">
                          All of your friends are already members of this group.
                        </p>
                      ) : (
                        friends
                          .filter((friend) => !selectedGroup.memberIds.includes(friend.id))
                          .map((friend) => (
                            <label
                              key={friend.id}
                              className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer"
                            >
                              <Checkbox
                                checked={settingsAddMemberIds.has(friend.id)}
                                onCheckedChange={() => onToggleSettingsMember(friend.id)}
                              />
                              <Avatar className="w-7 h-7">
                                <AvatarImage src={friend.avatarUrl} />
                                <AvatarFallback>{friend.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">{friend.name}</span>
                                <span className="text-xs text-slate-400">@{friend.username}</span>
                              </div>
                            </label>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            onClick={onSaveSettings}
            disabled={savingSettings}
          >
            {savingSettings ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}