'use client';

import { useState, useEffect } from 'react';

interface FriendConversation {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export function useFriendsManagement() {
  const [friends, setFriends] = useState<FriendConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [friendsPage, setFriendsPage] = useState(1);
  const [hasMoreFriends, setHasMoreFriends] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingMoreFriends, setLoadingMoreFriends] = useState(false);
  const [searchingFriends, setSearchingFriends] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load friends when debounced search changes
  useEffect(() => {
    setFriendsPage(1);
    setHasMoreFriends(true);
    loadFriends(1, debouncedSearch, false);
  }, [debouncedSearch]);

  const loadFriends = async (pageNum: number = 1, search: string = '', append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoadingFriends(true);
      } else {
        setLoadingMoreFriends(true);
      }
      
      if (search !== debouncedSearch) {
        setSearchingFriends(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '5',
        ...(search && { search })
      });

      const res = await fetch(`/api/friends/search?${params}`, { credentials: 'include' });
      const data = await res.json();
      
      if (!res.ok) {
        console.error(data.error || 'Unable to load friends');
        return;
      }

      if (append && pageNum > 1) {
        setFriends(prev => [...prev, ...(data.friends ?? [])]);
      } else {
        setFriends(data.friends ?? []);
        // Auto-select on desktop only
        if (data.friends?.length && pageNum === 1 && !search) {
          const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
          if (isDesktop) {
            return data.friends[0]; // Return first friend for auto-selection
          }
        }
      }
      
      setHasMoreFriends(data.hasMore ?? false);
      setFriendsPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFriends(false);
      setLoadingMoreFriends(false);
      setSearchingFriends(false);
    }
  };

  const handleLoadMoreFriends = () => {
    if (hasMoreFriends && !loadingMoreFriends && !loadingFriends) {
      loadFriends(friendsPage + 1, debouncedSearch, true);
    }
  };

  return {
    friends,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    friendsPage,
    hasMoreFriends,
    loadingFriends,
    loadingMoreFriends,
    searchingFriends,
    loadFriends,
    handleLoadMoreFriends,
  };
}