'use client';

import { useState, useEffect, useCallback } from 'react';
import { Group, Friend } from './group-chat-utils';

export function useGroupData() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groupMembers, setGroupMembers] = useState<Friend[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Loading states
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Pagination states
  const [groupsPage, setGroupsPage] = useState(1);
  const [hasMoreGroups, setHasMoreGroups] = useState(true);
  const [loadingMoreGroups, setLoadingMoreGroups] = useState(false);
  const [searchingGroups, setSearchingGroups] = useState(false);

  // Load current user
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

  // Load friends
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        const res = await fetch('/api/friends/list', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) {
          console.error(data.error || 'Unable to load friends');
          return;
        }
        setFriends(
          (data.friends ?? []).map((f: any) => ({
            id: f.userId,
            name: f.name ?? 'User',
            username: f.username ?? '',
            avatarUrl: f.avatarUrl ?? '',
          })),
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, []);

  // Load groups function
  const loadGroups = useCallback(async (pageNum: number = 1, search: string = '', append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoadingGroups(true);
      } else {
        setLoadingMoreGroups(true);
      }
      
      if (search) {
        setSearchingGroups(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '5',
        ...(search && { search })
      });

      const res = await fetch(`/api/groups?${params}`, { credentials: 'include' });
      const data = await res.json();
      
      if (!res.ok) {
        console.error(data.error || 'Unable to load groups');
        return;
      }

      if (append && pageNum > 1) {
        setGroups(prev => [...prev, ...(data.groups ?? [])]);
      } else {
        setGroups(data.groups ?? []);
      }
      
      setHasMoreGroups(data.hasMore ?? false);
      setGroupsPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGroups(false);
      setLoadingMoreGroups(false);
      setSearchingGroups(false);
    }
  }, []);

  // Load group members
  const loadGroupMembers = useCallback(async (selectedGroup: Group | null) => {
    if (!selectedGroup) {
      setGroupMembers([]);
      return;
    }
    try {
      setLoadingMembers(true);
      const res = await fetch(`/api/groups/members?groupId=${selectedGroup._id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load group members');
        return;
      }
      setGroupMembers(
        (data.members ?? []).map((m: any) => ({
          id: m.userId,
          name: m.name,
          username: m.username,
          avatarUrl: m.avatarUrl,
        })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  return {
    // Data
    groups,
    friends,
    groupMembers,
    currentUserId,
    
    // Loading states
    loadingGroups,
    loadingFriends,
    loadingMembers,
    loadingMoreGroups,
    searchingGroups,
    
    // Pagination
    groupsPage,
    hasMoreGroups,
    
    // Functions
    loadGroups,
    loadGroupMembers,
    setGroups,
    setGroupsPage,
    setHasMoreGroups
  };
}