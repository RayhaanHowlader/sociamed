'use client';

import { useState } from 'react';
import { X, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PostActions } from './post-actions';
import { PostComments } from './post-comments';
import { ProfilePhotoViewer } from './profile-photo-viewer';
import { useProfilePhotoViewer } from './use-profile-photo-viewer';

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

interface PostComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
  };
}

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post | null;
  comments: PostComment[];
  commentValue: string;
  hasMoreComments: boolean;
  loadingMoreComments: boolean;
  currentUserId: string | null;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onLike: (postId: string) => void;
  onShare: (post: Post) => void;
  onImageClick: (post: Post) => void;
  onCommentChange: (postId: string, value: string) => void;
  onAddComment: (postId: string) => void;
  onLoadMoreComments: (postId: string) => void;
  onViewProfile: (userId: string) => void;
}

export function PostModal({
  open,
  onOpenChange,
  post,
  comments,
  commentValue,
  hasMoreComments,
  loadingMoreComments,
  currentUserId,
  onEdit,
  onDelete,
  onLike,
  onShare,
  onImageClick,
  onCommentChange,
  onAddComment,
  onLoadMoreComments,
  onViewProfile,
}: PostModalProps) {
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const { isOpen, photoData, openPhotoViewer, closePhotoViewer } = useProfilePhotoViewer();

  if (!post) return null;

  const startEditing = (post: Post) => {
    setEditingPostId(post._id);
    setEditingContent(post.content);
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditingContent('');
  };

  const saveEdit = async () => {
    if (!editingContent.trim()) return;
    
    try {
      const response = await fetch(`/api/posts/${post._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editingContent }),
      });

      if (response.ok) {
        // Update the post content locally
        post.content = editingContent;
        cancelEditing();
      }
    } catch (error) {
      console.error('Failed to update post:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const isOwner = currentUserId === post.userId;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar 
                  className="w-10 h-10 cursor-pointer" 
                  onClick={() => onViewProfile(post.userId)}
                >
                  <AvatarImage src={post.author.avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {post.author.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 
                      className="font-semibold text-slate-900 dark:text-white cursor-pointer hover:underline"
                      onClick={() => onViewProfile(post.userId)}
                    >
                      {post.author.name}
                    </h3>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                      @{post.author.username}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(post.createdAt)}
                  </p>
                </div>
              </div>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700">
                    <DropdownMenuItem 
                      onClick={() => startEditing(post)}
                      className="dark:hover:bg-slate-700"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(post)}
                      className="text-red-600 dark:text-red-400 dark:hover:bg-slate-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </DialogHeader>

          <div className="px-6">
            {/* Post Content */}
            <div className="mb-4">
              {editingPostId === post._id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="min-h-[100px] resize-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    placeholder="What's on your mind?"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdit}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>
              )}
            </div>

            {/* Post Image */}
            {post.imageUrl && (
              <div className="mb-4">
                <img
                  src={post.imageUrl}
                  alt="Post content"
                  className="w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => onImageClick(post)}
                />
              </div>
            )}

            {/* Post Actions */}
            <div className="mb-6">
              <PostActions
                post={post}
                onLike={onLike}
                onShare={onShare}
                onToggleComments={() => {}} // Comments are always shown in modal
                isCommentsOpen={true}
              />
            </div>

            {/* Comments Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <PostComments
                postId={post._id}
                comments={comments}
                commentValue={commentValue}
                hasMoreComments={hasMoreComments}
                loadingMoreComments={loadingMoreComments}
                currentUserId={currentUserId}
                onCommentChange={onCommentChange}
                onAddComment={onAddComment}
                onLoadMoreComments={onLoadMoreComments}
                onViewProfile={onViewProfile}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProfilePhotoViewer
        isOpen={isOpen}
        photoData={photoData}
        onClose={closePhotoViewer}
      />
    </>
  );
}