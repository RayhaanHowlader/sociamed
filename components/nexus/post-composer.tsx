'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Smile, Loader2, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmojiPicker } from './emoji-picker';

interface ProfileSummary {
  name: string;
  username: string;
  avatarUrl?: string;
}

interface PostComposerProps {
  profile: ProfileSummary | null;
  onPostCreated: (post: any) => void;
}

export function PostComposer({ profile, onPostCreated }: PostComposerProps) {
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postImagePublicId, setPostImagePublicId] = useState('');
  const [posting, setPosting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/posts/upload', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to upload image');
        return;
      }

      setPostImageUrl(data.url);
      setPostImagePublicId(data.publicId);
    } catch (err) {
      console.error(err);
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreatePost = async () => {
    if (!profile) {
      setError('Complete your profile before posting.');
      return;
    }

    if (!postContent.trim() && !postImageUrl) {
      setError('Write something or add an image.');
      return;
    }

    setPosting(true);
    setError('');

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: postContent,
          imageUrl: postImageUrl,
          imagePublicId: postImagePublicId,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to publish post');
        return;
      }

      onPostCreated(data.post);
      setPostContent('');
      setPostImageUrl('');
      setPostImagePublicId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setError('Unable to publish post');
    } finally {
      setPosting(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setPostContent((prev) => prev + emoji);
  };

  const composerDisabled = !profile || posting || uploadingImage;

  return (
    <Card className="border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src={profile?.avatarUrl} />
            <AvatarFallback>{profile?.name?.[0] ?? 'N'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {!profile ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Complete your profile before sharing your first post.
              </div>
            ) : (
              <>
                <Textarea
                  placeholder="What's on your mind?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[80px] resize-none border-slate-200 dark:border-slate-600 focus:border-blue-500 transition-colors dark:bg-slate-900 dark:text-white"
                  disabled={posting}
                />
                {postImageUrl && (
                  <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                    <img src={postImageUrl} alt="Selected" className="w-full object-cover" />
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4 mr-2" />
                      )}
                      Photo
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                    <EmojiPicker onEmojiSelect={handleEmojiSelect}>
                      <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                        <Smile className="w-4 h-4 mr-2" />
                        Emoji
                      </Button>
                    </EmojiPicker>
                  </div>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    onClick={handleCreatePost}
                    disabled={composerDisabled}
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                  </Button>
                </div>
              </>
            )}
            {error && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}