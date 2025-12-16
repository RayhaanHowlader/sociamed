'use client';

import { useState, useCallback } from 'react';

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

export function useFeedInteractions(
  posts: Post[],
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>,
  postComments: Record<string, PostComment[]>,
  setPostComments: React.Dispatch<React.SetStateAction<Record<string, PostComment[]>>>,
  loadComments: (postId: string) => Promise<void>
) {
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<Post | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerData, setImageViewerData] = useState<{
    url: string;
    senderName?: string;
    senderAvatar?: string;
    senderUsername?: string;
    timestamp?: string;
    caption?: string;
  } | null>(null);

  const toggleLike = async (postId: string) => {
    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to like post');
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                stats: {
                  ...(p.stats || { likes: 0, comments: 0, shares: 0 }),
                  likes: data.likes,
                },
                liked: data.liked,
              }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (openComments[postId]) {
      setOpenComments((prev) => ({ ...prev, [postId]: false }));
      return;
    }

    if (!postComments[postId]) {
      await loadComments(postId);
    }

    setOpenComments((prev) => ({ ...prev, [postId]: true }));
  };

  const addComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId, content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to add comment');
        return;
      }

      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), data.comment],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, stats: { ...(p.stats || { likes: 0, comments: 0, shares: 0 }), comments: (p.stats?.comments ?? 0) + 1 } }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to delete post');
        return;
      }

      setPosts((prev) => prev.filter((p) => p._id !== id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSharePost = (post: Post) => {
    setShareTarget(post);
    setShareModalOpen(true);
  };

  const handleShareSuccess = (sharedCount: number) => {
    if (shareTarget) {
      setPosts((prev) =>
        prev.map((p) =>
          p._id === shareTarget._id
            ? { ...p, stats: { ...(p.stats || { likes: 0, comments: 0, shares: 0 }), shares: (p.stats?.shares ?? 0) + sharedCount } }
            : p,
        ),
      );
    }
    setShareModalOpen(false);
    setShareTarget(null);
  };

  const handleShareModalChange = (open: boolean) => {
    setShareModalOpen(open);
    if (!open) {
      setShareTarget(null);
    }
  };

  const handleImageClick = (post: Post) => {
    if (!post.imageUrl) return;
    
    setImageViewerData({
      url: post.imageUrl,
      senderName: post.author.name,
      senderAvatar: post.author.avatarUrl,
      senderUsername: post.author.username,
      timestamp: post.createdAt,
      caption: post.content,
    });
    setImageViewerOpen(true);
  };

  const handleViewProfile = useCallback((userId: string) => {
    window.dispatchEvent(new CustomEvent('view-profile', { detail: { userId } }));
  }, []);

  return {
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
  };
}