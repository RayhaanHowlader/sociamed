'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useProfileData } from './use-profile-data';
import { usePostInteractions } from './use-post-interactions';
import { EditProfileModal } from './edit-profile-modal';
import { ProfilePostsTab } from './profile-posts-tab';
import { ProfileShortsTab } from './profile-shorts-tab';
import { ProfileLikesTab } from './profile-likes-tab';
import { ProfileHeader } from './profile-header';
import { ProfileInfo } from './profile-info';
import { ProfileEmptyState } from './profile-empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfileProps {
  userId?: string;
}

export function Profile({ userId }: ProfileProps = {}) {
  const [activeTab, setActiveTab] = useState('posts');
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Use custom hooks for data management
  const profileData = useProfileData(userId);
  const postInteractions = usePostInteractions();
  // Destructure data from hooks
  const {
    loading,
    profile,
    setProfile,
    isOwnProfile,
    viewedUserId,
    currentUserId,
    posts,
    setPosts,
    loadingPosts,
    hasMorePosts,
    loadingMorePosts,
    shorts,
    loadingShorts,
    hasMoreShorts,
    loadingMoreShorts,
    likedPosts,
    likedShorts,
    loadingLikes,
    hasMoreLikedPosts,
    hasMoreLikedShorts,
    loadingMoreLikes,
    followers,
    following,
    fetchShorts,
    fetchLikedContent,
    loadMorePosts,
  } = profileData;

  const {
    postComments,
    commentInputs,
    toggleLike,
    loadComments,
    addComment,
    handleCommentInputChange,
  } = postInteractions;

  // Handler functions for components
  const handleProfileSave = (updatedProfile: any) => {
    setProfile(updatedProfile);
  };

  const handleViewShort = (shortId: string) => {
    window.dispatchEvent(new CustomEvent('view-short', { 
      detail: { shortId } 
    }));
  };

  const handleEditShort = (short: any) => {
    console.log('Edit short:', short);
  };

  const handleDeleteShort = (shortId: string) => {
    console.log('Delete short:', shortId);
  };

  const handleHighlightPost = (postId: string) => {
    window.dispatchEvent(new CustomEvent('highlight-post', { 
      detail: { postId } 
    }));
  };

  return (
    <ScrollArea className="h-full bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-blue-600" />
          </div>
        ) : profile ? (
          <>
            <ProfileHeader
              profile={profile}
              isOwnProfile={isOwnProfile}
              onEditProfile={() => setEditModalOpen(true)}
            />

            <ProfileInfo
              profile={profile}
              isOwnProfile={isOwnProfile}
              viewedUserId={viewedUserId}
              currentUserId={currentUserId}
              posts={posts}
              followers={followers}
              following={following}
              onEditProfile={() => setEditModalOpen(true)}
            />

            <div className="px-6 pb-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3 mb-2">
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="shorts" onClick={fetchShorts}>Shorts</TabsTrigger>
                  <TabsTrigger value="likes" onClick={fetchLikedContent}>Likes</TabsTrigger>
                </TabsList>

                <TabsContent value="posts">
                  <ProfilePostsTab
                    posts={posts}
                    loadingPosts={loadingPosts}
                    hasMorePosts={hasMorePosts}
                    loadingMorePosts={loadingMorePosts}
                    onLoadMorePosts={loadMorePosts}
                  />
                </TabsContent>

                <TabsContent value="shorts">
                  <ProfileShortsTab
                    shorts={shorts}
                    loadingShorts={loadingShorts}
                    hasMoreShorts={hasMoreShorts}
                    loadingMoreShorts={loadingMoreShorts}
                    isOwnProfile={isOwnProfile}
                    onLoadMoreShorts={() => {}} // TODO: Implement in hook
                    onViewShort={handleViewShort}
                    onEditShort={handleEditShort}
                    onDeleteShort={handleDeleteShort}
                  />
                </TabsContent>

                <TabsContent value="likes">
                  <ProfileLikesTab
                    likedPosts={likedPosts}
                    likedShorts={likedShorts}
                    loadingLikes={loadingLikes}
                    hasMoreLikedPosts={hasMoreLikedPosts}
                    hasMoreLikedShorts={hasMoreLikedShorts}
                    loadingMoreLikes={loadingMoreLikes}
                    onLoadMoreLikedContent={() => {}} // TODO: Implement in hook
                    onHighlightPost={handleHighlightPost}
                    onViewShort={handleViewShort}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <ProfileEmptyState onCreateProfile={() => setEditModalOpen(true)} />
        )}
      </div>

      <EditProfileModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        profile={profile}
        onSave={handleProfileSave}
      />
      

    </ScrollArea>
  );
}