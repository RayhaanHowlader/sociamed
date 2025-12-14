'use client';

import { Socket } from 'socket.io-client';

export interface Group {
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

export interface Friend {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface GroupMessage {
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
  type?: 'text' | 'poll' | 'file';
  pollId?: string;
  poll?: {
    _id: string;
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes: number;
      voters: string[];
    }>;
    allowMultiple: boolean;
    anonymous: boolean;
    createdBy: string;
    createdAt: string;
    expiresAt: string;
    totalVotes: number;
    author: {
      name: string;
      username: string;
      avatarUrl: string;
    };
  };
}

export interface FileUploadCallbacks {
  setUploadingFile: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setUploadError: (error: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>;
  setFilePreview: (preview: { url: string; type: 'image' | 'video' | 'audio'; file: File } | null) => void;
}

export interface MessageOperationCallbacks {
  setMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>;
  setPinnedMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>;
  setError: (error: string) => void;
}

// Utility function to check if a string is a valid ObjectId
export const isObjectId = (val: string): boolean => /^[a-f\d]{24}$/i.test(val);

// File upload utility
export const uploadFile = async (
  file: File,
  selectedGroup: Group,
  currentUserId: string,
  socketRef: React.RefObject<Socket | null>,
  callbacks: FileUploadCallbacks
): Promise<void> => {
  const { setUploadingFile, setUploadProgress, setUploadError, setMessages, setFilePreview } = callbacks;
  
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

  } catch (err) {
    console.error('Upload error:', err);
    const errorMessage = err instanceof Error ? err.message : 'File upload failed. Please try again.';
    setUploadError(errorMessage);
    // Don't clear preview on error so user can retry
  } finally {
    setUploadingFile(false);
  }
};

// Voice message upload utility
export const uploadVoiceMessage = async (
  audioBlob: Blob,
  duration: number,
  selectedGroup: Group,
  currentUserId: string,
  socketRef: React.RefObject<Socket | null>,
  setMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>
): Promise<void> => {
  if (!selectedGroup || !currentUserId || !socketRef.current) return;

  try {
    // Upload audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice-message.webm');

    const uploadRes = await fetch('/api/chat/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(uploadData.error || 'Failed to upload voice message');
    }

    // Send voice message
    const tempId = `${Date.now()}`;
    const payload = {
      id: tempId,
      groupId: selectedGroup._id,
      fromUserId: currentUserId,
      content: `🎤 Voice message (${Math.round(duration)}s)`,
      fileUrl: uploadData.url,
      fileName: uploadData.fileName || 'voice-message.webm',
      mimeType: 'audio/webm',
      isImage: false,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, payload]);
    socketRef.current.emit('group:message', payload);

    // Save to database
    fetch('/api/groups/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        groupId: selectedGroup._id,
        content: payload.content,
        fileUrl: uploadData.url,
        fileName: uploadData.fileName,
        mimeType: 'audio/webm',
        isImage: false,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.message?.id) return;
        const newId = String(data.message.id);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: newId } : m)));
      })
      .catch((err) => console.error('Failed to save group voice message', err));

  } catch (err) {
    console.error('Group voice message error:', err);
  }
};

// Icon upload utility
export const uploadIcon = async (
  file: File,
  setUploadingIcon: (uploading: boolean) => void,
  setError: (error: string) => void,
  setCustomIconUrl: (url: string) => void,
  setGroupIcon: (icon: string) => void
): Promise<void> => {
  if (!file.type.startsWith('image/')) {
    setError('Please select an image file');
    return;
  }

  try {
    setUploadingIcon(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/chat/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload icon');
    }

    setCustomIconUrl(data.url);
    setGroupIcon(''); // Clear emoji selection when custom icon is uploaded
  } catch (err) {
    console.error('Icon upload error:', err);
    setError(err instanceof Error ? err.message : 'Failed to upload icon');
  } finally {
    setUploadingIcon(false);
  }
};

// Pin/unpin message utility
export const togglePinMessage = async (
  messageId: string,
  shouldPin: boolean,
  selectedGroup: Group,
  currentUserId: string | null,
  isCurrentUserAdmin: boolean,
  messages: GroupMessage[],
  socketRef: React.RefObject<Socket | null>,
  callbacks: MessageOperationCallbacks
): Promise<void> => {
  const { setMessages, setPinnedMessages } = callbacks;
  
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

// Delete messages utility
export const deleteMessages = async (
  messageIds: string[],
  selectedGroup: Group,
  currentUserId: string,
  socketRef: React.RefObject<Socket | null>,
  callbacks: MessageOperationCallbacks
): Promise<void> => {
  const { setMessages, setError } = callbacks;
  
  if (!selectedGroup || !currentUserId) return;
  const ids = messageIds.filter(isObjectId);
  if (ids.length === 0) return;

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
  } catch (err) {
    console.error(err);
    setError('Failed to delete messages');
  }
};

// Send text message utility
export const sendTextMessage = async (
  content: string,
  selectedGroup: Group,
  currentUserId: string,
  socketRef: React.RefObject<Socket | null>,
  setMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>,
  messagesEndRef: React.RefObject<HTMLDivElement | null>
): Promise<void> => {
  if (!selectedGroup || !currentUserId || !socketRef.current) return;
  if (!content.trim()) return;

  const tempId = `${Date.now()}`;
  const payload: GroupMessage = {
    id: tempId,
    groupId: selectedGroup._id,
    fromUserId: currentUserId,
    content: content.trim(),
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
};

// Vote on poll utility
export const voteOnPoll = async (
  pollId: string,
  optionIds: string[],
  setMessages: React.Dispatch<React.SetStateAction<GroupMessage[]>>,
  socketRef?: React.RefObject<Socket | null>,
  currentUserId?: string,
  groupId?: string
): Promise<void> => {
  try {
    console.log('Sending vote request:', { pollId, optionIds });
    const response = await fetch('/api/groups/polls/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pollId, optionIds })
    });

    const data = await response.json();
    console.log('Vote response:', data);
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to vote');
    }

    // Update the poll in messages
    setMessages(prev => {
      const updated = prev.map(msg => {
        if (msg.type === 'poll' && msg.pollId === pollId && msg.poll) {
          console.log('Updating poll in message:', msg.id, 'with new data:', data.poll);
          return {
            ...msg,
            poll: data.poll
          };
        }
        return msg;
      });
      console.log('Messages updated');
      return updated;
    });

    // Emit socket event to notify other group members
    if (socketRef?.current && currentUserId && groupId) {
      socketRef.current.emit('group:poll:vote', {
        groupId,
        pollId,
        optionIds,
        voterId: currentUserId
      });
    }
  } catch (error) {
    console.error('Failed to vote on poll:', error);
    throw error;
  }
};