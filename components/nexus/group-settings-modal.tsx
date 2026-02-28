'use client';

import { Hash, Image, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useRef, useState } from 'react';
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
  settingsIcon: string;
  onSettingsIconChange: (icon: string) => void;
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
  settingsIcon,
  onSettingsIconChange,
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
  const availableIcons = ['👥', '💼', '🎮', '📚', '🎨', '🏃', '🍕', '🎵', '💻', '🌟', '🚀', '🎯', '🏆', '💡', '🔥', '⚡', '🌈', '🎉'];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [customIconPreview, setCustomIconPreview] = useState<string | null>(null);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingIcon(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Cloudinary using the upload API endpoint
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/group-icon', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();
      onSettingsIconChange(data.url);
    } catch (error) {
      console.error('Error uploading icon:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload icon. Please try again.');
      setCustomIconPreview(null);
    } finally {
      setUploadingIcon(false);
    }
  };

  const isCustomIcon = settingsIcon && (settingsIcon.startsWith('http://') || settingsIcon.startsWith('https://'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Group settings</DialogTitle>
          <DialogDescription>Manage this group&apos;s name, permissions and members.</DialogDescription>
        </DialogHeader>
        {selectedGroup && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Group name
              </label>
              <Input
                value={settingsName}
                onChange={(e) => onSettingsNameChange(e.target.value)}
                disabled={!canEditGroupMeta}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              {!canEditGroupMeta && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Only the admin or when allowed by admin can change the group name.
                </p>
              )}
            </div>

            {canEditGroupMeta && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Image className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  Group icon
                </label>
                
                {/* Custom Icon Preview */}
                {isCustomIcon && (
                  <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={customIconPreview || settingsIcon} />
                      <AvatarFallback>
                        <Image className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom Icon</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Click emojis below to change</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onSettingsIconChange('👥');
                        setCustomIconPreview(null);
                      }}
                      className="text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {/* Emoji Icons Grid */}
                <div className="grid grid-cols-9 gap-2">
                  {availableIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        onSettingsIconChange(icon);
                        setCustomIconPreview(null);
                      }}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl transition-all ${
                        settingsIcon === icon && !isCustomIcon
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-600 dark:ring-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>

                {/* Upload Custom Icon Button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleIconUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingIcon}
                    className="w-full dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingIcon ? 'Uploading...' : 'Upload Custom Icon'}
                  </Button>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Upload an image (max 5MB)
                  </p>
                </div>
              </div>
            )}

            {isCurrentUserAdmin && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Permissions</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <Checkbox
                      checked={settingsAllowEdit}
                      onCheckedChange={(v) => onSettingsAllowEditChange(Boolean(v))}
                    />
                    <span>Allow members to edit group name &amp; icon</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
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
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Add members</p>
                {loadingFriends ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Loading friends…</p>
                ) : friends.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You don&apos;t have any friends yet to add to this group.
                  </p>
                ) : (
                  <ScrollArea className="h-32 border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-800">
                    <div className="p-3 space-y-2">
                      {friends.filter((friend) => !selectedGroup.memberIds.includes(friend.id))
                        .length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          All of your friends are already members of this group.
                        </p>
                      ) : (
                        friends
                          .filter((friend) => !selectedGroup.memberIds.includes(friend.id))
                          .map((friend) => (
                            <label
                              key={friend.id}
                              className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
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
                                <span className="text-xs text-slate-400 dark:text-slate-500">@{friend.username}</span>
                              </div>
                            </label>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
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