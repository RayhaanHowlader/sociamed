'use client';

import { useState } from 'react';

export function useGroupModals() {
  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [removeMemberOpen, setRemoveMemberOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [searchMediaOpen, setSearchMediaOpen] = useState(false);
  const [createPollOpen, setCreatePollOpen] = useState(false);

  // UI states
  const [showMembers, setShowMembers] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(true);

  // Form states
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('🎨');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [settingsName, setSettingsName] = useState('');
  const [settingsIcon, setSettingsIcon] = useState('👥');
  const [settingsAllowEdit, setSettingsAllowEdit] = useState(false);
  const [settingsAllowInvite, setSettingsAllowInvite] = useState(false);
  const [settingsAddMemberIds, setSettingsAddMemberIds] = useState<Set<string>>(new Set());

  // Loading states
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [removingMember, setRemovingMember] = useState(false);

  // Error states
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // File upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [filePreview, setFilePreview] = useState<{ url: string; type: 'image' | 'video' | 'audio'; file: File } | null>(null);

  // Image viewer state
  const [imageViewerData, setImageViewerData] = useState<{
    url: string;
    senderName?: string;
    senderAvatar?: string;
    senderUsername?: string;
    timestamp?: string;
    caption?: string;
    fileName?: string;
  } | null>(null);

  // Member to remove state
  const [memberToRemove, setMemberToRemove] = useState<{ 
    id: string; 
    name: string; 
    username: string; 
    avatarUrl?: string 
  } | null>(null);

  // Clear selection function
  const clearSelection = () => {
    setSelectedMessageIds(new Set());
    setSelectMode(false);
  };

  return {
    // Modal states
    createOpen,
    setCreateOpen,
    deleteOpen,
    setDeleteOpen,
    settingsOpen,
    setSettingsOpen,
    addMemberOpen,
    setAddMemberOpen,
    removeMemberOpen,
    setRemoveMemberOpen,
    imageViewerOpen,
    setImageViewerOpen,
    searchMediaOpen,
    setSearchMediaOpen,
    createPollOpen,
    setCreatePollOpen,

    // UI states
    showMembers,
    setShowMembers,
    selectMode,
    setSelectMode,
    showPinnedMessages,
    setShowPinnedMessages,

    // Form states
    selectedMemberIds,
    setSelectedMemberIds,
    selectedMessageIds,
    setSelectedMessageIds,
    groupName,
    setGroupName,
    groupIcon,
    setGroupIcon,
    customIconUrl,
    setCustomIconUrl,
    settingsName,
    setSettingsName,
    settingsIcon,
    setSettingsIcon,
    settingsAllowEdit,
    setSettingsAllowEdit,
    settingsAllowInvite,
    setSettingsAllowInvite,
    settingsAddMemberIds,
    setSettingsAddMemberIds,

    // Loading states
    uploadingIcon,
    setUploadingIcon,
    creating,
    setCreating,
    deleting,
    setDeleting,
    savingSettings,
    setSavingSettings,
    removingMember,
    setRemovingMember,

    // Error states
    error,
    setError,
    deleteError,
    setDeleteError,

    // File upload states
    uploadingFile,
    setUploadingFile,
    uploadProgress,
    setUploadProgress,
    uploadError,
    setUploadError,
    filePreview,
    setFilePreview,

    // Other states
    imageViewerData,
    setImageViewerData,
    memberToRemove,
    setMemberToRemove,

    // Functions
    clearSelection
  };
}