'use client';

import { useState } from 'react';

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

interface UserPost {
  id: string;
  content: string;
  imageUrl: string;
  createdAt: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  liked?: boolean;
}

export function usePostInteractions() {
  const [postComments, setPostComments] = useState<Record<string, PostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const toggleLike = async (postId: string, posts: UserPost[], setPosts: (posts: UserPost[]) => void) => {
    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) return;

      setPosts(
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                stats: { ...p.stats, likes: data.likes },
                liked: data.liked,
              }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const loadComments = async (postId: string) => {
    if (postComments[postId]) return;
    try {
      const res = await fetch(`/api/posts/comments?postId=${postId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) return;
      setPostComments((prev) => ({ ...prev, [postId]: data.comments ?? [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const addComment = async (postId: string, posts: UserPost[], setPosts: (posts: UserPost[]) => void) => {
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
      if (!res.ok) return;

      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), data.comment],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts(
        posts.map((p) =>
          p.id === postId ? { ...p, stats: { ...p.stats, comments: p.stats.comments + 1 } } : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentInputChange = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  return {
    postComments,
    commentInputs,
    toggleLike,
    loadComments,
    addComment,
    handleCommentInputChange,
  };
}