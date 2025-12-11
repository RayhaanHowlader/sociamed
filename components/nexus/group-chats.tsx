'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Send, UserPlus, Settings, Hash, Lock, Paperclip, Smile, Trash2, ArrowLeft, X, Users, Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { io, Socket } from 'socket.io-client';
import { GroupMessageBubble } from './group-message-bubble';
import { FilePreview } from './file-preview';
import { UploadProgress } from './upload-progress';
import { ImageViewerModal } from './image-viewer-modal';
import { AlertCircle } from 'lucide-react';
import { AddMembersModal } from './add-members-modal';
import { RemoveMemberModal } from './remove-member-modal';

interface Group {
  _id: string;
  name: string;
  icon: string;
  memberIds: string[];
  lastMessage?: string;
  lastActivityAt?: string;
  isPrivate?: boolean;
  ownerId?: string;
  allowMemberEdit?: boolean;
  allowMemberInvite?: boolean;
}

interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface GroupMessage {
  id: string;
  groupId: string;
  fromUserId: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  filePublicId?: string;
  isImage?: boolean;
  createdAt: string;
  deleted?: boolean;
  deletedBy?: string;
  pinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
}

const MOCK_GROUP_MESSAGES = [
  {
    id: 1,
    sender: 'Sarah Johnson',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'Hey team! Just uploaded the new design files.',
    time: '10:30 AM',
    isMine: false,
  },
  {
    id: 2,
    sender: 'Michael Chen',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'Great work! They look amazing.',
    time: '10:32 AM',
    isMine: false,
  },
  {
    id: 3,
    sender: 'You',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'Thanks! I\'ll present them in today\'s meeting.',
    time: '10:35 AM',
    isMine: true,
  },
  {
    id: 4,
    sender: 'Emma Wilson',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'Can\'t wait to see them! What time is the meeting?',
    time: '10:38 AM',
    isMine: false,
  },
  {
    id: 5,
    sender: 'You',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'It\'s at 2 PM in the main conference room.',
    time: '10:40 AM',
    isMine: true,
  },
];

export function GroupChats() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('🎨');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [groupMembers, setGroupMembers] = useState<Friend[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsAllowEdit, setSettingsAllowEdit] = useState(false);
  const [settingsAllowInvite, setSettingsAllowInvite] = useState(false);
  const [settingsAddMemberIds, setSettingsAddMemberIds] = useState<Set<string>>(new Set());
  const [savingSettings, setSavingSettings] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [removeMemberOpen, setRemoveMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string; username: string; avatarUrl?: string } | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filePreview, setFilePreview] = useState<{ url: string; type: 'image' | 'video' | 'audio'; file: File } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerData, setImageViewerData] = useState<{
    url: string;
    senderName?: string;
    senderAvatar?: string;
    senderUsername?: string;
    timestamp?: string;
    caption?: string;
    fileName?: string;
  } | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessage[]>([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(true);

  const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

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

  // Pin or unpin a message
  const togglePinMessage = async (messageId: string, shouldPin: boolean) => {
    if (!selectedGroup || !isCurrentUserAdmin) return;
    
    // Check if this is a temporary ID (not a valid ObjectId)
    const isValidObjectId = /^[a-f\d]{24}$/i.test(messageId);
    if (!isValidObjectId) {
      console.warn('Cannot pin message with temporary ID:', messageId);
      return;
    }
    
    try {
      const res = await fetch('/api/groups/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: selectedGroup._id,
          messageId,
          pin: shouldPin
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Failed to pin/unpin message');
        return;
      }
      
      // Update the message in the main messages list (optimistic update)
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, pinned: shouldPin, pinnedBy: shouldPin ? (currentUserId || undefined) : undefined, pinnedAt: shouldPin ? new Date().toISOString() : undefined }
          : m
      ));
      
      // Update pinned messages list (optimistic update)
      if (shouldPin) {
        const messageToPin = messages.find(m => m.id === messageId);
        if (messageToPin) {
          const pinnedMessage = { ...messageToPin, pinned: true, pinnedBy: currentUserId || undefined, pinnedAt: new Date().toISOString() };
          setPinnedMessages(prev => {
            // Check if message is already pinned to avoid duplicates
            if (prev.some(p => p.id === messageId)) return prev;
            return [...prev, pinnedMessage];
          });
        }
      } else {
        setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
      }
      
      // Emit socket event to notify other group members
      if (socketRef.current) {
        socketRef.current.emit('group:pin', {
          groupId: selectedGroup._id,
          messageId,
          pin: shouldPin,
          pinnedBy: currentUserId
        });
      }
      
    } catch (err) {
      console.error('Failed to pin/unpin message:', err);
    }
  };

  const ICON_OPTIONS = ['🎨', '🚀', '⚡', '☕', '💬', '📚', '🎮', '🎧'];

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isCurrentUserAdmin = selectedGroup && currentUserId
    ? selectedGroup.ownerId === currentUserId
    : false;

  const canEditGroupMeta =
    !!selectedGroup &&
    !!currentUserId &&
    (selectedGroup.ownerId === currentUserId ||
      (selectedGroup.allowMemberEdit && selectedGroup.memberIds.includes(currentUserId)));

  const canInviteMembers =
    !!selectedGroup &&
    !!currentUserId &&
    (selectedGroup.ownerId === currentUserId ||
      (selectedGroup.allowMemberInvite && selectedGroup.memberIds.includes(currentUserId)));

  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const res = await fetch('/api/groups', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) {
          console.error(data.error || 'Unable to load groups');
          return;
        }
        setGroups(data.groups ?? []);
        if (!selectedGroup && data.groups && data.groups.length > 0) {
          setSelectedGroup(data.groups[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingGroups(false);
      }
    };

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

    void loadGroups();
    void loadFriends();
  }, []);

  // Load current user and connect socket
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
    if (!currentUserId) return;
 
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||'https://sociamed.onrender.com';
    const socket = io(socketUrl);
    socketRef.current = socket;
    setSocketReady(true);
    console.log('[socket] connect', socketUrl);

    socket.on('group:message', (payload: GroupMessage) => {
      // Ignore messages already added locally
      if (payload.fromUserId === currentUserId) return;
      console.log('[socket] group:message received', payload.id);
      setMessages((prev) => [...prev, payload]);
      
      // Scroll to bottom when receiving a new message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    socket.on('group:message:id', ({ tempId, newId, filePublicId }: { tempId: string; newId: string; filePublicId?: string }) => {
      console.log('[socket] group:message:id received', { tempId, newId });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, id: newId, filePublicId: filePublicId ?? m.filePublicId } : m,
        ),
      );
    });

    socket.on('group:delete', ({ messageIds, by }: { messageIds: string[]; by?: string }) => {
      if (!Array.isArray(messageIds) || messageIds.length === 0) return;
      console.log('[socket] group:delete received', messageIds);
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m.id)
            ? { ...m, deleted: true, deletedBy: by ?? m.deletedBy, content: '', fileUrl: '', fileName: '', mimeType: '', isImage: false }
            : m,
        ),
      );
      refreshCurrentGroup();
    });

    socket.on('group:pin', ({ messageId, pin, pinnedBy }: { messageId: string; pin: boolean; pinnedBy: string | null }) => {
      console.log('[socket] group:pin received', { messageId, pin, pinnedBy });
      
      // Only update if this event is from another user (not the current user who initiated the pin)
      if (pinnedBy === currentUserId) {
        console.log('[socket] Ignoring own pin event to prevent duplicates');
        return;
      }
      
      // Update the message in the main messages list
      setMessages((prev) =>
        prev.map((m): GroupMessage =>
          m.id === messageId
            ? { ...m, pinned: pin, pinnedBy: pin ? (pinnedBy || undefined) : undefined, pinnedAt: pin ? new Date().toISOString() : undefined }
            : m,
        ),
      );
      
      // Update pinned messages list
      if (pin) {
        setMessages((prev) => {
          const messageToPin = prev.find(m => m.id === messageId);
          if (messageToPin) {
            const pinnedMessage: GroupMessage = { 
              ...messageToPin, 
              pinned: true, 
              pinnedBy: pinnedBy || undefined, 
              pinnedAt: new Date().toISOString() 
            };
            setPinnedMessages(prevPinned => {
              // Check if message is already pinned to avoid duplicates
              if (prevPinned.some(p => p.id === messageId)) return prevPinned;
              return [...prevPinned, pinnedMessage];
            });
          }
          return prev;
        });
      } else {
        setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
      }
    });

    return () => {
      console.log('[socket] disconnect');
      socket.disconnect();
      socketRef.current = null;
      setSocketReady(false);
    };
  }, [currentUserId]);

  // Join all group rooms (so delete/message events reach even if not currently open)
  useEffect(() => {
    if (!socketRef.current || !currentUserId) return;
    groups.forEach((g) => {
      if (g._id) {
        socketRef.current?.emit('group:join', { groupId: g._id });
        console.log('[socket] group:join (all)', g._id);
      }
    });
  }, [groups, currentUserId]);

  // Join group room and load initial history (latest 5) when socket is ready and selected group changes
  useEffect(() => {
    if (!selectedGroup || !socketReady) {
      setMessages([]);
      setHasMoreMessages(false);
      return;
    }

    socketRef.current?.emit('group:join', { groupId: selectedGroup._id });

    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/groups/history?groupId=${selectedGroup._id}&limit=5`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(data.error || 'Unable to load group history');
          return;
        }
        clearSelection();
        setMessages(data.messages ?? []);
        setHasMoreMessages(data.hasMore ?? false);
        
        // Scroll to bottom after loading initial messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (err) {
        console.error(err);
      }
    };

    void loadHistory();
    void loadPinnedMessages();
  }, [selectedGroup, socketReady]);

  // Load more messages when scrolling up
  const loadMoreMessages = useCallback(async () => {
    if (!selectedGroup || loadingMore || !hasMoreMessages) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    console.log('[group scroll] loadMoreMessages start', {
      groupId: selectedGroup._id,
      before: oldestMessage.createdAt,
    });
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/groups/history?groupId=${selectedGroup._id}&limit=5&before=${oldestMessage.createdAt}`,
        {
          credentials: 'include',
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load more messages');
        return;
      }

      // Prepend older messages to the beginning
      setMessages((prev) => [...(data.messages ?? []), ...prev]);
      setHasMoreMessages(data.hasMore ?? false);
      console.log('[group scroll] loadMoreMessages success', {
        received: data.messages?.length ?? 0,
        hasMore: data.hasMore,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedGroup, loadingMore, hasMoreMessages, messages]);

  // Handle scroll to detect when user scrolls to top
  useEffect(() => {
    if (!selectedGroup) return;

    // Find the scroll container inside ScrollArea
    const findScrollContainer = () => {
      const scrollArea = messagesContainerRef.current;
      if (!scrollArea) return null;
      // ScrollArea from shadcn/ui wraps content in a div with data-radix-scroll-area-viewport
      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      return viewport || scrollArea;
    };

    let container: HTMLElement | null = null;
    let cleanup: (() => void) | null = null;

    // Wait for DOM to be ready and messages to be rendered
    const setupScrollListener = () => {
      container = findScrollContainer();
      if (!container) {
        // Retry if container not found
        setTimeout(setupScrollListener, 200);
        return;
      }
      console.log('[group scroll] container ready');

      const handleScroll = () => {
        if (!container || !hasMoreMessages || loadingMore) return;
        
        // Check if scrolled near the top (within 150px for better UX)
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        // If user has scrolled up near the top
        if (scrollTop < 150 && hasMoreMessages && !loadingMore) {
          const previousScrollHeight = scrollHeight;
          console.log('[group scroll] near top -> loadMore', {
            scrollTop,
            hasMoreMessages,
            loadingMore,
          });
          loadMoreMessages().then(() => {
            // Maintain scroll position after loading more messages
            requestAnimationFrame(() => {
              if (container) {
                const newScrollHeight = container.scrollHeight;
                const scrollDiff = newScrollHeight - previousScrollHeight;
                container.scrollTop = scrollTop + scrollDiff;
              }
            });
          });
        }
      };

      container.addEventListener('scroll', handleScroll, { passive: true });
      cleanup = () => {
        if (container) {
          container.removeEventListener('scroll', handleScroll);
        }
      };
    };

    // Initial setup with delay to ensure DOM is ready
    const timeoutId = setTimeout(setupScrollListener, 300);

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) cleanup();
    };
  }, [hasMoreMessages, loadingMore, selectedGroup, messages.length, loadMoreMessages]);

  useEffect(() => {
    const loadMembers = async () => {
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
    };

    void loadMembers();
  }, [selectedGroup]);

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
    setSelectedMemberIds(new Set());
    setError('');
    setCreateOpen(true);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
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
          icon: groupIcon,
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
  };

  const openRemoveMemberModal = (member: { id: string; name: string; username: string; avatarUrl?: string }) => {
    setMemberToRemove(member);
    setRemoveMemberOpen(true);
  };

  const handleRemoveMember = async () => {
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

      // Emit socket notification
      if (socketRef.current && data.notification) {
        socketRef.current.emit('group:member:removed:notify', {
          userId: memberToRemove.id,
          groupId: selectedGroup._id,
          groupName: selectedGroup.name,
          removedBy: currentUserId,
          removedByProfile: data.notification.removedByProfile,
        });
      }

      setRemoveMemberOpen(false);
      setMemberToRemove(null);
    } catch (err) {
      console.error(err);
      setError('Unable to remove member');
    } finally {
      setRemovingMember(false);
    }
  };

  const handleAddMembersSuccess = async () => {
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
  };

  const handleDeleteGroup = async () => {
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

  const handleSaveSettings = async () => {
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
      if (selectedGroup && selectedGroup._id === updated._id) {
        setSelectedGroup(updated);
      }
      setSettingsOpen(false);
    } catch (err) {
      console.error(err);
      setError('Unable to update group');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedGroup || !currentUserId || !socketRef.current) return;
    if (!message.trim()) return;

    const tempId = `${Date.now()}`;
    const payload: GroupMessage = {
      id: tempId,
      groupId: selectedGroup._id,
      fromUserId: currentUserId,
      content: message.trim(),
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, payload]);
    socketRef.current.emit('group:message', payload);
    
    // Scroll to bottom when sending a message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Persist to DB
    fetch('/api/groups/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ groupId: selectedGroup._id, content: payload.content }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.message?.id) return;
        const newId = String(data.message.id);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: newId } : m)));
      })
      .catch((err) => console.error('Failed to save group message', err));

    setMessage('');
  };

  const refreshCurrentGroup = useCallback(async () => {
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
      setHasMoreMessages(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    }
  }, [selectedGroup]);

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

  const clearSelection = () => {
    setSelectedMessageIds(new Set());
    setSelectMode(false);
  };

  const deleteSelectedMessages = async () => {
    if (!selectedGroup || !currentUserId) return;
    const ids = Array.from(selectedMessageIds).filter(isObjectId);
    if (ids.length === 0) {
      await refreshCurrentGroup();
      return;
    }

    try {
      const res = await fetch('/api/groups/message', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupId: selectedGroup._id, messageIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete messages');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(m.id)
            ? { ...m, deleted: true, deletedBy: currentUserId, content: '', fileUrl: '', fileName: '', mimeType: '', isImage: false, filePublicId: '' }
            : m,
        ),
      );

      socketRef.current?.emit('group:delete', { groupId: selectedGroup._id, messageIds: ids, by: currentUserId });
      await refreshCurrentGroup();
      clearSelection();
    } catch (err) {
      console.error(err);
      setError('Failed to delete messages');
    }
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
        uploadFile(file);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File) => {
    if (!selectedGroup || !currentUserId) return;
    
    setUploadingFile(true);
    setUploadProgress(0);
    setUploadError('');
    
    try {
      const form = new FormData();
      form.append('file', file);
      
      const uploadPromise = new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
          } else {
            setUploadProgress(50); // Show indeterminate progress
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (err) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was cancelled'));
        });
        
        xhr.open('POST', '/api/chat/upload');
        xhr.withCredentials = true;
        xhr.send(form);
      });
      
      const data = await uploadPromise;
      
      // Ensure mimeType is set correctly
      const mimeType = data.mimeType || file.type || '';
      const isImage = data.isImage ?? mimeType.startsWith('image/');
      
      const tempId = `${Date.now()}`;
      const payload: GroupMessage = {
        id: tempId,
        groupId: selectedGroup._id,
        fromUserId: currentUserId,
        content: '',
        fileUrl: data.url,
        fileName: data.fileName || file.name,
        mimeType: mimeType,
        filePublicId: data.publicId,
        isImage: isImage,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, payload]);
      socketRef.current?.emit('group:message', payload);

      fetch('/api/groups/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: selectedGroup._id,
          content: '',
          fileUrl: data.url,
          fileName: data.fileName || file.name,
          mimeType: mimeType,
          isImage: isImage,
          filePublicId: data.publicId,
        }),
      })
        .then(async (res) => {
          const resp = await res.json().catch(() => null);
          if (!res.ok || !resp?.message?.id) return;
          const newId = String(resp.message.id);
          setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: newId } : m)));
          socketRef.current?.emit('group:message:id', { groupId: selectedGroup._id, tempId, newId, filePublicId: data.publicId });
        })
        .catch((err) => console.error('Failed to save group file message', err));

      // Clear preview and reset
      setFilePreview(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'File upload failed. Please try again.';
      setUploadError(errorMessage);
      // Don't clear preview on error so user can retry
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendPreview = () => {
    if (filePreview) {
      uploadFile(filePreview.file);
    } else {
      handleSendMessage();
    }
  };

  const cancelPreview = () => {
    setFilePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div className="h-full flex flex-col md:flex-row bg-white">
      {/* Groups List - Hidden on mobile when group is selected */}
      <div className={cn(
        'w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col max-h-[50vh] md:max-h-none',
        selectedGroup && 'hidden md:flex'
      )}>
        <div className="p-2 md:p-3 lg:p-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <h2 className="text-base md:text-lg lg:text-xl font-bold text-slate-900">Groups</h2>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-8 w-8 md:h-9 md:w-auto md:px-3"
              onClick={openCreateDialog}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3 md:w-4 md:h-4" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 md:pl-10 border-slate-200 text-sm h-8 md:h-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-1 md:p-2">
            {loadingGroups && (
              <p className="px-2 py-4 text-xs text-slate-500">Loading groups...</p>
            )}
            {!loadingGroups && filteredGroups.length === 0 && (
              <p className="px-2 py-4 text-xs text-slate-500">
                No groups yet. Create a new group to get started.
              </p>
            )}
            {filteredGroups.map((group) => (
              <button
                key={group._id}
                onClick={() => setSelectedGroup(group)}
                className={cn(
                  'w-full p-2 md:p-3 rounded-lg flex items-center gap-2 md:gap-3 hover:bg-slate-50 transition-colors',
                  selectedGroup && selectedGroup._id === group._id && 'bg-blue-50'
                )}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl md:text-2xl flex-shrink-0">
                  {group.icon}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                    <p className="font-semibold text-slate-900 text-xs md:text-sm truncate">{group.name}</p>
                    {group.isPrivate && <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mb-0.5 md:mb-1">
                    {group.memberIds?.length ?? 0} members
                  </p>
                  <p className="text-xs md:text-sm text-slate-600 truncate break-words">
                    {group.lastMessage || 'Start the conversation'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat View - Hidden on mobile when no group selected */}
      <div className={cn(
        'flex-1 flex flex-col min-h-0',
        !selectedGroup && 'hidden md:flex'
      )}>
        {selectedGroup ? (
          <>
        <div className="p-3 md:p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Back button - only visible on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-600 hover:text-slate-900"
              onClick={() => setSelectedGroup(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl">
                  {selectedGroup.icon || '💬'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{selectedGroup.name}</p>
                {selectedGroup.isPrivate && <Lock className="w-4 h-4 text-slate-400" />}
              </div>
                  <p className="text-sm text-slate-500">
                    {selectedGroup.memberIds?.length ?? 0} members
                  </p>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end sticky top-0 bg-white z-10 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 hover:text-blue-600"
              onClick={() => setAddMemberOpen(true)}
              disabled={!canInviteMembers}
              title={canInviteMembers ? "Add members" : "You don't have permission to add members"}
            >
              <UserPlus className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 hover:text-blue-600"
              onClick={() => setShowMembers(!showMembers)}
              title="View members"
            >
              <Users className="w-5 h-5" />
            </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-slate-900"
                  onClick={openSettings}
                >
              <Settings className="w-5 h-5" />
            </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
            <Button
              variant={selectMode ? 'secondary' : 'outline'}
              size="sm"
              disabled={!selectedGroup}
              onClick={() => (selectMode ? clearSelection() : setSelectMode(true))}
              className="min-w-[92px]"
            >
              {selectMode ? 'Cancel' : 'Select'}
            </Button>
            {selectedMessageIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedMessages}
                className="min-w-[110px]"
              >
                Delete ({selectedMessageIds.size})
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <ScrollArea 
            className="flex-1 p-3 md:p-6 bg-slate-50 h-[calc(100vh-220px)]"
            ref={messagesContainerRef}
          >
            <div className="space-y-3 md:space-y-4 max-w-3xl mx-auto">
              {/* Pinned Messages Section */}
              {pinnedMessages.length > 0 && showPinnedMessages && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Pin className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Pinned Messages ({pinnedMessages.length})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPinnedMessages(false)}
                      className="h-6 px-2 text-yellow-600 hover:text-yellow-800"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pinnedMessages.map((msg) => {
                      const member = groupMembers.find((m) => m.id === msg.fromUserId);
                      const displayName = member?.name || 'Unknown';
                      const avatarUrl = member?.avatarUrl;
                      const isMine = msg.fromUserId === currentUserId;

                      return (
                        <GroupMessageBubble
                          key={`pinned-${msg.id}`}
                          message={msg}
                          isMine={isMine}
                          displayName={displayName}
                          avatarUrl={avatarUrl}
                          selectable={false}
                          selected={false}
                          onSelectToggle={() => {}}
                          ownerId={selectedGroup?.ownerId}
                          currentUserId={currentUserId || undefined}
                          onImageClick={handleGroupImageClick}
                          onPinToggle={togglePinMessage}
                          isAdmin={isCurrentUserAdmin}
                          isPinnedView={true}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Show Pinned Messages Button (when hidden) */}
              {pinnedMessages.length > 0 && !showPinnedMessages && (
                <div className="flex justify-center mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPinnedMessages(true)}
                    className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                  >
                    <Pin className="w-3 h-3 mr-1" />
                    Show {pinnedMessages.length} Pinned Message{pinnedMessages.length > 1 ? 's' : ''}
                  </Button>
                </div>
              )}

              {/* Load more button or loading indicator */}
              {hasMoreMessages && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('[group scroll] load more button click');
                      loadMoreMessages();
                    }}
                    className="text-xs"
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load older messages'}
                  </Button>
                </div>
              )}
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="text-sm text-slate-500">Loading older messages...</div>
                </div>
              )}
              
              {messages.map((msg) => {
                const isMine = msg.fromUserId === currentUserId;
                const memberInfo =
                  msg.fromUserId && !isMine
                    ? groupMembers.find((m) => m.id === msg.fromUserId)
                    : undefined;
                const displayName = isMine
                  ? 'You'
                  : memberInfo?.name || 'Member';
                const avatarUrl = isMine ? undefined : memberInfo?.avatarUrl;
                const selectable = selectMode && !msg.deleted && (isMine || selectedGroup?.ownerId === currentUserId);

                return (
                  <GroupMessageBubble
                    key={msg.id}
                    message={msg}
                    isMine={isMine}
                    displayName={displayName}
                    avatarUrl={avatarUrl}
                    selectable={selectable}
                    selected={selectedMessageIds.has(msg.id)}
                    onSelectToggle={() => toggleMessageSelection(msg.id, isMine)}
                    ownerId={selectedGroup?.ownerId}
                    currentUserId={currentUserId || undefined}
                    onImageClick={handleGroupImageClick}
                    onPinToggle={togglePinMessage}
                    isAdmin={isCurrentUserAdmin}
                    isPinnedView={false}
                  />
                );
              })}
              
              {/* Scroll anchor for auto-scroll to bottom */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {showMembers && (
            <div className="w-72 border-l border-slate-200 bg-white">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Members</h3>
                    <p className="text-sm text-slate-500">
                      {selectedGroup.memberIds?.length ?? 0} total
                    </p>
              </div>
              <ScrollArea className="h-[calc(100%-80px)]">
                <div className="p-4 space-y-3">
                      {loadingMembers ? (
                        <p className="text-xs text-slate-500">Loading members…</p>
                      ) : groupMembers.length === 0 ? (
                        <p className="text-xs text-slate-500">No members found for this group.</p>
                      ) : (
                        groupMembers.map((member) => {
                          const isAdmin = selectedGroup.ownerId === member.id;
                          const isCurrentUser = currentUserId === member.id;
                          const canRemove = isCurrentUserAdmin && !isAdmin && !isCurrentUser;
                          return (
                    <div key={member.id} className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-900">
                                  {member.name}
                                </p>
                                <p className="text-xs text-slate-500">@{member.username}</p>
                      </div>
                              <div className="flex items-center gap-2">
                              <Badge
                                variant={isAdmin ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {isAdmin ? 'Admin' : 'Member'}
                        </Badge>
                                {canRemove && (
                                  <button
                                    onClick={() => openRemoveMemberModal(member)}
                                    className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Remove member"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                      </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
          )}
        </div>

        <div className="p-2 md:p-4 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="max-w-3xl mx-auto space-y-2 md:space-y-3">
            {/* File Preview */}
            {filePreview && (
              <FilePreview preview={filePreview} onCancel={cancelPreview} />
            )}

            {/* Upload Progress Bar */}
            <UploadProgress progress={uploadProgress} isUploading={uploadingFile} />

            {/* Error Message */}
            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="w-4 h-4" />
                {uploadError}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-auto p-1"
                  onClick={() => setUploadError('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-1 md:gap-2">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-blue-600 h-8 w-8 md:h-10 md:w-10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedGroup || uploadingFile}
                >
                  <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-600 hover:text-blue-600 h-8 w-8 md:h-10 md:w-10">
                <Smile className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Input
                placeholder={selectedGroup ? 'Type a message...' : 'Select a group to start chatting'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 border-slate-200 text-sm h-8 md:h-10"
                disabled={!selectedGroup || uploadingFile}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (filePreview) {
                      handleSendPreview();
                    } else {
                      handleSendMessage();
                    }
                  }
                }}
              />
              <Button
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-8 w-8 md:h-10 md:w-10 md:px-4"
                disabled={!selectedGroup || uploadingFile}
                onClick={() => {
                  if (filePreview) {
                    handleSendPreview();
                  } else {
                    handleSendMessage();
                  }
                }}
              >
                <Send className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>
          </div>
        </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
            {loadingGroups
              ? 'Loading groups...'
              : 'Select a group or create a new one to start chatting.'}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a group</DialogTitle>
            <DialogDescription>
              Name your group, choose an icon, and add members from your friends list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                Group name
              </label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Design Team"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Group icon</p>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setGroupIcon(icon)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl border border-transparent hover:border-blue-300',
                      groupIcon === icon && 'border-blue-500 bg-blue-50',
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Add members</p>
              {loadingFriends ? (
                <p className="text-xs text-slate-500">Loading friends…</p>
              ) : friends.length === 0 ? (
                <p className="text-xs text-slate-500">
                  You don&apos;t have any friends yet. Add friends to invite them to groups.
                </p>
              ) : (
                <ScrollArea className="h-40 border border-slate-200 rounded-md">
                  <div className="p-3 space-y-2">
                    {friends.map((friend) => (
                      <label
                        key={friend.id}
                        className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMemberIds.has(friend.id)}
                          onCheckedChange={() => toggleMember(friend.id)}
                        />
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={friend.avatarUrl} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{friend.name}</span>
                          <span className="text-xs text-slate-400">@{friend.username}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              onClick={handleCreateGroup}
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete group</DialogTitle>
            <DialogDescription>
              This will permanently delete the group and its conversations for all members. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{selectedGroup?.name}</span>?
            </p>
            {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteGroup}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Group settings</DialogTitle>
            <DialogDescription>Manage this group&apos;s name, permissions and members.</DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-400" />
                  Group name
                </label>
                <Input
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  disabled={!canEditGroupMeta}
                />
                {!canEditGroupMeta && (
                  <p className="text-[11px] text-slate-500">
                    Only the admin or when allowed by admin can change the group name.
                  </p>
                )}
              </div>

              {isCurrentUserAdmin && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Permissions</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={settingsAllowEdit}
                        onCheckedChange={(v) => setSettingsAllowEdit(Boolean(v))}
                      />
                      <span>Allow members to edit group name &amp; icon</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={settingsAllowInvite}
                        onCheckedChange={(v) => setSettingsAllowInvite(Boolean(v))}
                      />
                      <span>Allow members to add new members</span>
                    </label>
                  </div>
                </div>
              )}

              {(isCurrentUserAdmin || canInviteMembers) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Add members</p>
                  {loadingFriends ? (
                    <p className="text-xs text-slate-500">Loading friends…</p>
                  ) : friends.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      You don&apos;t have any friends yet to add to this group.
                    </p>
                  ) : (
                    <ScrollArea className="h-32 border border-slate-200 rounded-md">
                      <div className="p-3 space-y-2">
                        {friends.filter((friend) => !selectedGroup.memberIds.includes(friend.id))
                          .length === 0 ? (
                          <p className="text-xs text-slate-500">
                            All of your friends are already members of this group.
                          </p>
                        ) : (
                          friends
                            .filter((friend) => !selectedGroup.memberIds.includes(friend.id))
                            .map((friend) => (
                              <label
                                key={friend.id}
                                className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer"
                              >
                                <Checkbox
                                  checked={settingsAddMemberIds.has(friend.id)}
                                  onCheckedChange={() => toggleSettingsMember(friend.id)}
                                />
                                <Avatar className="w-7 h-7">
                                  <AvatarImage src={friend.avatarUrl} />
                                  <AvatarFallback>{friend.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium">{friend.name}</span>
                                  <span className="text-xs text-slate-400">@{friend.username}</span>
                                </div>
                              </label>
                            ))
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              onClick={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            onSuccess={handleAddMembersSuccess}
          />
          <RemoveMemberModal
            open={removeMemberOpen}
            onOpenChange={setRemoveMemberOpen}
            member={memberToRemove}
            groupName={selectedGroup.name}
            groupIcon={selectedGroup.icon}
            onConfirm={handleRemoveMember}
            removing={removingMember}
          />
        </>
      )}
    </div>
  );
}
