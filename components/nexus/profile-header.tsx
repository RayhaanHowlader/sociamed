'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileAvatarActions } from './profile-header-actions';
import { ProfilePhotoViewer } from './profile-photo-viewer';
import { useProfilePhotoViewer } from './use-profile-photo-viewer';

interface ProfileHeaderProps {
  profile: {
    name: string;
    username?: string;
    avatarUrl: string;
    coverUrl: string;
  } | null;
  isOwnProfile: boolean;
  onEditProfile: () => void;
}

export function ProfileHeader({ profile, isOwnProfile, onEditProfile }: ProfileHeaderProps) {
  const { isOpen, photoData, openPhotoViewer, closePhotoViewer } = useProfilePhotoViewer();

  if (!profile) return null;

  const handleAvatarClick = () => {
    openPhotoViewer({
      photoUrl: profile.avatarUrl,
      userName: profile.name,
      userUsername: profile.username || 'user',
      fallbackText: profile.name ? profile.name[0].toUpperCase() : 'N',
    });
  };

  return (
    <div className="relative">
      <div className="h-64 bg-gradient-to-r from-blue-600 to-cyan-600 relative">
        {profile.coverUrl ? (
          <img 
            src={profile.coverUrl} 
            alt="Cover" 
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/80 text-sm uppercase tracking-[0.3em]">
            Cover image
          </div>
        )}
      </div>

      <div className="px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16">
          <div className="relative">
            <Avatar 
              className="w-32 h-32 border-4 border-white shadow-xl cursor-pointer hover:shadow-2xl transition-shadow duration-200"
              onClick={handleAvatarClick}
            >
              <AvatarImage src={profile.avatarUrl} />
              <AvatarFallback className="text-3xl">
                {profile.name ? profile.name[0] : 'N'}
              </AvatarFallback>
            </Avatar>
            <ProfileAvatarActions
              isOwnProfile={isOwnProfile}
              onEditProfile={onEditProfile}
            />
          </div>
        </div>
      </div>

      <ProfilePhotoViewer
        open={isOpen}
        onOpenChange={closePhotoViewer}
        photoUrl={photoData?.photoUrl}
        userName={photoData?.userName || ''}
        userUsername={photoData?.userUsername || ''}
        fallbackText={photoData?.fallbackText || 'N'}
      />
    </div>
  );
}