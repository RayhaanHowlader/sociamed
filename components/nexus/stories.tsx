'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X, Image as ImageIcon, Video, Type, Loader2, ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

interface Story {
  _id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content: string;
  mediaUrl: string;
  mediaPublicId: string;
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyType, setStoryType] = useState<'text' | 'image' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{ message: string; hoursRemaining: number } | null>(null);

  useEffect(() => {
    fetchStories();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (viewerOpen && activeStoryGroup) {
      // Auto-advance stories every 5 seconds
      const interval = setInterval(() => {
        setActiveStoryIndex((prev) => {
          if (prev < activeStoryGroup.stories.length - 1) {
            return prev + 1;
          } else {
            // Close viewer when all stories are viewed
            setViewerOpen(false);
            return prev;
          }
        });
      }, 5000);

      // Progress bar
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            return 0;
          }
          return prev + 2; // Increment by 2% every 100ms (5 seconds total)
        });
      }, 100);

      return () => {
        clearInterval(interval);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    } else {
      setProgress(0);
    }
  }, [viewerOpen, activeStoryGroup, activeStoryIndex]);

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
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setStoryType('image');
      setMediaFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setStoryType('video');
      setMediaFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStory = async () => {
    if (storyType === 'text' && !textContent.trim()) {
      alert('Please enter text for your story');
      return;
    }

    if ((storyType === 'image' || storyType === 'video') && !mediaFile) {
      alert('Please select an image or video');
      return;
    }

    try {
      setUploading(true);
      let mediaUrl = '';
      let mediaPublicId = '';

      if (mediaFile) {
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('type', storyType);

        const uploadRes = await fetch('/api/stories/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Upload failed');
        }

        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
        mediaPublicId = uploadData.publicId;
      }

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: storyType,
          content: textContent,
          mediaUrl,
          mediaPublicId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 429) {
          // Rate limit error - user already created a story in last 24 hours
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

      // Reset form
      setCreateModalOpen(false);
      setTextContent('');
      setMediaFile(null);
      setMediaPreview('');
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
    setViewerOpen(true);
    setProgress(0);
  };

  const nextStory = () => {
    if (activeStoryGroup && activeStoryIndex < activeStoryGroup.stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setProgress(0);
    }
  };

  const prevStory = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setProgress(0);
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
                  setMediaFile(null);
                  setMediaPreview('');
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
                Image
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
                Video
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

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative">
                {storyType === 'image' ? (
                  <img src={mediaPreview} alt="Preview" className="w-full rounded-lg" />
                ) : (
                  <video src={mediaPreview} controls className="w-full rounded-lg" ref={videoRef} />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              onClick={handleCreateStory}
              disabled={uploading || (storyType === 'text' && !textContent.trim()) || (storyType !== 'text' && !mediaFile)}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
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
                  {activeStoryGroup.stories.map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                      onClick={() => {
                        setActiveStoryIndex(idx);
                        setProgress(0);
                      }}
                    >
                      <div
                        className="h-full bg-white transition-all duration-100"
                        style={{
                          width: idx < activeStoryIndex ? '100%' : idx === activeStoryIndex ? `${progress}%` : '0%',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Story Content */}
              <div className="h-full flex items-center justify-center">
                {activeStoryGroup.stories[activeStoryIndex].type === 'text' ? (
                  <div className="text-white text-center p-8">
                    <p className="text-2xl md:text-4xl font-bold whitespace-pre-wrap">
                      {activeStoryGroup.stories[activeStoryIndex].content}
                    </p>
                  </div>
                ) : activeStoryGroup.stories[activeStoryIndex].type === 'image' ? (
                  <img
                    src={activeStoryGroup.stories[activeStoryIndex].mediaUrl}
                    alt="Story"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <video
                    src={activeStoryGroup.stories[activeStoryIndex].mediaUrl}
                    className="max-w-full max-h-full"
                    controls
                    autoPlay
                  />
                )}
              </div>

              {/* Author Info */}
              <div className="absolute top-12 left-0 right-0 z-10 p-4">
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
              </div>

              {/* Navigation Buttons */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={prevStory}
                disabled={activeStoryIndex === 0}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={nextStory}
                disabled={activeStoryIndex === activeStoryGroup.stories.length - 1}
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
    </div>
  );
}

