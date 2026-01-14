'use client';

import { MapPin, Link as LinkIcon, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ProfileHeaderActions } from './profile-header-actions';

interface ProfileInfoProps {
  profile: {
    name: string;
    username: string;
    bio: string;
    location: string;
    website: string;
    createdAt?: string;
    avatarUrl: string;
  } | null;
  isOwnProfile: boolean;
  viewedUserId: string | null;
  currentUserId: string | null;
  posts: any[];
  followers: number;
  following: number;
  onEditProfile: () => void;
}

export function ProfileInfo({
  profile,
  isOwnProfile,
  viewedUserId,
  currentUserId,
  posts,
  followers,
  following,
  onEditProfile,
}: ProfileInfoProps) {
  if (!profile) return null;

  const joinedLabel = profile.createdAt
    ? `Joined ${format(new Date(profile.createdAt), 'MMMM yyyy')}`
    : 'Joined recently';

  return (
    <div className="px-6 pb-3 -mt-2">
      {/* Mobile: Edit Profile button below avatar */}
      <div className="sm:hidden mb-3">
        <ProfileHeaderActions
          isOwnProfile={isOwnProfile}
          viewedUserId={viewedUserId}
          currentUserId={currentUserId}
          profile={profile}
          onEditProfile={onEditProfile}
        />
      </div>

      {/* Desktop: Edit Profile button aligned to right */}
      <div className="hidden sm:flex sm:items-start sm:justify-between mb-1">
        <div className="flex-1" />
        <div className="-mt-4">
          <ProfileHeaderActions
            isOwnProfile={isOwnProfile}
            viewedUserId={viewedUserId}
            currentUserId={currentUserId}
            profile={profile}
            onEditProfile={onEditProfile}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h1>
          <p className="text-slate-600 dark:text-slate-400">{profile.username}</p>
        </div>

        {profile.bio && <p className="text-slate-700 dark:text-slate-300">{profile.bio}</p>}

        <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center gap-1">
              <LinkIcon className="w-4 h-4" />
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{joinedLabel}</span>
          </div>
        </div>

        <div className="flex gap-6 pt-1">
          <button className="hover:underline">
            <span className="font-bold text-slate-900 dark:text-white">{posts.length}</span>
            <span className="text-slate-600 dark:text-slate-400 ml-1">Posts</span>
          </button>
          <button className="hover:underline">
            <span className="font-bold text-slate-900 dark:text-white">{followers}</span>
            <span className="text-slate-600 dark:text-slate-400 ml-1">Followers</span>
          </button>
          <button className="hover:underline">
            <span className="font-bold text-slate-900 dark:text-white">{following}</span>
            <span className="text-slate-600 dark:text-slate-400 ml-1">Following</span>
          </button>
        </div>
      </div>
    </div>
  );
}