'use client';

import { useState, useEffect } from 'react';

interface ProfileRecord {
  name: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  avatarUrl: string;
  coverUrl: string;
  createdAt?: string;
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

export function useProfileData(userId?: string) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [viewedUserId, setViewedUserId] = useState<string | null>(userId || null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Posts state
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  // Shorts state
  const [shorts, setShorts] = useState<UserShort[]>([]);
  const [loadingShorts, setLoadingShorts] = useState(false);
  const [hasMoreShorts, setHasMoreShorts] = useState(false);
  const [loadingMoreShorts, setLoadingMoreShorts] = useState(false);

  // Likes state
  const [likedPosts, setLikedPosts] = useState<LikedPost[]>([]);
  const [likedShorts, setLikedShorts] = useState<UserShort[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [hasMoreLikedPosts, setHasMoreLikedPosts] = useState(false);
  const [hasMoreLikedShorts, setHasMoreLikedShorts] = useState(false);
  const [loadingMoreLikes, setLoadingMoreLikes] = useState(false);

  // Stats state
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const url = viewedUserId 
        ? `/api/profile?userId=${viewedUserId}` 
        : '/api/profile';
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 401 || res.status === 404) {
        setProfile(null);
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
      setIsOwnProfile(data.isOwnProfile ?? false);
      if (viewedUserId && !data.isOwnProfile) {
        setViewedUserId(viewedUserId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const url = viewedUserId 
        ? `/api/posts/user?userId=${viewedUserId}&limit=5` 
        : '/api/posts/user?limit=5';

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        setPosts([]);
        setHasMorePosts(false);
        return;
      }
      const data = await res.json();
      setPosts(data.posts ?? []);
      setHasMorePosts(data.hasMore ?? false);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setPosts([]);
      setHasMorePosts(false);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchFriendCounts = async () => {
    try {
      const res = await fetch('/api/friends/counts', { credentials: 'include' });
      if (!res.ok) {
        setFollowers(0);
        setFollowing(0);
        return;
      }
      const data = await res.json();
      setFollowers(data.followers ?? 0);
      setFollowing(data.following ?? 0);
    } catch (err) {
      console.error(err);
      setFollowers(0);
      setFollowing(0);
    }
  };

  const fetchShorts = async () => {
    if (shorts.length > 0) return;
    
    try {
      setLoadingShorts(true);
      const url = viewedUserId 
        ? `/api/shorts/user?userId=${viewedUserId}&limit=5` 
        : '/api/shorts/user?limit=5';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        setShorts([]);
        setHasMoreShorts(false);
        return;
      }
      const data = await res.json();
      setShorts(data.shorts ?? []);
      setHasMoreShorts(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
      setShorts([]);
      setHasMoreShorts(false);
    } finally {
      setLoadingShorts(false);
    }
  };

  const fetchLikedContent = async () => {
    if (likedPosts.length > 0 || likedShorts.length > 0) return;
    
    try {
      setLoadingLikes(true);
      
      const [postsRes, shortsRes] = await Promise.all([
        fetch(viewedUserId 
          ? `/api/posts/liked?userId=${viewedUserId}&limit=3` 
          : '/api/posts/liked?limit=3', 
          { credentials: 'include' }
        ),
        fetch(viewedUserId 
          ? `/api/shorts/liked?userId=${viewedUserId}&limit=2` 
          : '/api/shorts/liked?limit=2', 
          { credentials: 'include' }
        )
      ]);

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setLikedPosts(postsData.posts ?? []);
        setHasMoreLikedPosts(postsData.hasMore ?? false);
      }

      if (shortsRes.ok) {
        const shortsData = await shortsRes.json();
        setLikedShorts(shortsData.shorts ?? []);
        setHasMoreLikedShorts(shortsData.hasMore ?? false);
      }
    } catch (err) {
      console.error(err);
      setLikedPosts([]);
      setLikedShorts([]);
      setHasMoreLikedPosts(false);
      setHasMoreLikedShorts(false);
    } finally {
      setLoadingLikes(false);
    }
  };

  // Effects
  useEffect(() => {
    if (userId && userId !== viewedUserId) {
      setViewedUserId(userId);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [viewedUserId]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.user?.sub) {
          setCurrentUserId(String(data.user.sub));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [viewedUserId]);

  useEffect(() => {
    fetchFriendCounts();
  }, []);

  return {
    // Profile data
    loading,
    profile,
    setProfile,
    isOwnProfile,
    viewedUserId,
    currentUserId,
    
    // Posts data
    posts,
    setPosts,
    loadingPosts,
    hasMorePosts,
    loadingMorePosts,
    setLoadingMorePosts,
    setHasMorePosts,
    
    // Shorts data
    shorts,
    setShorts,
    loadingShorts,
    hasMoreShorts,
    loadingMoreShorts,
    setLoadingMoreShorts,
    setHasMoreShorts,
    
    // Likes data
    likedPosts,
    setLikedPosts,
    likedShorts,
    setLikedShorts,
    loadingLikes,
    hasMoreLikedPosts,
    hasMoreLikedShorts,
    loadingMoreLikes,
    setLoadingMoreLikes,
    setHasMoreLikedPosts,
    setHasMoreLikedShorts,
    
    // Stats
    followers,
    following,
    
    // Functions
    fetchShorts,
    fetchLikedContent,
  };
}