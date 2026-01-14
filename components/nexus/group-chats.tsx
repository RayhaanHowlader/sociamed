'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

import { ImageViewerModal } from './image-viewer-modal';
import { AddMembersModal } from './add-members-modal';
import { RemoveMemberModal } from './remove-member-modal';
import { GroupSearchMedia } from './group-search-media';
import { GroupsList } from './groups-list';
import { GroupMembersSidebar } from './group-members-sidebar';
import { GroupMessageInput } from './group-message-input';
import { GroupSettingsModal } from './group-settings-modal';
import { CreateGroupModal } from './create-group-modal';
import { DeleteGroupModal } from './delete-group-modal';
import { GroupChatHeader } from './group-chat-header';
import { GroupMessagesArea } from './group-messages-area';
import { 
  Group, 
  GroupMessage, 
  isObjectId,
  uploadFile,
  uploadVoiceMessage,
  togglePinMessage,
  deleteMessages,
  sendTextMessage,
  voteOnPoll
} from './group-chat-utils';
import { useGroupData } from './use-group-data';
import { useGroupSocket } from './use-group-socket';
import { useGroupMessages } from './use-group-messages';
import { useGroupModals } from './use-group-modals';
import { useGroupOperations } from './use-group-operations';
import { CreatePollModal } from './create-poll-modal';



export function GroupChats() {
  // Core state
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Custom hooks for data management
  const {
    groups,
    friends,
    groupMembers,
    currentUserId,
    loadingGroups,
    loadingFriends,
    loadingMembers,
    loadingMoreGroups,
    searchingGroups,
    groupsPage,
    hasMoreGroups,
    loadGroups,
    loadGroupMembers,
    setGroups,
    setGroupsPage,
    setHasMoreGroups
  } = useGroupData();

  // Custom hooks for modal and UI state
  const {
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
    showMembers,
    setShowMembers,
    selectMode,
    setSelectMode,
    showPinnedMessages,
    setShowPinnedMessages,
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
    settingsAllowEdit,
    setSettingsAllowEdit,
    settingsAllowInvite,
    setSettingsAllowInvite,
    settingsAddMemberIds,
    setSettingsAddMemberIds,
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
    error,
    setError,
    deleteError,
    setDeleteError,
    uploadingFile,
    setUploadingFile,
    uploadProgress,
    setUploadProgress,
    uploadError,
    setUploadError,
    filePreview,
    setFilePreview,
    imageViewerData,
    setImageViewerData,
    memberToRemove,
    setMemberToRemove,
    clearSelection
  } = useGroupModals();

  // Load pinned messages for the selected group
  const loadPinnedMessages = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/groups/pinned?groupId=${selectedGroup._id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setPinnedMessages(data.messages ?? []);
      }
    } catch (err) {
      console.error('Failed to load pinned messages:', err);
    }
  }, [selectedGroup]);

  // Initialize message state
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessage[]>([]);

  // Custom hooks for socket management
  const { socketRef, socketReady } = useGroupSocket({
    currentUserId,
    groups,
    setMessages,
    setPinnedMessages,
    messagesEndRef,
    groupMembers,
    refreshCurrentGroup: async () => {
      if (!selectedGroup) return;
      try {
        const res = await fetch(`/api/groups/history?groupId=${selectedGroup._id}&limit=20`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(data.error || 'Unable to refresh group history');
          return;
        }
        setMessages(data.messages ?? []);
      } catch (err) {
        console.error(err);
      }
    }
  });

  // Custom hooks for messages
  const {
    hasMoreMessages,
    loadingMore,
    loadMoreMessages,
    refreshCurrentGroup
  } = useGroupMessages({ selectedGroup, socketReady, loadPinnedMessages, setMessages, setPinnedMessages });

  // Custom hooks for group operations
  const {
    handleCreateGroup,
    handleDeleteGroup,
    handleSaveSettings,
    handleRemoveMember,
    handleAddMembersSuccess,
    handleIconUpload
  } = useGroupOperations({
    currentUserId,
    socketRef,
    setGroups,
    setGroupMembers: () => {}, // This will be handled by loadGroupMembers
    setError,
    setDeleteError,
    setCreating,
    setDeleting,
    setSavingSettings,
    setRemovingMember,
    setUploadingIcon,
    setCustomIconUrl,
    setGroupIcon
  });

  // Pin or unpin a message - using utility function
  const handleTogglePinMessage = (messageId: string, shouldPin: boolean) => {
    togglePinMessage(
      messageId, 
      shouldPin, 
      selectedGroup!, 
      currentUserId, 
      isCurrentUserAdmin, 
      messages, 
      socketRef, 
      { setMessages, setPinnedMessages, setError }
    );
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  const handleVoiceTextReceived = (text: string) => {
    setMessage(text);
  };

  const handleVoiceMessageSent = (audioBlob: Blob, duration: number) => {
    if (!selectedGroup || !currentUserId) return;
    uploadVoiceMessage(audioBlob, duration, selectedGroup, currentUserId, socketRef, setMessages);
  };

  const handleCreatePoll = () => {
    setCreatePollOpen(true);
  };

  const handlePollCreated = () => {
    // Refresh messages to show the new poll
    refreshCurrentGroup();
  };

  const handlePollVote = async (pollId: string, optionIds: string[]) => {
    try {
      await voteOnPoll(pollId, optionIds, setMessages, socketRef, currentUserId || undefined, selectedGroup?._id);
    } catch (error) {
      console.error('Failed to vote on poll:', error);
    }
  };





  // Remove client-side filtering since we're doing it on the backend

  const isCurrentUserAdmin = Boolean(selectedGroup && currentUserId && selectedGroup.ownerId === currentUserId);

  const canEditGroupMeta = Boolean(
    selectedGroup &&
    currentUserId &&
    (selectedGroup.ownerId === currentUserId ||
      (selectedGroup.allowMemberEdit && selectedGroup.memberIds.includes(currentUserId)))
  );

  const canInviteMembers = Boolean(
    selectedGroup &&
    currentUserId &&
    (selectedGroup.ownerId === currentUserId ||
      (selectedGroup.allowMemberInvite && selectedGroup.memberIds.includes(currentUserId)))
  );

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load groups when debounced search changes
  useEffect(() => {
    setGroupsPage(1);
    setHasMoreGroups(true);
    loadGroups(1, debouncedSearch, false);
  }, [debouncedSearch, loadGroups, setGroupsPage, setHasMoreGroups]);

















  // Load group members when selected group changes
  useEffect(() => {
    loadGroupMembers(selectedGroup);
  }, [selectedGroup, loadGroupMembers]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openCreateDialog = () => {
    setGroupName('');
    setGroupIcon('🎨');
    setCustomIconUrl('');
    setSelectedMemberIds(new Set());
    setError('');
    setCreateOpen(true);
  };

  const handleCreateGroupWrapper = () => {
    handleCreateGroup(groupName, groupIcon, customIconUrl, selectedMemberIds, setSelectedGroup, setCreateOpen);
  };

  const openRemoveMemberModal = (member: { id: string; name: string; username: string; avatarUrl?: string }) => {
    setMemberToRemove(member);
    setRemoveMemberOpen(true);
  };

  const handleRemoveMemberWrapper = () => {
    if (!selectedGroup || !memberToRemove) return;
    handleRemoveMember(selectedGroup, memberToRemove, setRemoveMemberOpen, setMemberToRemove);
  };

  const handleAddMembersSuccessWrapper = () => {
    if (!selectedGroup) return;
    handleAddMembersSuccess(selectedGroup, setSelectedGroup);
  };

  const handleDeleteGroupWrapper = () => {
    if (!selectedGroup) return;
    handleDeleteGroup(selectedGroup, groups, setSelectedGroup, setDeleteOpen);
  };

  const openSettings = () => {
    if (!selectedGroup) return;
    setSettingsName(selectedGroup.name);
    setSettingsAllowEdit(!!selectedGroup.allowMemberEdit);
    setSettingsAllowInvite(!!selectedGroup.allowMemberInvite);
    setSettingsAddMemberIds(new Set());
    setDeleteError('');
    setSettingsOpen(true);
  };

  const toggleSettingsMember = (id: string) => {
    setSettingsAddMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSaveSettingsWrapper = () => {
    if (!selectedGroup) return;
    handleSaveSettings(selectedGroup, settingsName, settingsAllowEdit, settingsAllowInvite, settingsAddMemberIds, setSelectedGroup, setSettingsOpen);
  };

  const handleSendMessage = async () => {
    if (!selectedGroup || !currentUserId) return;
    await sendTextMessage(message, selectedGroup, currentUserId, socketRef, setMessages, messagesEndRef);
    setMessage('');
  };



  const toggleMessageSelection = (id: string, isMine: boolean) => {
    if (!isMine && !(selectedGroup?.ownerId === currentUserId)) return;
    if (!isObjectId(id)) return;
    setSelectMode(true);
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };



  const deleteSelectedMessages = async () => {
    if (!selectedGroup || !currentUserId) return;
    const ids = Array.from(selectedMessageIds);
    if (ids.length === 0) {
      await refreshCurrentGroup();
      return;
    }

    await deleteMessages(ids, selectedGroup, currentUserId, socketRef, { setMessages, setPinnedMessages, setError });
    await refreshCurrentGroup();
    clearSelection();
  };

  const handleFileChange = (file: File) => {
    if (!selectedGroup || !currentUserId) return;
    
    // Determine file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp|mpg|mpeg)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus)$/i.test(file.name);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (isImage) {
        setFilePreview({ url, type: 'image', file });
      } else if (isVideo) {
        setFilePreview({ url, type: 'video', file });
      } else if (isAudio) {
        setFilePreview({ url, type: 'audio', file });
      } else {
        // For other files, just upload directly
        handleUploadFile(file);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleUploadFile = (file: File) => {
    if (!selectedGroup || !currentUserId) return;
    uploadFile(file, selectedGroup, currentUserId, socketRef, {
      setUploadingFile,
      setUploadProgress,
      setUploadError,
      setMessages,
      setFilePreview
    });
  };

  const handleSendPreview = () => {
    if (filePreview) {
      handleUploadFile(filePreview.file);
    } else {
      handleSendMessage();
    }
  };

  const cancelPreview = () => {
    setFilePreview(null);
    setUploadProgress(0);

  };

  const handleGroupImageClick = useCallback(
    (payload: { url: string; message: GroupMessage }) => {
      const { message } = payload;
      const memberInfo = groupMembers.find((m) => m.id === message.fromUserId);
      const isMine = message.fromUserId === currentUserId;

      setImageViewerData({
        url: payload.url,
        senderName: isMine ? 'You' : memberInfo?.name,
        senderAvatar: memberInfo?.avatarUrl,
        senderUsername: memberInfo?.username,
        timestamp: message.createdAt,
        caption: message.content,
        fileName: message.fileName,
      });
      setImageViewerOpen(true);
    },
    [currentUserId, groupMembers],
  );

  return (
    <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-900">
      {/* Groups List - Hidden on mobile when group is selected */}
      <GroupsList
        groups={groups}
        selectedGroup={selectedGroup}
        onGroupSelect={setSelectedGroup}
        onCreateGroup={openCreateDialog}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loadingGroups={loadingGroups && groupsPage === 1}
        searchingGroups={searchingGroups}
        hasMoreGroups={hasMoreGroups}
        loadingMoreGroups={loadingMoreGroups}
        onLoadMore={() => loadGroups(groupsPage + 1, debouncedSearch, true)}
      />

      {/* Chat View - Hidden on mobile when no group selected */}
      <div className={cn(
        'flex-1 flex flex-col min-h-0',
        !selectedGroup && 'hidden md:flex'
      )}>
        {selectedGroup ? (
          <>
        <GroupChatHeader
          selectedGroup={selectedGroup}
          onBackClick={() => setSelectedGroup(null)}
          onAddMemberClick={() => setAddMemberOpen(true)}
          onToggleMembersClick={() => setShowMembers(!showMembers)}
          onSearchMediaClick={() => setSearchMediaOpen(true)}
          onSettingsClick={openSettings}
          onDeleteClick={() => setDeleteOpen(true)}
          onSelectModeToggle={() => (selectMode ? clearSelection() : setSelectMode(true))}
          onDeleteSelected={deleteSelectedMessages}
          canInviteMembers={canInviteMembers}
          selectMode={selectMode}
          selectedMessageIds={selectedMessageIds}
        />

        <div className="flex flex-1 overflow-hidden min-h-0">
          <GroupMessagesArea
            selectedGroup={selectedGroup}
            messages={messages}
            pinnedMessages={pinnedMessages}
            showPinnedMessages={showPinnedMessages}
            onTogglePinnedMessages={setShowPinnedMessages}
            hasMoreMessages={hasMoreMessages}
            loadingMore={loadingMore}
            onLoadMoreMessages={loadMoreMessages}
            groupMembers={groupMembers}
            currentUserId={currentUserId}
            isCurrentUserAdmin={isCurrentUserAdmin}
            selectMode={selectMode}
            selectedMessageIds={selectedMessageIds}
            onToggleMessageSelection={toggleMessageSelection}
            onImageClick={handleGroupImageClick}
            onPinToggle={handleTogglePinMessage}
            onPollVote={handlePollVote}
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
          />

          <GroupMembersSidebar
            show={showMembers}
            selectedGroup={selectedGroup}
            groupMembers={groupMembers}
            loadingMembers={loadingMembers}
            currentUserId={currentUserId}
            isCurrentUserAdmin={isCurrentUserAdmin}
            onRemoveMember={openRemoveMemberModal}
          />
        </div>

        <GroupMessageInput
          selectedGroup={selectedGroup}
          message={message}
          onMessageChange={setMessage}
          onSendMessage={handleSendMessage}
          onSendPreview={handleSendPreview}
          filePreview={filePreview}
          onFileChange={handleFileChange}
          onCancelPreview={cancelPreview}
          uploadProgress={uploadProgress}
          uploadingFile={uploadingFile}
          uploadError={uploadError}
          onClearUploadError={() => setUploadError('')}
          onEmojiSelect={handleEmojiSelect}
          onVoiceTextReceived={handleVoiceTextReceived}
          onVoiceMessageSent={handleVoiceMessageSent}
          onCreatePoll={handleCreatePoll}
        />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            {loadingGroups
              ? 'Loading groups...'
              : 'Select a group or create a new one to start chatting.'}
          </div>
        )}
      </div>

      <CreateGroupModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        groupName={groupName}
        onGroupNameChange={setGroupName}
        groupIcon={groupIcon}
        onGroupIconChange={setGroupIcon}
        customIconUrl={customIconUrl}
        onCustomIconUrlChange={setCustomIconUrl}
        uploadingIcon={uploadingIcon}
        onIconUpload={handleIconUpload}
        selectedMemberIds={selectedMemberIds}
        onToggleMember={toggleMember}
        friends={friends}
        loadingFriends={loadingFriends}
        error={error}
        creating={creating}
        onCreateGroup={handleCreateGroupWrapper}
      />
      <DeleteGroupModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        selectedGroup={selectedGroup}
        deleteError={deleteError}
        deleting={deleting}
        onDeleteGroup={handleDeleteGroupWrapper}
      />
      <GroupSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        selectedGroup={selectedGroup}
        settingsName={settingsName}
        onSettingsNameChange={setSettingsName}
        settingsAllowEdit={settingsAllowEdit}
        onSettingsAllowEditChange={(value) => setSettingsAllowEdit(value)}
        settingsAllowInvite={settingsAllowInvite}
        onSettingsAllowInviteChange={(value) => setSettingsAllowInvite(value)}
        settingsAddMemberIds={settingsAddMemberIds}
        onToggleSettingsMember={toggleSettingsMember}
        friends={friends}
        loadingFriends={loadingFriends}
        canEditGroupMeta={canEditGroupMeta}
        isCurrentUserAdmin={isCurrentUserAdmin}
        canInviteMembers={canInviteMembers}
        error={error}
        savingSettings={savingSettings}
        onSaveSettings={handleSaveSettingsWrapper}
      />
      {selectedGroup && (
        <>
          <ImageViewerModal
            open={imageViewerOpen}
            onOpenChange={(open) => {
              setImageViewerOpen(open);
              if (!open) {
                setImageViewerData(null);
              }
            }}
            image={imageViewerData}
          />
          <AddMembersModal
            open={addMemberOpen}
            onOpenChange={setAddMemberOpen}
            groupId={selectedGroup._id}
            groupName={selectedGroup.name}
            groupIcon={selectedGroup.icon}
            existingMemberIds={selectedGroup.memberIds ?? []}
            onSuccess={handleAddMembersSuccessWrapper}
          />
          <RemoveMemberModal
            open={removeMemberOpen}
            onOpenChange={setRemoveMemberOpen}
            member={memberToRemove}
            groupName={selectedGroup.name}
            groupIcon={selectedGroup.icon}
            onConfirm={handleRemoveMemberWrapper}
            removing={removingMember}
          />
          <GroupSearchMedia
            open={searchMediaOpen}
            onOpenChange={setSearchMediaOpen}
            groupId={selectedGroup._id}
            currentUserId={currentUserId || ''}
            groupName={selectedGroup.name}
            groupMembers={groupMembers}
            onImageClick={(url) => {
              setImageViewerData({
                url,
                senderName: 'Group Member',
                timestamp: new Date().toISOString(),
              });
              setImageViewerOpen(true);
            }}
          />
          <CreatePollModal
            open={createPollOpen}
            onOpenChange={setCreatePollOpen}
            groupId={selectedGroup._id}
            onPollCreated={handlePollCreated}
          />
        </>
      )}
    </div>
  );
}