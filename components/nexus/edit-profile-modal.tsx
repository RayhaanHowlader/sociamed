'use client';

import { useState, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ProfileRecord {
  name: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  avatarUrl: string;
  coverUrl: string;
  createdAt?: string;
}

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileRecord | null;
  onSave: (updatedProfile: ProfileRecord) => void;
}

const DEFAULT_PROFILE: ProfileRecord = {
  name: '',
  username: '',
  bio: '',
  location: '',
  website: '',
  avatarUrl: '',
  coverUrl: '',
};

export function EditProfileModal({ open, onOpenChange, profile, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState<ProfileRecord>(profile ?? DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'avatar' | 'cover' | null>(null);
  const [error, setError] = useState('');

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleInputChange = (key: keyof ProfileRecord, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };
  const handleImageUpload = async (type: 'avatar' | 'cover', file: File) => {
    setUploadingImage(type);
    setError('');

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('imageType', type);

      const res = await fetch('/api/profile/upload', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Image upload failed');
        return;
      }

      handleInputChange(type === 'avatar' ? 'avatarUrl' : 'coverUrl', data.url);
    } catch (err) {
      console.error(err);
      setError('Image upload failed');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to save profile');
        return;
      }

      onSave(data.profile);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setError('Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setError('');
      setFormData(profile ?? DEFAULT_PROFILE);
    }
    onOpenChange(newOpen);
  };
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">{profile ? 'Edit your profile' : 'Create your profile'}</DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            This information appears on your public profile. You can update it anytime.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Username</label>
              <Input
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required
                placeholder="@yourhandle"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Bio</label>
            <Textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              rows={3}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, Country"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Website</label>
              <Input
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://example.com"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Avatar</label>
              <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={formData.avatarUrl} />
                  <AvatarFallback>
                    {formData.name ? formData.name[0] : 'N'}
                  </AvatarFallback>
                </Avatar>
                <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleImageUpload('avatar', e.target.files[0]);
                      }
                    }}
                  />
                  {uploadingImage === 'avatar' ? 'Uploading...' : 'Upload image'}
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Cover</label>
              <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleImageUpload('cover', e.target.files[0]);
                    }
                  }}
                />
                {uploadingImage === 'cover' ? 'Uploading...' : 'Upload cover image'}
              </label>
              {formData.coverUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border dark:border-slate-700">
                  <img src={formData.coverUrl} alt="Cover preview" className="h-24 w-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || uploadingImage !== null}
              className="bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save profile'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}