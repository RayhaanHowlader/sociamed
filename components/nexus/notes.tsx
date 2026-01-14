'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Music, X, Loader2, Play, Pause, Upload, Trash2, Edit2, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Note {
  _id: string;
  userId: string;
  text: string;
  musicUrl: string;
  musicTitle: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMoreNotes, setHasMoreNotes] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [text, setText] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicFileUrl, setMusicFileUrl] = useState<string>('');
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const notesContainerRef = useRef<HTMLDivElement | null>(null);

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

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notes?limit=5', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setNotes(data.notes ?? []);
      setHasMoreNotes(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load more notes when scrolling down
  const loadMoreNotes = useCallback(async () => {
    if (loadingMore || !hasMoreNotes) return;

    const oldestNote = notes[notes.length - 1];
    if (!oldestNote) return;

    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/notes?limit=5&after=${oldestNote.createdAt}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to load more notes');
        return;
      }

      // Append newer notes to the end
      setNotes((prev) => [...prev, ...(data.notes ?? [])]);
      setHasMoreNotes(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreNotes, notes]);

  useEffect(() => {
    fetchNotes();
    fetchCurrentUser();
  }, []);

  // Handle scroll to detect when user scrolls near bottom
  useEffect(() => {
    if (!hasMoreNotes) return;

    const handleScroll = () => {
      if (loadingMore || !hasMoreNotes) return;

      // Check if scrolled near the bottom (within 200px)
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (documentHeight - (scrollTop + windowHeight) < 200) {
        loadMoreNotes();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMoreNotes, loadingMore, loadMoreNotes]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 50MB.');
      if (e.target) e.target.value = '';
      return;
    }

    setMusicFile(file);
    setMusicUrl(''); // Clear URL input if file is selected

    // Upload file immediately
    try {
      setUploadingMusic(true);
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/notes/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      let uploadData;
      try {
        uploadData = await uploadRes.json();
      } catch (parseError) {
        console.error('Failed to parse upload response:', parseError);
        alert('Failed to upload music file. Please try again.');
        setMusicFile(null);
        setMusicFileUrl('');
        setUploadingMusic(false);
        if (e.target) e.target.value = '';
        return;
      }

      if (!uploadRes.ok) {
        const errorMessage = uploadData.details || uploadData.error || 'Failed to upload music file.';
        alert(errorMessage);
        setMusicFile(null);
        setMusicFileUrl('');
        setUploadingMusic(false);
        if (e.target) e.target.value = '';
        return;
      }

      if (!uploadData.url) {
        alert('Invalid response from server. Please try again.');
        setMusicFile(null);
        setMusicFileUrl('');
        setUploadingMusic(false);
        if (e.target) e.target.value = '';
        return;
      }

      setMusicFileUrl(uploadData.url);
      setMusicUrl(uploadData.url); // Set the uploaded URL
      if (!musicTitle.trim()) {
        setMusicTitle(uploadData.fileName || file.name);
      }
    } catch (err) {
      console.error('Error uploading music file:', err);
      alert(err instanceof Error ? err.message : 'Failed to upload music file. Please try again.');
      setMusicFile(null);
      setMusicFileUrl('');
    } finally {
      setUploadingMusic(false);
    }
  };

  const resetForm = () => {
    setText('');
    setMusicUrl('');
    setMusicTitle('');
    setMusicFile(null);
    setMusicFileUrl('');
    setEditingNote(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleCreateNote = async () => {
    const finalMusicUrl = musicFileUrl || musicUrl.trim();
    
    if (!text.trim() && !finalMusicUrl) {
      alert('Please add text or music to your note');
      return;
    }

    try {
      setUploading(true);
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: text.trim(),
          musicUrl: finalMusicUrl,
          musicTitle: musicTitle.trim() || (musicFile ? musicFile.name : ''),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create note');
      }

      // Reset form
      setCreateModalOpen(false);
      resetForm();

      // Refresh notes
      fetchNotes();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to create note. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setText(note.text);
    setMusicUrl(note.musicUrl);
    setMusicTitle(note.musicTitle);
    setMusicFile(null);
    setMusicFileUrl('');
    setEditModalOpen(true);
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;

    const finalMusicUrl = musicFileUrl || musicUrl.trim();
    
    if (!text.trim() && !finalMusicUrl) {
      alert('Please add text or music to your note');
      return;
    }

    try {
      setUploading(true);
      const res = await fetch(`/api/notes/${editingNote._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: text.trim(),
          musicUrl: finalMusicUrl,
          musicTitle: musicTitle.trim() || (musicFile ? musicFile.name : ''),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update note');
      }

      // Reset form
      setEditModalOpen(false);
      resetForm();

      // Refresh notes
      fetchNotes();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update note. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      setDeletingNoteId(noteId);
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete note');
      }

      // Refresh notes
      fetchNotes();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete note. Please try again.');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const togglePlayMusic = (noteId: string, musicUrl: string) => {
    if (!musicUrl) return;

    let audio = audioRefs.current.get(noteId);
    
    if (!audio) {
      audio = new Audio(musicUrl);
      audioRefs.current.set(noteId, audio);
      
      audio.onended = () => {
        setPlayingNoteId(null);
      };
    }

    if (playingNoteId === noteId) {
      // Pause current
      audio.pause();
      setPlayingNoteId(null);
    } else {
      // Stop any other playing audio
      if (playingNoteId) {
        const otherAudio = audioRefs.current.get(playingNoteId);
        if (otherAudio) {
          otherAudio.pause();
          otherAudio.currentTime = 0;
        }
      }
      // Play this one
      audio.play();
      setPlayingNoteId(noteId);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Notes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Share small notes with your friends</p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Note
          </Button>
        </div>

        {/* Notes List */}
        <div ref={notesContainerRef}>
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No notes yet. Create one to get started!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {notes.map((note) => (
              <Card key={note._id} className="hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={note.author.avatarUrl} />
                      <AvatarFallback>{note.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">{note.author.name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">@{note.author.username}</p>
                          <span className="text-slate-400 dark:text-slate-500">·</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatTimeAgo(note.createdAt)}</p>
                        </div>
                        {/* Edit/Delete Menu - Only show for note creator */}
                        {currentUserId === note.userId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 dark:hover:bg-slate-700"
                                disabled={deletingNoteId === note._id}
                              >
                                {deletingNoteId === note._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                              <DropdownMenuItem onClick={() => handleEditNote(note)} className="dark:text-slate-300 dark:hover:bg-slate-700">
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteNote(note._id)}
                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 dark:hover:bg-slate-700"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {note.text && (
                        <p className="text-slate-700 dark:text-slate-200 mb-3 whitespace-pre-wrap break-words">
                          {note.text}
                        </p>
                      )}

                      {note.musicUrl && (
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Button
                            variant="outline"
                            size="icon"
                            className="flex-shrink-0 dark:border-slate-600 dark:hover:bg-slate-700"
                            onClick={() => togglePlayMusic(note._id, note.musicUrl)}
                          >
                            {playingNoteId === note._id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {note.musicTitle || 'Music'}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{note.musicUrl}</p>
                          </div>
                          <Music className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
              </div>
              
              {/* Load more button or loading indicator */}
              {hasMoreNotes && !loadingMore && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadMoreNotes()}
                    className="text-xs"
                  >
                    Load more notes
                  </Button>
                </div>
              )}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Note Modal */}
      <Dialog open={createModalOpen} onOpenChange={(open) => {
        setCreateModalOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Create Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Text</label>
              <Textarea
                placeholder="What's on your mind?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[120px] dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                maxLength={500}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{text.length}/500</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Music (Optional)</label>
              
              {/* File Upload Option */}
              <div className="mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMusic}
                >
                  {uploadingMusic ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Music File
                    </>
                  )}
                </Button>
              </div>

              {/* Uploaded File Preview */}
              {musicFile && musicFileUrl && (
                <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Music className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">{musicFile.name}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">Uploaded successfully</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 dark:hover:bg-slate-700"
                    onClick={() => {
                      setMusicFile(null);
                      setMusicFileUrl('');
                      setMusicUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Or Divider */}
              {!musicFile && (
                <div className="relative mb-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400">Or</span>
                  </div>
                </div>
              )}

              {/* URL Input (only show if no file uploaded) */}
              {!musicFile && (
                <>
                  <Input
                    placeholder="Music URL (e.g., Spotify, YouTube, SoundCloud)"
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    className="mb-2 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  />
                  <Input
                    placeholder="Music Title (Optional)"
                    value={musicTitle}
                    onChange={(e) => setMusicTitle(e.target.value)}
                    className="dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Add a link to your favorite song or music
                  </p>
                </>
              )}

              {/* Show title input if file is uploaded */}
              {musicFile && musicFileUrl && (
                <Input
                  placeholder="Music Title (Optional)"
                  value={musicTitle}
                  onChange={(e) => setMusicTitle(e.target.value)}
                  className="dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                />
              )}
            </div>

            <Button
              onClick={handleCreateNote}
              disabled={uploading || uploadingMusic || (!text.trim() && !musicFileUrl && !musicUrl.trim())}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Note'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Note Modal */}
      <Dialog open={editModalOpen} onOpenChange={(open) => {
        setEditModalOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Text</label>
              <Textarea
                placeholder="What's on your mind?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[120px] dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                maxLength={500}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{text.length}/500</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Music (Optional)</label>
              
              {/* File Upload Option */}
              <div className="mb-3">
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileChange(e, true)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  onClick={() => editFileInputRef.current?.click()}
                  disabled={uploadingMusic}
                >
                  {uploadingMusic ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Music File
                    </>
                  )}
                </Button>
              </div>

              {/* Uploaded File Preview */}
              {musicFile && musicFileUrl && (
                <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Music className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">{musicFile.name}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">Uploaded successfully</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 dark:hover:bg-slate-700"
                    onClick={() => {
                      setMusicFile(null);
                      setMusicFileUrl('');
                      setMusicUrl(editingNote?.musicUrl || '');
                      if (editFileInputRef.current) editFileInputRef.current.value = '';
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Or Divider */}
              {!musicFile && (
                <div className="relative mb-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400">Or</span>
                  </div>
                </div>
              )}

              {/* URL Input (only show if no file uploaded) */}
              {!musicFile && (
                <>
                  <Input
                    placeholder="Music URL (e.g., Spotify, YouTube, SoundCloud)"
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    className="mb-2 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  />
                  <Input
                    placeholder="Music Title (Optional)"
                    value={musicTitle}
                    onChange={(e) => setMusicTitle(e.target.value)}
                    className="dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Add a link to your favorite song or music
                  </p>
                </>
              )}

              {/* Show title input if file is uploaded */}
              {musicFile && musicFileUrl && (
                <Input
                  placeholder="Music Title (Optional)"
                  value={musicTitle}
                  onChange={(e) => setMusicTitle(e.target.value)}
                  className="dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                />
              )}
            </div>

            <Button
              onClick={handleUpdateNote}
              disabled={uploading || uploadingMusic || (!text.trim() && !musicFileUrl && !musicUrl.trim())}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Note'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

