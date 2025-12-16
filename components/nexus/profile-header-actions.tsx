'use client';

import { Edit, Settings, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FriendshipActions } from './friendship-actions';

interface ProfileHeaderActionsProps {
  isOwnProfile: boolean;
  viewedUserId: string | null;
  currentUserId: string | null;
  profile: {
    name: string;
    username: string;
    avatarUrl: string;
  } | null;
  onEditProfile: () => void;
}

export function ProfileHeaderActions({
  isOwnProfile,
  viewedUserId,
  currentUserId,
  profile,
  onEditProfile,
}: ProfileHeaderActionsProps) {
  if (isOwnProfile) {
    return (
      <div className="flex gap-2 mt-4 sm:mt-0">
        <Button variant="outline" className="border-slate-300" onClick={onEditProfile}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
        <Button variant="outline" size="icon" className="border-slate-300">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <FriendshipActions
      viewedUserId={viewedUserId}
      currentUserId={currentUserId}
      isOwnProfile={isOwnProfile}
      profile={profile}
    />
  );
}

interface ProfileAvatarActionsProps {
  isOwnProfile: boolean;
  onEditProfile: () => void;
}

export function ProfileAvatarActions({
  isOwnProfile,
  onEditProfile,
}: ProfileAvatarActionsProps) {
  if (!isOwnProfile) {
    return null;
  }

  return (
    <Button
      size="icon"
      className="absolute bottom-2 right-2 w-8 h-8 bg-white hover:bg-slate-100 text-slate-900 shadow-lg"
      onClick={onEditProfile}
    >
      <Camera className="w-4 h-4" />
    </Button>
  );
}