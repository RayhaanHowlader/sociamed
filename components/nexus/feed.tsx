'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PostComposer } from './post-composer';
import { PostCard } from './post-card';
import { PostModal } from './post-modal';
import { SharePostModal } from './share-post-modal';
import { ImageViewerModal } from './image-viewer-modal';
import { usePostData } from './use-post-data';
import { useFeedInteractions } from './use-feed-interactions';
import { useInfiniteScroll } from './use-infinite-scroll';
import { useSocketManagement } from './use-socket-management';

interface Post {
  _id: string;
  content: string;
  imageUrl?: string;
  imagePublicId?: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  userId: string;
  stats?: {
    likes: number;
    comments: number;
    shares: number;
  };
  liked?: boolean;
}

export function Feed() {
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Use custom hooks for data and interactions
  const {
    profile,
    posts,
    setPosts,
    loadingPosts,
    hasMorePosts,
    loadingMore,
    currentUserId,
    postComments,
    setPostComments,
    hasMoreComments,
    loadingMoreComments,
    loadMorePosts,
    loadComments,
    loadMoreComments,
  } = usePostData();

  const {
    commentInputs,
    setCommentInputs,
    openComments,
    deleteTarget,
    setDeleteTarget,
    shareModalOpen,
    shareTarget,
    imageViewerOpen,
    setImageViewerOpen,
    imageViewerData,
    toggleLike,
    handleToggleComments,
    addComment,
    handleDeletePost,
    handleSharePost,
    handleShareSuccess,
    handleShareModalChange,
    handleImageClick,
    handleViewProfile,
  } = useFeedInteractions(posts, setPosts, postComments, setPostComments, loadComments);

  const { loadMoreTriggerRef } = useInfiniteScroll(hasMorePosts, loadingMore, loadMorePosts);

  // Socket management for real-time features (like shared posts)
  const { socket, isConnected } = useSocketManagement({
    currentUserId,
    selectedChat: null, // Feed doesn't have selected chat
    friends: [], // Feed doesn't need friends list
    onMessageReceived: () => {}, // Feed doesn't handle messages
    onMessageSeen: () => {},
    onMessageIdUpdated: () => {},
    onMessagesDeleted: () => {},
    onRefreshChat: () => {},
  });

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setPostModalOpen(true);
    // Load comments for the selected post
    loadComments(post._id);
  };

  // Listen for post highlight events
  useEffect(() => {
    const handleHighlightPost = (e: CustomEvent<{ postId: string }>) => {
      const postId = e.detail.postId;
      setHighlightedPostId(postId);
      
      // Scroll to the post if it exists
      setTimeout(() => {
        const postElement = postRefs.current[postId];
        if (postElement) {
          postElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedPostId(null);
          }, 3000);
        }
      }, 200);
    };

    window.addEventListener('highlight-post' as any, handleHighlightPost as EventListener);
    return () => {
      window.removeEventListener('highlight-post' as any, handleHighlightPost as EventListener);
    };
  }, []);



  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <PostComposer profile={profile} onPostCreated={handlePostCreated} />

        <div>
          {loadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
              <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
                No posts yet. Be the first to share something!
              </CardContent>
            </Card>
          ) : (
            <>
              {posts.map((post) => {
                const commentsForPost = postComments[post._id] ?? [];
                const commentValue = commentInputs[post._id] ?? '';
                return (
                  <div
                    key={post._id}
                    ref={(el) => {
                      postRefs.current[post._id] = el;
                    }}
                    className="cursor-pointer"
                    onClick={() => handlePostClick(post)}
                  >
                    <PostCard
                      post={post}
                      comments={commentsForPost}
                      commentValue={commentValue}
                      isCommentsOpen={openComments[post._id] ?? false}
                      hasMoreComments={hasMoreComments[post._id] ?? false}
                      loadingMoreComments={loadingMoreComments[post._id] ?? false}
                      currentUserId={currentUserId}
                      highlightedPostId={highlightedPostId}
                      onEdit={() => {}} // Edit functionality moved to PostCard
                      onDelete={setDeleteTarget}
                      onLike={toggleLike}
                      onToggleComments={handleToggleComments}
                      onShare={handleSharePost}
                      onImageClick={handleImageClick}
                      onCommentChange={(postId, value) => 
                        setCommentInputs((prev) => ({ ...prev, [postId]: value }))
                      }
                      onAddComment={addComment}
                      onLoadMoreComments={loadMoreComments}
                      onViewProfile={handleViewProfile}
                    />
                  </div>
                );
              })}
          
              {/* Intersection observer trigger for automatic loading */}
              {hasMorePosts && (
                <div 
                  ref={loadMoreTriggerRef}
                  className="h-4 w-full"
                />
              )}

              {/* Load more button or loading indicator */}
              {hasMorePosts && !loadingMore && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadMorePosts()}
                    className="text-xs"
                  >
                    Load more posts
                  </Button>
                </div>
              )}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              )}

              {/* End of posts indicator */}
              {!hasMorePosts && posts.length > 0 && (
                <div className="flex justify-center py-8">
                  <p className="text-sm text-slate-500 dark:text-slate-400">You've reached the end of the feed</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Delete post?</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              This action cannot be undone. The post and any attached image will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)} className="dark:text-slate-300 dark:hover:bg-slate-700">
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && handleDeletePost(deleteTarget._id)}
            >
              Delete post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SharePostModal
        open={shareModalOpen}
        onOpenChange={handleShareModalChange}
        post={shareTarget}
        onShareSuccess={handleShareSuccess}
        socket={socket}
        isSocketConnected={isConnected}
      />

      <ImageViewerModal
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        image={imageViewerData}
      />

      <PostModal
        open={postModalOpen}
        onOpenChange={setPostModalOpen}
        post={selectedPost}
        comments={selectedPost ? (postComments[selectedPost._id] ?? []) : []}
        commentValue={selectedPost ? (commentInputs[selectedPost._id] ?? '') : ''}
        hasMoreComments={selectedPost ? (hasMoreComments[selectedPost._id] ?? false) : false}
        loadingMoreComments={selectedPost ? (loadingMoreComments[selectedPost._id] ?? false) : false}
        currentUserId={currentUserId}
        onEdit={() => {}} // Edit functionality handled in PostModal
        onDelete={(post) => {
          setDeleteTarget(post);
          setPostModalOpen(false);
        }}
        onLike={toggleLike}
        onShare={(post) => {
          handleSharePost(post);
          setPostModalOpen(false);
        }}
        onImageClick={(post) => {
          handleImageClick(post);
          setPostModalOpen(false);
        }}
        onCommentChange={(postId, value) => 
          setCommentInputs((prev) => ({ ...prev, [postId]: value }))
        }
        onAddComment={addComment}
        onLoadMoreComments={loadMoreComments}
        onViewProfile={handleViewProfile}
      />
    </div>
  );
}
