'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileShortCard } from './profile-short-card';

interface UserShort {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  createdAt: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  liked?: boolean;
}

interface ProfileShortsTabProps {
  shorts: UserShort[];
  loadingShorts: boolean;
  hasMoreShorts: boolean;
  loadingMoreShorts: boolean;
  isOwnProfile: boolean;
  onLoadMoreShorts: () => void;
  onViewShort: (shortId: string) => void;
  onEditShort: (short: UserShort) => void;
  onDeleteShort: (shortId: string) => void;
}

export function ProfileShortsTab({
  shorts,
  loadingShorts,
  hasMoreShorts,
  loadingMoreShorts,
  isOwnProfile,
  onLoadMoreShorts,
  onViewShort,
  onEditShort,
  onDeleteShort,
}: ProfileShortsTabProps) {
  if (loadingShorts) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        Loading your shorts...
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        Your shorts will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {shorts.map((short) => (
          <ProfileShortCard
            key={short.id}
            short={short}
            isOwnProfile={isOwnProfile}
            onView={onViewShort}
            onEdit={onEditShort}
            onDelete={onDeleteShort}
          />
        ))}
      </div>
      
      {/* Load more shorts button */}
      {hasMoreShorts && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={onLoadMoreShorts}
            disabled={loadingMoreShorts}
            className="text-sm"
          >
            {loadingMoreShorts ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Load more shorts
          </Button>
        </div>
      )}
    </div>
  );
}