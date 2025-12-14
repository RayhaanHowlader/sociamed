"use client";

import { useEffect, useState } from 'react';
import { Loader2, Video, UploadCloud } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateShortModal } from './create-short-modal';
import { ShortCard } from './short-card';
import { ShortViewerModal } from './short-viewer-modal';
import { DeleteShortModal } from './delete-short-modal';
import { ShareShortModal } from './share-short-modal';

interface ShortItem {
  _id: string;
  caption: string;
  videoUrl: string;
  createdAt: string;
  duration: number;
  userId?: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  stats?: {
    likes?: number;
    comments?: number;
    views?: number;
  };
  liked?: boolean;
}

interface ShortsProps {
  createModalOpen: boolean;
  onCloseCreateModal: () => void;
}

export function Shorts({ createModalOpen, onCloseCreateModal }: ShortsProps) {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<{ name: string; username: string; avatarUrl?: string; userId?: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeShort, setActiveShort] = useState<ShortItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shortPendingDelete, setShortPendingDelete] = useState<ShortItem | null>(null);
  const [deletingShort, setDeletingShort] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shortToShare, setShortToShare] = useState<ShortItem | null>(null);

  useEffect(() => {
    setModalOpen(createModalOpen);
  }, [createModalOpen]);

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
      
      // Get current user ID from auth endpoint
      let userId: string | undefined;
      try {
        const authRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (authRes.ok) {
          const authData = await authRes.json();
          userId = authData.user?.sub;
        }
      } catch (err) {
        console.error('Failed to get user ID:', err);
      }
      
      setProfile({ ...data.profile, userId });
    } catch (err) {
      console.error(err);
      setProfile(null);
    }
  };

  useEffect(() => {
    fetchShorts();
    fetchProfile();
  }, []);

  // Listen for open-short events from shared shorts in messages
  useEffect(() => {
    const handleOpenShort = (e: CustomEvent<{ short: ShortItem }>) => {
      setActiveShort(e.detail.short);
      setViewerOpen(true);
    };

    window.addEventListener('open-short' as any, handleOpenShort as EventListener);
    
    return () => {
      window.removeEventListener('open-short' as any, handleOpenShort as EventListener);
    };
  }, []);

  const handleShortCreated = () => {
    fetchShorts();
  };

  const handleShortUpdated = (updatedShort: ShortItem) => {
    console.log('Updating short in shorts list:', updatedShort);
    setShorts((prev) =>
      prev.map((s) => (s._id === updatedShort._id ? updatedShort : s))
    );
    setActiveShort(updatedShort);
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

  const promptDeleteShort = (shortId: string) => {
    const target =
      shorts.find((s) => s._id === shortId) ||
      (activeShort && activeShort._id === shortId ? activeShort : null);

    if (!target) {
      return;
    }

    if (activeShort?._id === shortId) {
      setViewerOpen(false);
    }

    setShortPendingDelete(target);
    setDeleteModalOpen(true);
  };

  const handleDeleteModalToggle = (open: boolean) => {
    setDeleteModalOpen(open);
    if (!open) {
      setShortPendingDelete(null);
    }
  };

  const handleShareShort = (short: ShortItem) => {
    setShortToShare(short);
    setShareModalOpen(true);
  };

  const handleShareModalToggle = (open: boolean) => {
    setShareModalOpen(open);
    if (!open) {
      setShortToShare(null);
    }
  };

  const handleConfirmDeleteShort = async () => {
    if (!shortPendingDelete) {
      return;
    }

    try {
      setDeletingShort(true);
      const res = await fetch('/api/shorts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shortId: shortPendingDelete._id }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to delete short');
        alert(data.error || 'Failed to delete short');
        return;
      }

      setShorts((prev) => prev.filter((s) => s._id !== shortPendingDelete._id));

      if (activeShort?._id === shortPendingDelete._id) {
        setViewerOpen(false);
        setActiveShort(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete short. Please try again.');
    } finally {
      setDeletingShort(false);
      setDeleteModalOpen(false);
      setShortPendingDelete(null);
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
              <ShortCard
                key={short._id}
                short={short}
                currentUserId={profile?.userId}
                onView={(s) => {
                  setActiveShort(s);
                  setViewerOpen(true);
                }}
                onLike={toggleLike}
                onDelete={promptDeleteShort}
                onShare={handleShareShort}
              />
            ))}
          </div>
        )}
      </div>

      <CreateShortModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onClose={() => {
          setModalOpen(false);
          onCloseCreateModal();
        }}
        profile={profile}
        onShortCreated={handleShortCreated}
      />

      <ShortViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        short={activeShort}
        currentUserId={profile?.userId}
        onLike={toggleLike}
        onDelete={promptDeleteShort}
        onShortUpdated={handleShortUpdated}
      />

      <DeleteShortModal
        open={deleteModalOpen}
        onOpenChange={handleDeleteModalToggle}
        short={shortPendingDelete}
        onConfirm={handleConfirmDeleteShort}
        deleting={deletingShort}
      />

      <ShareShortModal
        open={shareModalOpen}
        onOpenChange={handleShareModalToggle}
        short={shortToShare}
        onShareSuccess={(count) => {
          console.log(`Short shared with ${count} friends`);
        }}
      />
    </div>
  );
}
