'use client';

import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileShortCard } from './profile-short-card';

interface LikedPost {
  _id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  userId: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  liked: boolean;
}

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

interface ProfileLikesTabProps {
  likedPosts: LikedPost[];
  likedShorts: UserShort[];
  loadingLikes: boolean;
  hasMoreLikedPosts: boolean;
  hasMoreLikedShorts: boolean;
  loadingMoreLikes: boolean;
  onLoadMoreLikedContent: () => void;
  onHighlightPost: (postId: string) => void;
  onViewShort: (shortId: string) => void;
}

export function ProfileLikesTab({
  likedPosts,
  likedShorts,
  loadingLikes,
  hasMoreLikedPosts,
  hasMoreLikedShorts,
  loadingMoreLikes,
  onLoadMoreLikedContent,
  onHighlightPost,
  onViewShort,
}: ProfileLikesTabProps) {
  if (loadingLikes) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        Loading liked content...
      </div>
    );
  }

  if (likedPosts.length === 0 && likedShorts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Liked posts and shorts will appear here.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Liked Posts Section */}
      {likedPosts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Liked Posts</h3>
          <div className="space-y-4">
            {likedPosts.map((post) => (
              <Card
                key={post._id}
                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onHighlightPost(post._id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={post.author.avatarUrl} />
                      <AvatarFallback>{post.author.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900">{post.author.name}</p>
                      <p className="text-xs text-slate-500">{post.author.username}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-700 mb-3 line-clamp-3">{post.content}</p>
                  
                  {post.imageUrl && (
                    <div className="rounded-lg overflow-hidden mb-3">
                      <img
                        src={post.imageUrl}
                        alt="Post content"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{post.stats.likes} likes</span>
                    <span>{post.stats.comments} comments</span>
                    <span>{post.stats.shares} shares</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Liked Shorts Section */}
      {likedShorts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Liked Shorts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {likedShorts.map((short) => (
              <ProfileShortCard
                key={short.id}
                short={short}
                isOwnProfile={false}
                onView={onViewShort}
              />
            ))}
          </div>
        </div>
      )}

      {/* Load more liked content button */}
      {(hasMoreLikedPosts || hasMoreLikedShorts) && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={onLoadMoreLikedContent}
            disabled={loadingMoreLikes}
            className="text-sm"
          >
            {loadingMoreLikes ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Load more liked content
          </Button>
        </div>
      )}
    </div>
  );
}