'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Image as ImageIcon,
  Smile,
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Post {
  _id: string;
  content: string;
  imageUrl?: string;
  imagePublicId?: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  userId: string;
  stats?: {
    likes: number;
    comments: number;
    shares: number;
  };
  liked?: boolean;
}

interface PostComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
  };
}

interface ProfileSummary {
  name: string;
  username: string;
  avatarUrl?: string;
}

export function Feed() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [postImagePublicId, setPostImagePublicId] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [posting, setPosting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [postComments, setPostComments] = useState<Record<string, PostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', { credentials: 'include' });
      if (!res.ok) {
        setProfile(null);
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch {
      setProfile(null);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const res = await fetch('/api/posts');
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        setCurrentUserId(null);
        return;
      }
      const data = await res.json();
      setCurrentUserId(data.user?.sub ?? null);
    } catch {
      setCurrentUserId(null);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchCurrentUser();
  }, []);

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

      setPosts((prev) => [data.post, ...prev]);
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

  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to delete post');
        return;
      }

      setPosts((prev) => prev.filter((p) => p._id !== id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError('Unable to delete post');
    }
  };

  const startEditing = (post: Post) => {
    setEditingPostId(post._id);
    setEditingContent(post.content);
    setError('');
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditingContent('');
  };

  const saveEdit = async (post: Post) => {
    if (!editingContent.trim()) {
      setError('Post content cannot be empty.');
      return;
    }

    try {
      const res = await fetch(`/api/posts/${post._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to update post');
        return;
      }

      setPosts((prev) => prev.map((p) => (p._id === post._id ? { ...(p as Post), ...data.post } : p)));
      setEditingPostId(null);
      setEditingContent('');
    } catch (err) {
      console.error(err);
      setError('Unable to update post');
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to like post');
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                stats: {
                  ...(p.stats || { likes: 0, comments: 0, shares: 0 }),
                  likes: data.likes,
                },
                liked: data.liked,
              }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComments = async (postId: string) => {
    // If already open, just close without refetching
    if (openComments[postId]) {
      setOpenComments((prev) => ({ ...prev, [postId]: false }));
      return;
    }

    // Ensure comments are loaded at least once
    if (!postComments[postId]) {
      try {
        const res = await fetch(`/api/posts/comments?postId=${postId}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          console.error(data.error || 'Unable to load comments');
          return;
        }
        setPostComments((prev) => ({ ...prev, [postId]: data.comments ?? [] }));
      } catch (err) {
        console.error(err);
      }
    }

    setOpenComments((prev) => ({ ...prev, [postId]: true }));
  };

  const addComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ postId, content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Unable to add comment');
        return;
      }

      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), data.comment],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, stats: { ...(p.stats || { likes: 0, comments: 0, shares: 0 }), comments: (p.stats?.comments ?? 0) + 1 } }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const composerDisabled = !profile || posting || uploadingImage;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar>
                <AvatarImage src={profile?.avatarUrl} />
                <AvatarFallback>{profile?.name?.[0] ?? 'N'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {!profile ? (
                  <div className="text-sm text-slate-500">
                    Complete your profile before sharing your first post.
                  </div>
                ) : (
                  <>
                <Textarea
                  placeholder="What's on your mind?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[80px] resize-none border-slate-200 focus:border-blue-500 transition-colors"
                      disabled={posting}
                />
                    {postImageUrl && (
                      <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
                        <img src={postImageUrl} alt="Selected" className="w-full object-cover" />
                      </div>
                    )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-blue-600"
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
                        <Button variant="ghost" size="sm" className="text-slate-600" disabled>
                      <Smile className="w-4 h-4 mr-2" />
                      Emoji
                    </Button>
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
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {loadingPosts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center text-slate-500">
              No posts yet. Be the first to share something!
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => {
            const commentsForPost = postComments[post._id] ?? [];
            const commentValue = commentInputs[post._id] ?? '';
            return (
            <Card key={post._id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-3">
                  <Avatar>
                      <AvatarImage src={post.author.avatarUrl} />
                      <AvatarFallback>{post.author.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                      <p className="font-semibold text-slate-900">{post.author.name}</p>
                      <p className="text-sm text-slate-500">
                        {post.author.username} · {new Date(post.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {currentUserId && currentUserId === post.userId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditing(post)} className="flex items-center gap-2">
                          <Pencil className="w-4 h-4 text-slate-500" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 flex items-center gap-2"
                          onClick={() => setDeleteTarget(post)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
              </div>

                {editingPostId === post._id ? (
                  <div className="mb-4 space-y-2">
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={cancelEditing}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-cyan-600"
                        onClick={() => saveEdit(post)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  post.content && <p className="text-slate-700 mb-4 leading-relaxed">{post.content}</p>
                )}

                {post.imageUrl && (
                <div className="rounded-xl overflow-hidden mb-4">
                    <img src={post.imageUrl} alt="Post content" className="w-full object-cover" />
                </div>
              )}

              <Separator className="mb-4" />

              <div className="flex items-center justify-between text-slate-600">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => toggleLike(post._id)}
                >
                  <Heart
                    className="w-5 h-5 mr-2"
                    fill={post.liked ? '#fb7185' : 'none'}
                  />
                  {post.stats?.likes ?? 0}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => handleToggleComments(post._id)}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {post.stats?.comments ?? 0}
                </Button>
                <Button variant="ghost" size="sm" className="hover:text-green-600 hover:bg-green-50">
                  <Share2 className="w-5 h-5 mr-2" />
                  {post.stats?.shares ?? 0}
                </Button>
                <Button variant="ghost" size="icon" className="hover:text-amber-600 hover:bg-amber-50">
                  <Bookmark className="w-5 h-5" />
                </Button>
              </div>
              {openComments[post._id] && commentsForPost.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
                  {commentsForPost.map((c) => (
                    <div key={c.id} className="text-slate-700">
                      <span className="font-semibold">{c.author.name}</span>{' '}
                      <span className="text-slate-500 text-xs">{c.author.username}</span>
                      <div>{c.content}</div>
                    </div>
                  ))}
                </div>
              )}
              {openComments[post._id] && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={commentValue}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [post._id]: e.target.value,
                      }))
                    }
                    placeholder="Add a comment..."
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3 bg-gradient-to-r from-blue-600 to-cyan-600"
                    onClick={() => addComment(post._id)}
                  >
                    Post
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          )})
        )}
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The post and any attached image will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && handleDeletePost(deleteTarget._id)}
            >
              Delete post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
