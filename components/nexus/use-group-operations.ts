'use client';

import { useCallback } from 'react';
import { Group, Friend, uploadIcon } from './group-chat-utils';
import { Socket } from 'socket.io-client';

interface UseGroupOperationsProps {
  currentUserId: string | null;
  socketRef: React.RefObject<Socket | null>;
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  setGroupMembers: React.Dispatch<React.SetStateAction<Friend[]>>;
  setError: (error: string) => void;
  setDeleteError: (error: string) => void;
  setCreating: (creating: boolean) => void;
  setDeleting: (deleting: boolean) => void;
  setSavingSettings: (saving: boolean) => void;
  setRemovingMember: (removing: boolean) => void;
  setUploadingIcon: (uploading: boolean) => void;
  setCustomIconUrl: (url: string) => void;
  setGroupIcon: (icon: string) => void;
}

export function useGroupOperations({
  currentUserId,
  socketRef,
  setGroups,
  setGroupMembers,
  setError,
  setDeleteError,
  setCreating,
  setDeleting,
  setSavingSettings,
  setRemovingMember,
  setUploadingIcon,
  setCustomIconUrl,
  setGroupIcon
}: UseGroupOperationsProps) {

  // Create group
  const handleCreateGroup = useCallback(async (
    groupName: string,
    groupIconValue: string,
    customIconUrl: string,
    selectedMemberIds: Set<string>,
    setSelectedGroup: (group: Group) => void,
    setCreateOpen: (open: boolean) => void
  ) => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    if (!groupIconValue && !customIconUrl) {
      setError('Please select an icon or upload a custom one');
      return;
    }

    try {
      setCreating(true);
      setError('');
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: groupName,
          icon: customIconUrl || groupIconValue,
          memberIds: Array.from(selectedMemberIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to create group');
        return;
      }

      const newGroup: Group = data.group;
      setGroups((prev) => [newGroup, ...prev]);
      setSelectedGroup(newGroup);
      setCreateOpen(false);
    } catch (err) {
      console.error(err);
      setError('Unable to create group');
    } finally {
      setCreating(false);
    }
  }, [setError, setCreating, setGroups]);

  // Delete group
  const handleDeleteGroup = useCallback(async (
    selectedGroup: Group,
    groups: Group[],
    setSelectedGroup: (group: Group | null) => void,
    setDeleteOpen: (open: boolean) => void
  ) => {
    if (!selectedGroup) return;

    try {
      setDeleting(true);
      setDeleteError('');
      const res = await fetch(`/api/groups/${selectedGroup._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Unable to delete group');
        return;
      }

      setGroups((prev) => prev.filter((g) => g._id !== selectedGroup._id));
      const remaining = groups.filter((g) => g._id !== selectedGroup._id);
      setSelectedGroup(remaining[0] ?? null);
      setDeleteOpen(false);
    } catch (err) {
      console.error(err);
      setDeleteError('Unable to delete group');
    } finally {
      setDeleting(false);
    }
  }, [setDeleting, setDeleteError, setGroups]);

  // Save group settings
  const handleSaveSettings = useCallback(async (
    selectedGroup: Group,
    settingsName: string,
    settingsIcon: string,
    settingsAllowEdit: boolean,
    settingsAllowInvite: boolean,
    settingsAddMemberIds: Set<string>,
    setSelectedGroup: (group: Group) => void,
    setSettingsOpen: (open: boolean) => void
  ) => {
    if (!selectedGroup) return;

    if (!settingsName.trim()) {
      setError('Please enter a group name');
      return;
    }

    try {
      setSavingSettings(true);
      setError('');
      const res = await fetch(`/api/groups/${selectedGroup._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: settingsName,
          icon: settingsIcon,
          allowMemberEdit: settingsAllowEdit,
          allowMemberInvite: settingsAllowInvite,
          addMemberIds: Array.from(settingsAddMemberIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to update group');
        return;
      }

      const updated: Group = data.group;
      setGroups((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      setSelectedGroup(updated);
      setSettingsOpen(false);
    } catch (err) {
      console.error(err);
      setError('Unable to update group');
    } finally {
      setSavingSettings(false);
    }
  }, [setError, setSavingSettings, setGroups]);

  // Remove member
  const handleRemoveMember = useCallback(async (
    selectedGroup: Group,
    memberToRemove: { id: string; name: string; username: string; avatarUrl?: string },
    setRemoveMemberOpen: (open: boolean) => void,
    setMemberToRemove: (member: null) => void
  ) => {
    if (!selectedGroup || !currentUserId || !memberToRemove) return;

    try {
      setRemovingMember(true);
      setError('');
      const res = await fetch(
        `/api/groups/members?groupId=${selectedGroup._id}&memberId=${memberToRemove.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to remove member');
        return;
      }

      // Remove member from local state
      setGroupMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      
      // Update groups list to reflect member removal
      setGroups((prev) =>
        prev.map((g) =>
          g._id === selectedGroup._id
            ? { ...g, memberIds: g.memberIds?.filter((id) => id !== memberToRemove.id) ?? [] }
            : g
        )
      );

      // Emit socket notification to the removed member
      if (socketRef.current && data.socketPayload) {
        console.log('[group-operations] Emitting group:member:removed:notify', data.socketPayload);
        socketRef.current.emit('group:member:removed:notify', data.socketPayload);
      }

      setRemoveMemberOpen(false);
      setMemberToRemove(null);
    } catch (err) {
      console.error(err);
      setError('Unable to remove member');
    } finally {
      setRemovingMember(false);
    }
  }, [currentUserId, socketRef, setError, setRemovingMember, setGroupMembers, setGroups]);

  // Add members success handler
  const handleAddMembersSuccess = useCallback(async (
    selectedGroup: Group,
    setSelectedGroup: (group: Group) => void
  ) => {
    if (!selectedGroup) return;
    
    // Reload members
    try {
      const membersRes = await fetch(`/api/groups/members?groupId=${selectedGroup._id}`, {
        credentials: 'include',
      });
      const membersData = await membersRes.json();
      if (membersRes.ok) {
        setGroupMembers(
          (membersData.members ?? []).map((m: any) => ({
            id: m.userId,
            name: m.name,
            username: m.username,
            avatarUrl: m.avatarUrl,
          })),
        );
      }

      // Reload groups to get updated member count
      const groupsRes = await fetch('/api/groups', { credentials: 'include' });
      const groupsData = await groupsRes.json();
      if (groupsRes.ok) {
        setGroups(groupsData.groups ?? []);
        const updatedGroup = groupsData.groups?.find((g: Group) => g._id === selectedGroup._id);
        if (updatedGroup) {
          setSelectedGroup(updatedGroup);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [setGroupMembers, setGroups]);

  // Icon upload handler
  const handleIconUpload = useCallback((file: File) => {
    uploadIcon(file, setUploadingIcon, setError, setCustomIconUrl, setGroupIcon);
  }, [setUploadingIcon, setError, setCustomIconUrl, setGroupIcon]);

  return {
    handleCreateGroup,
    handleDeleteGroup,
    handleSaveSettings,
    handleRemoveMember,
    handleAddMembersSuccess,
    handleIconUpload
  };
}