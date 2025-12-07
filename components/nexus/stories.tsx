'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X, Image as ImageIcon, Video, Type, Loader2, ChevronLeft, ChevronRight, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface MediaItem {
  url: string;
  publicId: string;
  type: 'image' | 'video';
}

interface Story {
  _id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content: string;
  mediaUrl: string;
  mediaPublicId: string;
  mediaItems?: MediaItem[];
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  expiresAt: string;
}

interface StoryGroup {
  userId: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  stories: Story[];
  storyCount: number;
}

export function Stories() {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [storyType, setStoryType] = useState<'text' | 'image' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<Array<{ url: string; type: 'image' | 'video'; file: File }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{ message: string; hoursRemaining: number } | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [mediaDuration, setMediaDuration] = useState(5); // Default 5 seconds for images

  useEffect(() => {
    fetchStories();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (viewerOpen && activeStoryGroup) {
      const currentStory = activeStoryGroup.stories[activeStoryIndex];
      const mediaItems = currentStory?.mediaItems || (currentStory?.mediaUrl ? [{
        url: currentStory.mediaUrl,
        publicId: currentStory.mediaPublicId,
        type: currentStory.type as 'image' | 'video'
      }] : []);

      const currentMedia = mediaItems[activeMediaIndex];
      const isVideo = currentMedia?.type === 'video';
      const duration = isVideo ? mediaDuration : 5; // 5 seconds for images, actual duration for videos
      const intervalMs = duration * 1000; // Convert to milliseconds

      // Auto-advance media items or stories based on duration
      const interval = setInterval(() => {
        // If current story has multiple media, advance within it
        if (mediaItems.length > 1 && activeMediaIndex < mediaItems.length - 1) {
          setActiveMediaIndex((prev) => prev + 1);
        } else {
          // Move to next story
          setActiveStoryIndex((prev) => {
            if (prev < activeStoryGroup.stories.length - 1) {
              setActiveMediaIndex(0);
              return prev + 1;
            } else {
              // Close viewer when all stories are viewed
              setViewerOpen(false);
              return prev;
            }
          });
        }
      }, intervalMs);

      // Progress bar - only update for images (videos use onTimeUpdate)
      if (!isVideo) {
        const progressUpdateInterval = 50; // Update every 50ms for smooth animation
        const progressIncrement = (100 / duration) * (progressUpdateInterval / 1000); // Calculate increment per update

        progressIntervalRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              return 0;
            }
            return Math.min(prev + progressIncrement, 100);
          });
        }, progressUpdateInterval);
      } else {
        // For videos, progress is updated via onTimeUpdate event
        progressIntervalRef.current = null;
      }

      return () => {
        clearInterval(interval);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    } else {
      setProgress(0);
      setActiveMediaIndex(0);
      setMediaDuration(5);
    }
  }, [viewerOpen, activeStoryGroup, activeStoryIndex, activeMediaIndex, mediaDuration]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(String(data.user.sub));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stories', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setStoryGroups(data.stories ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
            setCreateModalOpen(false);
          } else {
            throw new Error(errorData.error || 'Failed to create story');
          }
          return;
        }
      } else {
        // Handle multiple media files - create a SINGLE story with multiple media items
        // First, upload all files
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

        // Determine story type based on first media item
        const firstMediaType = uploadResults[0]?.type || 'image';
        
        // Create a SINGLE story with all media items
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
            setCreateModalOpen(false);
            return;
          } else {
            throw new Error(errorData.error || 'Failed to create story');
          }
        }
      }

      // Reset form
      setCreateModalOpen(false);
      setTextContent('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setStoryType('text');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh stories
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

  const openStoryViewer = (group: StoryGroup, index: number = 0) => {
    setActiveStoryGroup(group);
    setActiveStoryIndex(index);
    setActiveMediaIndex(0);
    setViewerOpen(true);
    setProgress(0);
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
    
    setMediaPreviews(existingMedia.map((item, idx) => ({
      url: item.url,
      type: item.type,
      file: null as any, // We don't have the original file for existing media
    })));
    
    setEditModalOpen(true);
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

      let mediaItems: Array<{ url: string; publicId: string; type: 'image' | 'video' }> = [];

      // Get original media items
      const originalMedia = editingStory.mediaItems || (editingStory.mediaUrl ? [{
        url: editingStory.mediaUrl,
        publicId: editingStory.mediaPublicId,
        type: editingStory.type as 'image' | 'video'
      }] : []);

      // Upload new files first
      const newFiles = mediaPreviews.filter((p) => p.file);
      let uploadedNewFiles: Array<{ url: string; publicId: string; type: 'image' | 'video' }> = [];
      
      if (newFiles.length > 0) {
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

        uploadedNewFiles = await Promise.all(uploadPromises);
      }

      // Build mediaItems array in the order of previews
      let newFileIndex = 0;
      mediaItems = mediaPreviews.map((preview) => {
        if (preview.file) {
          // New file - use uploaded result
          const result = uploadedNewFiles[newFileIndex];
          newFileIndex++;
          return result;
        } else {
          // Existing media - find in original media
          return originalMedia.find((item) => item.url === preview.url) || {
            url: preview.url,
            publicId: editingStory.mediaPublicId,
            type: preview.type
          };
        }
      });

      // Update story
      const res = await fetch(`/api/stories/${editingStory._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: storyType,
          content: textContent.trim(),
          mediaItems: mediaItems,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update story');
      }

      // Reset form
      setEditModalOpen(false);
      setEditingStory(null);
      setTextContent('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setStoryType('text');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh stories
      fetchStories();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update story. Please try again.');
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

  const nextStory = () => {
    if (activeStoryGroup) {
      const currentStory = activeStoryGroup.stories[activeStoryIndex];
      const mediaItems = currentStory.mediaItems || (currentStory.mediaUrl ? [{
        url: currentStory.mediaUrl,
        publicId: currentStory.mediaPublicId,
        type: currentStory.type as 'image' | 'video'
      }] : []);

      // If current story has multiple media, navigate within it
      if (mediaItems.length > 1 && activeMediaIndex < mediaItems.length - 1) {
        setActiveMediaIndex(activeMediaIndex + 1);
        setProgress(0);
      } else if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
        // Move to next story
        setActiveStoryIndex(activeStoryIndex + 1);
        setActiveMediaIndex(0);
        setProgress(0);
      }
    }
  };

  const prevStory = () => {
    if (activeStoryGroup) {
      const currentStory = activeStoryGroup.stories[activeStoryIndex];
      const mediaItems = currentStory.mediaItems || (currentStory.mediaUrl ? [{
        url: currentStory.mediaUrl,
        publicId: currentStory.mediaPublicId,
        type: currentStory.type as 'image' | 'video'
      }] : []);

      // If current story has multiple media, navigate within it
      if (mediaItems.length > 1 && activeMediaIndex > 0) {
        setActiveMediaIndex(activeMediaIndex - 1);
        setProgress(0);
      } else if (activeStoryIndex > 0) {
        // Move to previous story
        const prevStory = activeStoryGroup.stories[activeStoryIndex - 1];
        const prevMediaItems = prevStory.mediaItems || (prevStory.mediaUrl ? [{
          url: prevStory.mediaUrl,
          publicId: prevStory.mediaPublicId,
          type: prevStory.type as 'image' | 'video'
        }] : []);
        setActiveStoryIndex(activeStoryIndex - 1);
        setActiveMediaIndex(prevMediaItems.length - 1);
        setProgress(0);
      }
    }
  };

  const myStoryGroup = storyGroups.find((g) => g.userId === currentUserId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Stories
          </h1>
          <p className="text-sm text-slate-500 mt-1">Share moments that disappear after 24 hours</p>
        </div>

        {/* Stories Row */}
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {/* Create Story Card */}
            <Card
              className="flex-shrink-0 w-24 md:w-32 h-40 md:h-48 rounded-xl cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-slate-300 hover:border-blue-500"
              onClick={() => setCreateModalOpen(true)}
            >
              <div className="h-full flex flex-col items-center justify-center gap-2 p-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                  <Plus className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <p className="text-xs md:text-sm font-medium text-slate-600 text-center">Create Story</p>
              </div>
            </Card>

            {/* Story Cards */}
            {storyGroups.map((group) => (
              <Card
                key={group.userId}
                className="flex-shrink-0 w-24 md:w-32 h-40 md:h-48 rounded-xl cursor-pointer hover:shadow-lg transition-shadow overflow-hidden relative"
                onClick={() => openStoryViewer(group, 0)}
              >
                <div className="h-full relative">
                  {group.stories[0]?.type === 'image' && group.stories[0]?.mediaUrl ? (
                    <img
                      src={group.stories[0].mediaUrl}
                      alt={group.author.name}
                      className="w-full h-full object-cover"
                    />
                  ) : group.stories[0]?.type === 'video' && group.stories[0]?.mediaUrl ? (
                    <video
                      src={group.stories[0].mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Type className="w-12 h-12 text-white opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 border-2 border-white">
                        <AvatarImage src={group.author.avatarUrl} />
                        <AvatarFallback className="text-xs">{group.author.name[0]}</AvatarFallback>
                      </Avatar>
                      <p className="text-white text-xs font-medium truncate">{group.author.name}</p>
                    </div>
                  </div>
                  {group.storyCount > 1 && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                      {group.storyCount}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Empty State */}
        {storyGroups.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No stories available. Create one to get started!</p>
          </div>
        )}
      </div>

      {/* Create Story Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Story Type Selection */}
            <div className="flex gap-2">
              <Button
                variant={storyType === 'text' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setStoryType('text');
                  setMediaFiles([]);
                  setMediaPreviews([]);
                }}
              >
                <Type className="w-4 h-4 mr-2" />
                Text
              </Button>
              <Button
                variant={storyType === 'image' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setStoryType('image');
                  fileInputRef.current?.click();
                }}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Image{mediaFiles.length > 0 && ` (${mediaFiles.length})`}
              </Button>
              <Button
                variant={storyType === 'video' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setStoryType('video');
                  fileInputRef.current?.click();
                }}
              >
                <Video className="w-4 h-4 mr-2" />
                Video{mediaFiles.length > 0 && ` (${mediaFiles.length})`}
              </Button>
            </div>

            {/* Text Story */}
            {storyType === 'text' && (
              <Textarea
                placeholder="What's on your mind?"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="min-h-[200px]"
                maxLength={500}
              />
            )}

            {/* Media Previews - Multiple */}
            {mediaPreviews.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  {mediaPreviews.length} {mediaPreviews.length === 1 ? 'file' : 'files'} selected
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {preview.type === 'image' ? (
                        <img
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 md:h-40 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <video
                          src={preview.url}
                          className="w-full h-32 md:h-40 object-cover rounded-lg border border-slate-200"
                          controls
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeMedia(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Input - Multiple */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              onClick={handleCreateStory}
              disabled={uploading || (storyType === 'text' && !textContent.trim()) || (storyType !== 'text' && mediaPreviews.length === 0)}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading story...
                </>
              ) : (
                'Create Story'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rate Limit Error Dialog */}
      <Dialog open={!!rateLimitError} onOpenChange={(open) => !open && setRateLimitError(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <span>Story Limit Reached</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700 mb-4">{rateLimitError?.message}</p>
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-lg">
                    {rateLimitError?.hoursRemaining === 1 
                      ? '1 hour remaining' 
                      : `${rateLimitError?.hoursRemaining || 0} hours remaining`}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    You can create your next story after this time period
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setRateLimitError(null)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="sm:max-w-lg p-0 bg-black">
          {activeStoryGroup && activeStoryGroup.stories[activeStoryIndex] && (
            <div className="relative h-[600px]">
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 right-0 z-10 p-2">
                <div className="flex gap-1">
                  {activeStoryGroup.stories.map((story, idx) => {
                    const mediaItems = story.mediaItems || (story.mediaUrl ? [{
                      url: story.mediaUrl,
                      publicId: story.mediaPublicId,
                      type: story.type as 'image' | 'video'
                    }] : []);
                    const mediaCount = Math.max(mediaItems.length, 1);
                    
                    return (
                      <div key={idx} className="flex gap-1 flex-1">
                        {Array.from({ length: mediaCount }).map((_, mediaIdx) => {
                          const isActive = idx === activeStoryIndex && mediaIdx === activeMediaIndex;
                          const isPast = idx < activeStoryIndex || (idx === activeStoryIndex && mediaIdx < activeMediaIndex);
                          
                          return (
                            <div
                              key={mediaIdx}
                              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer"
                              onClick={() => {
                                setActiveStoryIndex(idx);
                                setActiveMediaIndex(mediaIdx);
                                setProgress(0);
                              }}
                            >
                              <div
                                className="h-full bg-white transition-all duration-100"
                                style={{
                                  width: isPast ? '100%' : isActive ? `${progress}%` : '0%',
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Story Content */}
              <div className="h-full w-full flex items-center justify-center overflow-hidden">
                {(() => {
                  const currentStory = activeStoryGroup.stories[activeStoryIndex];
                  const mediaItems = currentStory.mediaItems || (currentStory.mediaUrl ? [{
                    url: currentStory.mediaUrl,
                    publicId: currentStory.mediaPublicId,
                    type: currentStory.type as 'image' | 'video'
                  }] : []);

                  if (currentStory.type === 'text') {
                    return (
                      <div className="text-white text-center p-8">
                        <p className="text-2xl md:text-4xl font-bold whitespace-pre-wrap">
                          {currentStory.content}
                        </p>
                      </div>
                    );
                  }

                  // Show current media item from the array
                  const currentMedia = mediaItems[activeMediaIndex];
                  if (!currentMedia) return null;

                  if (currentMedia.type === 'image') {
                    return (
                      <img
                        src={currentMedia.url}
                        alt="Story"
                        className="w-full h-full object-cover"
                      />
                    );
                  } else {
                    return (
                      <video
                        key={`${activeStoryIndex}-${activeMediaIndex}-${currentMedia.url}`}
                        ref={videoElementRef}
                        src={currentMedia.url}
                        className="w-full h-full object-cover"
                        controls
                        autoPlay
                        playsInline
                        muted={false}
                        onLoadedMetadata={(e) => {
                          const video = e.currentTarget;
                          const duration = video.duration || 5;
                          setMediaDuration(duration);
                          setProgress(0); // Reset progress when new video loads
                        }}
                        onTimeUpdate={(e) => {
                          // Sync progress with video playback
                          const video = e.currentTarget;
                          if (video.duration) {
                            const currentProgress = (video.currentTime / video.duration) * 100;
                            setProgress(currentProgress);
                          }
                        }}
                        onEnded={() => {
                          // Auto-advance when video ends
                          const currentStory = activeStoryGroup.stories[activeStoryIndex];
                          const mediaItems = currentStory.mediaItems || (currentStory.mediaUrl ? [{
                            url: currentStory.mediaUrl,
                            publicId: currentStory.mediaPublicId,
                            type: currentStory.type as 'image' | 'video'
                          }] : []);

                          if (mediaItems.length > 1 && activeMediaIndex < mediaItems.length - 1) {
                            setActiveMediaIndex(activeMediaIndex + 1);
                            setProgress(0);
                          } else if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
                            setActiveStoryIndex(activeStoryIndex + 1);
                            setActiveMediaIndex(0);
                            setProgress(0);
                          } else {
                            setViewerOpen(false);
                          }
                        }}
                      />
                    );
                  }
                })()}
              </div>

              {/* Author Info */}
              <div className="absolute top-12 left-0 right-0 z-10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={activeStoryGroup.author.avatarUrl} />
                      <AvatarFallback>{activeStoryGroup.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-semibold">{activeStoryGroup.author.name}</p>
                      <p className="text-white/70 text-sm">@{activeStoryGroup.author.username}</p>
                    </div>
                  </div>
                  {currentUserId === activeStoryGroup.userId && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(activeStoryGroup.stories[activeStoryIndex]);
                          setViewerOpen(false);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStory(activeStoryGroup.stories[activeStoryIndex]._id);
                          setViewerOpen(false);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Buttons */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={prevStory}
                disabled={(() => {
                  const currentStory = activeStoryGroup.stories[activeStoryIndex];
                  const mediaItems = currentStory.mediaItems || (currentStory.mediaUrl ? [{
                    url: currentStory.mediaUrl,
                    publicId: currentStory.mediaPublicId,
                    type: currentStory.type as 'image' | 'video'
                  }] : []);
                  const isFirstMedia = activeMediaIndex === 0;
                  const isFirstStory = activeStoryIndex === 0;
                  return isFirstMedia && isFirstStory;
                })()}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={nextStory}
                disabled={(() => {
                  const currentStory = activeStoryGroup.stories[activeStoryIndex];
                  const mediaItems = currentStory.mediaItems || (currentStory.mediaUrl ? [{
                    url: currentStory.mediaUrl,
                    publicId: currentStory.mediaPublicId,
                    type: currentStory.type as 'image' | 'video'
                  }] : []);
                  const isLastMedia = activeMediaIndex >= mediaItems.length - 1;
                  const isLastStory = activeStoryIndex >= activeStoryGroup.stories.length - 1;
                  return isLastMedia && isLastStory;
                })()}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={() => setViewerOpen(false)}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Story Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Story Type Selection */}
            <div className="flex gap-2">
              <Button
                variant={storyType === 'text' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setStoryType('text');
                }}
              >
                <Type className="w-4 h-4 mr-2" />
                Text
              </Button>
              <Button
                variant={storyType === 'image' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setStoryType('image');
                  fileInputRef.current?.click();
                }}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Image{mediaFiles.length > 0 && ` (${mediaFiles.length})`}
              </Button>
              <Button
                variant={storyType === 'video' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setStoryType('video');
                  fileInputRef.current?.click();
                }}
              >
                <Video className="w-4 h-4 mr-2" />
                Video{mediaFiles.length > 0 && ` (${mediaFiles.length})`}
              </Button>
            </div>

            {/* Text Story */}
            {storyType === 'text' && (
              <Textarea
                placeholder="What's on your mind?"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="min-h-[200px]"
                maxLength={500}
              />
            )}

            {/* Media Previews - Multiple */}
            {mediaPreviews.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  {mediaPreviews.length} {mediaPreviews.length === 1 ? 'file' : 'files'} selected
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {preview.type === 'image' ? (
                        <img
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 md:h-40 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <video
                          src={preview.url}
                          className="w-full h-32 md:h-40 object-cover rounded-lg border border-slate-200"
                          controls
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeMedia(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Input - Multiple */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingStory(null);
                  setTextContent('');
                  setMediaFiles([]);
                  setMediaPreviews([]);
                  setStoryType('text');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditStory}
                disabled={uploading || (storyType === 'text' && !textContent.trim()) || (storyType !== 'text' && mediaPreviews.length === 0)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Story'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

