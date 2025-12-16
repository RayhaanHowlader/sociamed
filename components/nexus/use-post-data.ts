'use client';

import { useState, useEffect, useCallback } from 'react';

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

interface ProfileSummary {
  name: string;
  username: string;
  avatarUrl?: string;
}

export function usePostData() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, PostComment[]>>({});
  const [hasMoreComments, setHasMoreComments] = useState<Record<string, boolean>>({});
  const [loadingMoreComments, setLoadingMoreComments] = useState<Record<string, boolean>>({});

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', { credentials: 'include' });
      if (!res.ok) {
        setProfile(null);
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch {
      setProfile(null);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const res = await fetch('/api/posts?limit=5');
      const data = await res.json();
      setPosts(data.posts ?? []);
      setHasMorePosts(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        setCurrentUserId(null);
        return;
      }
      const data = await res.json();
      setCurrentUserId(data.user?.sub ?? null);
    } catch {
      setCurrentUserId(null);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMorePosts) return;

    const oldestPost = posts[posts.length - 1];
    if (!oldestPost) return;

    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/posts?limit=5&after=${oldestPost.createdAt}`,
      );
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load more posts');
        return;
      }

      setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      setHasMorePosts(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMorePosts, posts]);

  const loadComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/comments?postId=${postId}&limit=5`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load comments');
        return;
      }
      setPostComments((prev) => ({ ...prev, [postId]: data.comments ?? [] }));
      setHasMoreComments((prev) => ({ ...prev, [postId]: data.hasMore ?? false }));
    } catch (err) {
      console.error(err);
    }
  };

  const loadMoreComments = useCallback(async (postId: string) => {
    if (loadingMoreComments[postId] || !hasMoreComments[postId]) return;

    const currentComments = postComments[postId] || [];
    if (currentComments.length === 0) return;

    const latestComment = currentComments[currentComments.length - 1];
    if (!latestComment) return;

    setLoadingMoreComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(
        `/api/posts/comments?postId=${postId}&limit=5&after=${latestComment.createdAt}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load more comments');
        return;
      }

      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), ...(data.comments ?? [])],
      }));
      setHasMoreComments((prev) => ({ ...prev, [postId]: data.hasMore ?? false }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMoreComments((prev) => ({ ...prev, [postId]: false }));
    }
  }, [loadingMoreComments, hasMoreComments, postComments]);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchCurrentUser();
  }, []);

  return {
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
  };
}