'use client';

import { useState, useRef } from 'react';

interface MediaPreview {
  url: string;
  type: 'image' | 'video';
  file: File;
}

interface Story {
  _id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content: string;
  mediaUrl: string;
  mediaPublicId: string;
  mediaItems?: Array<{
    url: string;
    publicId: string;
    type: 'image' | 'video';
  }>;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  expiresAt: string;
}

export function useStoryInteractions(fetchStories: () => void) {
  const [storyType, setStoryType] = useState<'text' | 'image' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<{ message: string; hoursRemaining: number } | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length === 0) return;

    // Determine story type based on first file
    const firstFile = validFiles[0];
    if (firstFile.type.startsWith('image/')) {
      if (storyType === 'text') setStoryType('image');
    } else if (firstFile.type.startsWith('video/')) {
      if (storyType === 'text') setStoryType('video');
    }

    // Add files to state
    setMediaFiles((prev) => [...prev, ...validFiles]);

    // Create previews for all files
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = {
          url: e.target?.result as string,
          type: (file.type.startsWith('image/') ? 'image' : 'video') as 'image' | 'video',
          file,
        };
        setMediaPreviews((prev) => [...prev, preview]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    const preview = mediaPreviews[index];
    
    // If it's a new file (has file property), remove from mediaFiles
    if (preview.file) {
      // Find the index in mediaFiles by counting how many files come before this preview
      let fileIndex = 0;
      for (let i = 0; i < index; i++) {
        if (mediaPreviews[i].file) {
          fileIndex++;
        }
      }
      setMediaFiles((prev) => prev.filter((_, i) => i !== fileIndex));
    }
    
    // Remove from previews
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
    
    // If no media left, reset to text type
    if (mediaPreviews.length === 1) {
      setStoryType('text');
    }
  };

  const resetForm = () => {
    setTextContent('');
    setMediaFiles([]);
    setMediaPreviews([]);
    setStoryType('text');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateStory = async () => {
    if (storyType === 'text' && !textContent.trim()) {
      alert('Please enter text for your story');
      return;
    }

    if ((storyType === 'image' || storyType === 'video') && mediaFiles.length === 0) {
      alert('Please select at least one image or video');
      return;
    }

    try {
      setUploading(true);

      // Handle text story
      if (storyType === 'text') {
        const res = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'text',
            content: textContent,
            mediaUrl: '',
            mediaPublicId: '',
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          if (res.status === 429) {
            const hoursRemaining = errorData.hoursRemaining || 0;
            setRateLimitError({
              message: errorData.error || 'You can only create one story every 24 hours',
              hoursRemaining,
            });
            return;
          } else {
            throw new Error(errorData.error || 'Failed to create story');
          }
        }
      } else {
        // Handle multiple media files
        const uploadPromises = mediaFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', file.type.startsWith('image/') ? 'image' : 'video');

          const uploadRes = await fetch('/api/stories/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!uploadRes.ok) {
            throw new Error('Upload failed');
          }

          const uploadData = await uploadRes.json();
          return {
            url: uploadData.url,
            publicId: uploadData.publicId,
            type: file.type.startsWith('image/') ? 'image' : 'video' as 'image' | 'video',
          };
        });

        const uploadResults = await Promise.all(uploadPromises);
        const firstMediaType = uploadResults[0]?.type || 'image';
        
        const res = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: firstMediaType,
            content: textContent.trim(),
            mediaItems: uploadResults,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          if (res.status === 429) {
            const hoursRemaining = errorData.hoursRemaining || 0;
            setRateLimitError({
              message: errorData.error || 'You can only create one story every 24 hours',
              hoursRemaining,
            });
            return;
          } else {
            throw new Error(errorData.error || 'Failed to create story');
          }
        }
      }

      resetForm();
      fetchStories();
    } catch (err: any) {
      console.error(err);
      if (err.message && !err.message.includes('24 hours')) {
        alert(err.message || 'Failed to create story. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete story');
      }

      fetchStories();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete story. Please try again.');
    }
  };

  const openEditModal = (story: Story) => {
    setEditingStory(story);
    setStoryType(story.type);
    setTextContent(story.content);
    
    // Load existing media items
    const existingMedia = story.mediaItems || (story.mediaUrl ? [{
      url: story.mediaUrl,
      publicId: story.mediaPublicId,
      type: story.type as 'image' | 'video'
    }] : []);
    
    setMediaPreviews(existingMedia.map((item) => ({
      url: item.url,
      type: item.type,
      file: null as any,
    })));
  };

  return {
    storyType,
    setStoryType,
    textContent,
    setTextContent,
    mediaFiles,
    mediaPreviews,
    uploading,
    rateLimitError,
    setRateLimitError,
    editingStory,
    setEditingStory,
    handleFileChange,
    removeMedia,
    resetForm,
    handleCreateStory,
    handleDeleteStory,
    openEditModal,
  };
}