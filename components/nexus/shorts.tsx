"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader2, Video, UploadCloud, AlertCircle, Play, XCircle, Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ShortItem {
  _id: string;
  caption: string;
  videoUrl: string;
  createdAt: string;
  duration: number;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  stats?: {
    likes?: number;
    comments?: number;
  };
  liked?: boolean;
}

interface ShortComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
  };
}

interface ShortsProps {
  createModalOpen: boolean;
  onCloseCreateModal: () => void;
}

export function Shorts({ createModalOpen, onCloseCreateModal }: ShortsProps) {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<{ name: string; username: string; avatarUrl?: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeShort, setActiveShort] = useState<ShortItem | null>(null);
  const [shortComments, setShortComments] = useState<ShortComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    setModalOpen(createModalOpen);
  }, [createModalOpen]);

  const closeModal = () => {
    setModalOpen(false);
    setCaption('');
    setVideoFile(null);
    setVideoPreview('');
    setVideoDuration(0);
    setError('');
    onCloseCreateModal();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchShorts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/shorts');
      const data = await res.json();
      setShorts(data.shorts ?? []);
    } catch (err) {
      console.error(err);
      setError('Unable to load shorts at the moment.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', { credentials: 'include' });
      if (!res.ok) {
        setProfile(null);
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch (err) {
      console.error(err);
      setProfile(null);
    }
  };

  useEffect(() => {
    fetchShorts();
    fetchProfile();
  }, []);

  useEffect(() => {
    if (viewerOpen && activeShort?._id) {
      void loadComments(activeShort._id);
    } else {
      setShortComments([]);
      setCommentInput('');
    }
  }, [viewerOpen, activeShort]);

  const handleFileChange = (file: File) => {
    setError('');

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration || 0;

      if (duration > 60) {
        setError('Video must be 60 seconds or shorter.');
        setVideoFile(null);
        setVideoPreview('');
        setVideoDuration(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        URL.revokeObjectURL(url);
        return;
      }

      setVideoFile(file);
      setVideoPreview(url);
      setVideoDuration(duration);
    };
    video.src = url;
  };

  const clearSelectedVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
    setVideoDuration(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateShort = async () => {
    if (!profile) {
      setError('Complete your profile before creating shorts.');
      return;
    }

    if (!videoFile) {
      setError('Select a short video to upload.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('file', videoFile);

      const uploadRes = await fetch('/api/shorts/upload', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        setError(uploadData.error || 'Failed to upload video.');
        setUploading(false);
        return;
      }

      const res = await fetch('/api/shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          caption,
          videoUrl: uploadData.url,
          videoPublicId: uploadData.publicId,
          duration: videoDuration,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to create short.');
        setUploading(false);
        return;
      }

      setShorts((prev) => [data.short, ...prev]);
      closeModal();
    } catch (err) {
      console.error(err);
      setError('Unable to create short.');
    } finally {
      setUploading(false);
    }
  };

  const toggleLike = async (shortId: string) => {
    try {
      const res = await fetch('/api/shorts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shortId }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to like short');
        return;
      }

      setShorts((prev) =>
        prev.map((s) =>
          s._id === shortId
            ? {
                ...s,
                stats: {
                  likes: data.likes,
                  comments: s.stats?.comments ?? 0,
                },
                liked: data.liked,
              }
            : s,
        ),
      );

      setActiveShort((current) =>
        current && current._id === shortId
          ? {
              ...current,
              stats: {
                likes: data.likes,
                comments: current.stats?.comments ?? 0,
              },
              liked: data.liked,
            }
          : current,
      );
    } catch (err) {
      console.error(err);
    }
  };

  const loadComments = async (shortId: string) => {
    try {
      setCommentsLoading(true);
      const res = await fetch(`/api/shorts/comments?shortId=${shortId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load comments');
        return;
      }
      setShortComments(data.comments ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const addComment = async () => {
    if (!activeShort?._id) return;

    const text = commentInput.trim();
    if (!text) return;

    try {
      const res = await fetch('/api/shorts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shortId: activeShort._id, content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to add comment');
        return;
      }

      setShortComments((prev) => [...prev, data.comment]);
      setCommentInput('');

      setShorts((prev) =>
        prev.map((s) =>
          s._id === activeShort._id
            ? {
                ...s,
                stats: {
                  likes: s.stats?.likes ?? 0,
                  comments: (s.stats?.comments ?? 0) + 1,
                },
              }
            : s,
        ),
      );

      setActiveShort((current) =>
        current
          ? {
              ...current,
              stats: {
                likes: current.stats?.likes ?? 0,
                comments: (current.stats?.comments ?? 0) + 1,
              },
            }
          : current,
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-6 h-6 text-blue-600" />
              Shorts
            </h1>
            <p className="text-sm text-slate-500">Share quick updates with short vertical videos.</p>
          </div>
          <Button
            className="bg-gradient-to-r from-blue-600 to-cyan-600"
            onClick={() => setModalOpen(true)}
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload short
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : shorts.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="py-16 text-center space-y-3">
              <Video className="w-10 h-10 text-blue-500 mx-auto" />
              <p className="text-slate-500">No shorts yet. Be the first to share a short video!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {shorts.map((short) => (
              <Card
                key={short._id}
                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
              >
                <button
                  type="button"
                  className="relative h-56 bg-black w-full"
                  onClick={() => {
                    setActiveShort(short);
                    setViewerOpen(true);
                  }}
                >
                  <video
                    src={short.videoUrl}
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </button>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={short.author.avatarUrl} />
                      <AvatarFallback>{short.author.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                        {short.author.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {short.author.username} · {new Date(short.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {short.caption && (
                    <p className="text-xs text-slate-700 line-clamp-2">{short.caption}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => toggleLike(short._id)}
                      className="inline-flex items-center gap-1 hover:text-red-500 transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${short.liked ? 'fill-red-500 text-red-500' : ''}`}
                      />
                      <span>{short.stats?.likes ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveShort(short);
                        setViewerOpen(true);
                      }}
                      className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{short.stats?.comments ?? 0}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => (open ? setModalOpen(true) : closeModal())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload a short</DialogTitle>
            <DialogDescription>Share a quick video update up to 60 seconds long.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Video file</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="mt-2 block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
              />
              <p className="text-xs text-slate-500 mt-1">MP4 / MOV up to 60 seconds.</p>
              {videoPreview && (
                <div className="mt-3 h-56 rounded-lg overflow-hidden border border-slate-200 relative">
                  <video src={videoPreview} controls className="w-full h-full object-contain bg-black" />
                  <button
                    type="button"
                    onClick={clearSelectedVideo}
                    className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white text-red-600 shadow p-0.5"
                    aria-label="Remove selected video"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Caption</label>
              <Textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a short description…"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-600 to-cyan-600"
              onClick={handleCreateShort}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share short'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={viewerOpen} onOpenChange={(open) => (open ? setViewerOpen(true) : setViewerOpen(false))}>
        <DialogContent className="sm:max-w-3xl">
          {activeShort && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activeShort.author.avatarUrl} />
                    <AvatarFallback>{activeShort.author.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{activeShort.author.name}</p>
                    <p className="text-xs text-slate-500">{activeShort.author.username}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 grid gap-4 md:grid-cols-[minmax(0,2fr),minmax(0,1fr)] items-start">
                <div className="bg-black rounded-xl overflow-hidden">
                  <video
                    src={activeShort.videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full max-h-[70vh] object-contain"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <button
                      type="button"
                      onClick={() => toggleLike(activeShort._id)}
                      className="inline-flex items-center gap-1 hover:text-red-500 transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${activeShort.liked ? 'fill-red-500 text-red-500' : ''}`}
                      />
                      <span>{activeShort.stats?.likes ?? 0}</span>
                    </button>
                    <div className="inline-flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{activeShort.stats?.comments ?? 0}</span>
                    </div>
                  </div>
                  {activeShort.caption && (
                    <p className="text-sm text-slate-800">{activeShort.caption}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Shared {new Date(activeShort.createdAt).toLocaleString()}
                  </p>
                  <div className="pt-2 border-t border-slate-200 space-y-3 max-h-[40vh] overflow-y-auto">
                    {commentsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading comments...
                      </div>
                    ) : shortComments.length === 0 ? (
                      <p className="text-xs text-slate-400">No comments yet. Be the first to comment!</p>
                    ) : (
                      shortComments.map((comment) => (
                        <div key={comment.id} className="text-xs space-y-0.5">
                          <p className="font-semibold text-slate-700">
                            {comment.author.name}{' '}
                            <span className="text-slate-400">@{comment.author.username}</span>
                          </p>
                          <p className="text-slate-700">{comment.content}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <label className="text-xs font-medium text-slate-600">Add a comment</label>
                    <Textarea
                      rows={2}
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Share your thoughts…"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-cyan-600"
                        onClick={addComment}
                      >
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


