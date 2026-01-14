'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

interface PostCardProps {
  post: Post;
  comments: PostComment[];
  commentValue: string;
  isCommentsOpen: boolean;
  hasMoreComments: boolean;
  loadingMoreComments: boolean;
  currentUserId: string | null;
  highlightedPostId: string | null;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onLike: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onShare: (post: Post) => void;
  onImageClick: (post: Post) => void;
  onCommentChange: (postId: string, value: string) => void;
  onAddComment: (postId: string) => void;
  onLoadMoreComments: (postId: string) => void;
  onViewProfile: (userId: string) => void;
}

export function PostCard({
  post,
  comments,
  commentValue,
  isCommentsOpen,
  hasMoreComments,
  loadingMoreComments,
  currentUserId,
  highlightedPostId,
  onEdit,
  onDelete,
  onLike,
  onToggleComments,
  onShare,
  onImageClick,
  onCommentChange,
  onAddComment,
  onLoadMoreComments,
  onViewProfile,
}: PostCardProps) {
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const { isOpen, photoData, openPhotoViewer, closePhotoViewer } = useProfilePhotoViewer();

  const startEditing = (post: Post) => {
    setEditingPostId(post._id);
    setEditingContent(post.content);
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditingContent('');
  };

  const saveEdit = async (post: Post) => {
    if (!editingContent.trim()) {
      return;
    }

    try {
      const res = await fetch(`/api/posts/${post._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to update post');
        return;
      }

      // Update the post content locally
      post.content = editingContent;
      setEditingPostId(null);
      setEditingContent('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Card 
      className={`border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-800 ${
        highlightedPostId === post._id 
          ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50 dark:bg-blue-900/20' 
          : ''
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-3">
            <Avatar 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                openPhotoViewer({
                  photoUrl: post.author.avatarUrl,
                  userName: post.author.name,
                  userUsername: post.author.username,
                  fallbackText: post.author.name?.[0]?.toUpperCase() || 'U',
                });
              }}
            >
              <AvatarImage src={post.author.avatarUrl} />
              <AvatarFallback>{post.author.name?.[0]}</AvatarFallback>
            </Avatar>
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                if (post.userId && post.userId !== currentUserId) {
                  onViewProfile(post.userId);
                }
              }}
            >
              <p className="font-semibold text-slate-900 dark:text-white">{post.author.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {post.author.username} · {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          {currentUserId && currentUserId === post.userId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <DropdownMenuItem onClick={() => startEditing(post)} className="flex items-center gap-2 dark:text-slate-300 dark:hover:bg-slate-700">
                  <Pencil className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 flex items-center gap-2 dark:hover:bg-slate-700"
                  onClick={() => onDelete(post)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {editingPostId === post._id ? (
          <div className="mb-4 space-y-2">
            <Textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              rows={3}
              className="dark:bg-slate-900 dark:border-slate-600 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cancelEditing} className="dark:text-slate-300 dark:hover:bg-slate-700">
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-cyan-600"
                onClick={() => saveEdit(post)}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          post.content && <p className="text-slate-700 dark:text-slate-200 mb-4 leading-relaxed">{post.content}</p>
        )}

        {post.imageUrl && (
          <div 
            className="rounded-xl overflow-hidden mb-4 cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => onImageClick(post)}
          >
            <img src={post.imageUrl} alt="Post content" className="w-full object-cover" />
          </div>
        )}

        <PostActions
          post={post}
          onLike={onLike}
          onToggleComments={onToggleComments}
          onShare={onShare}
        />

        <PostComments
          postId={post._id}
          comments={comments}
          commentValue={commentValue}
          isOpen={isCommentsOpen}
          hasMore={hasMoreComments}
          loadingMore={loadingMoreComments}
          currentUserId={currentUserId}
          onCommentChange={onCommentChange}
          onAddComment={onAddComment}
          onLoadMore={onLoadMoreComments}
        />
      </CardContent>
    </Card>

    <ProfilePhotoViewer
      open={isOpen}
      onOpenChange={closePhotoViewer}
      photoUrl={photoData?.photoUrl}
      userName={photoData?.userName || ''}
      userUsername={photoData?.userUsername || ''}
      fallbackText={photoData?.fallbackText || 'U'}
    />
    </>
  );
}