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

  const handleVideoRecorded = (videoBlob: Blob, videoUrl: string) => {
    console.log('Handling recorded video:', { size: videoBlob.size, type: videoBlob.type });
    
    if (videoBlob.size === 0) {
      console.error('Recorded video blob is empty');
      alert('Recording failed. Please try again.');
      return;
    }
    
    // Convert blob to file with proper timestamp and format
    const timestamp = Date.now();
    const originalType = videoBlob.type || 'video/webm';
    
    // Determine file extension based on type
    let extension = 'webm';
    if (originalType.includes('mp4')) {
      extension = 'mp4';
    } else if (originalType.includes('webm')) {
      extension = 'webm';
    }
    
    const videoFile = new File([videoBlob], `recorded-video-${timestamp}.${extension}`, { 
      type: originalType,
      lastModified: timestamp
    });
    
    console.log('Created video file:', { 
      name: videoFile.name, 
      size: videoFile.size, 
      type: videoFile.type,
      extension,
      originalBlobType: videoBlob.type
    });
    
    // Set story type to video
    setStoryType('video');
    
    // Replace any existing media files
    setMediaFiles([videoFile]);
    
    // Replace any existing previews
    setMediaPreviews([{
      url: videoUrl,
      type: 'video',
      file: videoFile,
    }]);
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
    setEditingStory(null);
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
        const uploadPromises = mediaFiles.map(async (file, index) => {
          console.log(`Uploading file ${index + 1}:`, { name: file.name, size: file.size, type: file.type });
          
          if (file.size === 0) {
            throw new Error(`File ${file.name} is empty (0 bytes)`);
          }

          const formData = new FormData();
          formData.append('file', file);

          const uploadRes = await fetch('/api/stories/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!uploadRes.ok) {
            const errorData = await uploadRes.json();
            console.error('Upload failed:', {
              status: uploadRes.status,
              statusText: uploadRes.statusText,
              errorData,
              file: { name: file.name, size: file.size, type: file.type }
            });
            
            let errorMessage = 'Upload failed';
            if (errorData.details) {
              errorMessage = errorData.details;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            } else if (uploadRes.status === 413) {
              errorMessage = 'File too large. Please try a smaller video.';
            } else if (uploadRes.status === 415) {
              errorMessage = 'Unsupported file format. Please try a different video format.';
            }
            
            throw new Error(errorMessage);
          }

          const uploadData = await uploadRes.json();
          console.log(`File ${index + 1} uploaded successfully:`, uploadData);
          
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

  const handleEditStory = async () => {
    if (!editingStory) return;

    if (storyType === 'text' && !textContent.trim()) {
      alert('Please enter text for your story');
      return;
    }

    if ((storyType === 'image' || storyType === 'video') && mediaPreviews.length === 0) {
      alert('Please select at least one image or video');
      return;
    }

    try {
      setUploading(true);

      // Handle text story
      if (storyType === 'text') {
        const res = await fetch(`/api/stories/${editingStory._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'text',
            content: textContent,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update story');
        }
      } else {
        // Handle media stories
        const newFiles = mediaFiles; // New files to upload
        const existingMedia = mediaPreviews.filter(p => !p.file); // Existing media without file property

        let uploadResults: Array<{ url: string; publicId: string; type: 'image' | 'video' }> = [];

        // Keep existing media - get publicId from original story
        uploadResults = existingMedia.map((media, index) => {
          const originalMediaItems = editingStory.mediaItems || (editingStory.mediaUrl ? [{
            url: editingStory.mediaUrl,
            publicId: editingStory.mediaPublicId,
            type: editingStory.type as 'image' | 'video'
          }] : []);
          
          const originalMedia = originalMediaItems.find(item => item.url === media.url);
          
          return {
            url: media.url,
            publicId: originalMedia?.publicId || '',
            type: media.type,
          };
        });

        // Upload new files if any
        if (newFiles.length > 0) {
          const uploadPromises = newFiles.map(async (file, index) => {
            console.log(`Uploading new file ${index + 1}:`, { name: file.name, size: file.size, type: file.type });
            
            if (file.size === 0) {
              throw new Error(`File ${file.name} is empty (0 bytes)`);
            }

            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/stories/upload', {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });

            if (!uploadRes.ok) {
              const errorData = await uploadRes.json();
              console.error('Upload failed:', {
                status: uploadRes.status,
                statusText: uploadRes.statusText,
                errorData,
                file: { name: file.name, size: file.size, type: file.type }
              });
              
              let errorMessage = 'Upload failed';
              if (errorData.details) {
                errorMessage = errorData.details;
              } else if (errorData.error) {
                errorMessage = errorData.error;
              }
              
              throw new Error(errorMessage);
            }

            const uploadData = await uploadRes.json();
            console.log(`New file ${index + 1} uploaded successfully:`, uploadData);
            
            return {
              url: uploadData.url,
              publicId: uploadData.publicId,
              type: file.type.startsWith('image/') ? 'image' : 'video' as 'image' | 'video',
            };
          });

          const newUploads = await Promise.all(uploadPromises);
          uploadResults = [...uploadResults, ...newUploads];
        }

        const res = await fetch(`/api/stories/${editingStory._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: storyType,
            content: textContent.trim(),
            mediaItems: uploadResults,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update story');
        }
      }

      resetForm();
      setEditingStory(null);
      fetchStories();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update story. Please try again.');
    } finally {
      setUploading(false);
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
      file: null as any, // No file for existing media
    })));
    
    // Clear new files when editing
    setMediaFiles([]);
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
    handleVideoRecorded,
    removeMedia,
    resetForm,
    handleCreateStory,
    handleEditStory,
    handleDeleteStory,
    openEditModal,
  };
}