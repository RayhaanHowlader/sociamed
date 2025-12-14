'use client';

import { useEffect, useState } from 'react';
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  Edit,
  Settings,
  Camera,
  Loader2,
  PlusCircle,
  Heart,
  MessageCircle,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { UnfriendModal } from './unfriend-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ProfileShortCard } from './profile-short-card';

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

interface UserPost {
  id: string;
  content: string;
  imageUrl: string;
  createdAt: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  liked?: boolean;
}

interface UserShort {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  createdAt: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  liked?: boolean;
}

interface LikedPost {
  _id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  userId: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  liked: boolean;
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

const DEFAULT_PROFILE: ProfileRecord = {
  name: '',
  username: '',
  bio: '',
  location: '',
  website: '',
  avatarUrl: '',
  coverUrl: '',
};

interface ProfileProps {
  userId?: string;
}

export function Profile({ userId }: ProfileProps = {}) {
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [viewedUserId, setViewedUserId] = useState<string | null>(userId || null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'avatar' | 'cover' | null>(null);
  const [error, setError] = useState('');
  
  // Posts state
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  
  // Shorts state
  const [shorts, setShorts] = useState<UserShort[]>([]);
  const [loadingShorts, setLoadingShorts] = useState(false);
  const [hasMoreShorts, setHasMoreShorts] = useState(false);
  const [loadingMoreShorts, setLoadingMoreShorts] = useState(false);
  
  // Likes state
  const [likedPosts, setLikedPosts] = useState<LikedPost[]>([]);
  const [likedShorts, setLikedShorts] = useState<UserShort[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [hasMoreLikedPosts, setHasMoreLikedPosts] = useState(false);
  const [hasMoreLikedShorts, setHasMoreLikedShorts] = useState(false);
  const [loadingMoreLikes, setLoadingMoreLikes] = useState(false);
  
  // Other state
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [postComments, setPostComments] = useState<Record<string, PostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isFriend, setIsFriend] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unfriendModalOpen, setUnfriendModalOpen] = useState(false);
  const [unfriending, setUnfriending] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const url = viewedUserId 
        ? `/api/profile?userId=${viewedUserId}` 
        : '/api/profile';
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 401 || res.status === 404) {
        setProfile(null);
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
      setIsOwnProfile(data.isOwnProfile ?? false);
      if (viewedUserId && !data.isOwnProfile) {
        setViewedUserId(viewedUserId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && userId !== viewedUserId) {
      setViewedUserId(userId);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [viewedUserId]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.user?.sub) {
          setCurrentUserId(String(data.user.sub));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const checkFriendship = async () => {
      if (!viewedUserId || !currentUserId || isOwnProfile) {
        setIsFriend(false);
        return;
      }

      try {
        const res = await fetch('/api/friends/list', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          const friends = data.friends || [];
          const friend = friends.find((f: any) => f.userId === viewedUserId);
          setIsFriend(!!friend);
        }
      } catch (err) {
        console.error(err);
        setIsFriend(false);
      }
    };

    checkFriendship();
  }, [viewedUserId, currentUserId, isOwnProfile]);

  // Fetch initial posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoadingPosts(true);
        const url = viewedUserId 
          ? `/api/posts/user?userId=${viewedUserId}&limit=5` 
          : '/api/posts/user?limit=5';

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {

          setPosts([]);
          setHasMorePosts(false);
          return;
        }
        const data = await res.json();

        setPosts(data.posts ?? []);
        setHasMorePosts(data.hasMore ?? false);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setPosts([]);
        setHasMorePosts(false);
      } finally {
        setLoadingPosts(false);
      }
    };

    // Always fetch posts - if viewedUserId is null, it means current user's own profile
    fetchPosts();
  }, [viewedUserId]);

  useEffect(() => {
    const fetchFriendCounts = async () => {
      try {
        const res = await fetch('/api/friends/counts', { credentials: 'include' });
        if (!res.ok) {
          setFollowers(0);
          setFollowing(0);
          return;
        }
        const data = await res.json();
        setFollowers(data.followers ?? 0);
        setFollowing(data.following ?? 0);
      } catch (err) {
        console.error(err);
        setFollowers(0);
        setFollowing(0);
      }
    };

    fetchFriendCounts();
  }, []);

  // Fetch initial shorts when Shorts tab is activated
  const fetchShorts = async () => {
    if (shorts.length > 0) return; // Already loaded
    
    try {
      setLoadingShorts(true);
      const url = viewedUserId 
        ? `/api/shorts/user?userId=${viewedUserId}&limit=5` 
        : '/api/shorts/user?limit=5';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        setShorts([]);
        setHasMoreShorts(false);
        return;
      }
      const data = await res.json();
      setShorts(data.shorts ?? []);
      setHasMoreShorts(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
      setShorts([]);
      setHasMoreShorts(false);
    } finally {
      setLoadingShorts(false);
    }
  };

  // Fetch initial liked content when Likes tab is activated
  const fetchLikedContent = async () => {
    if (likedPosts.length > 0 || likedShorts.length > 0) return; // Already loaded
    
    try {
      setLoadingLikes(true);
      
      // Fetch liked posts and shorts in parallel
      const [postsRes, shortsRes] = await Promise.all([
        fetch(viewedUserId 
          ? `/api/posts/liked?userId=${viewedUserId}&limit=3` 
          : '/api/posts/liked?limit=3', 
          { credentials: 'include' }
        ),
        fetch(viewedUserId 
          ? `/api/shorts/liked?userId=${viewedUserId}&limit=2` 
          : '/api/shorts/liked?limit=2', 
          { credentials: 'include' }
        )
      ]);

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setLikedPosts(postsData.posts ?? []);
        setHasMoreLikedPosts(postsData.hasMore ?? false);
      }

      if (shortsRes.ok) {
        const shortsData = await shortsRes.json();
        setLikedShorts(shortsData.shorts ?? []);
        setHasMoreLikedShorts(shortsData.hasMore ?? false);
      }
    } catch (err) {
      console.error(err);
      setLikedPosts([]);
      setLikedShorts([]);
      setHasMoreLikedPosts(false);
      setHasMoreLikedShorts(false);
    } finally {
      setLoadingLikes(false);
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
      if (!res.ok) return;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                stats: { ...p.stats, likes: data.likes },
                liked: data.liked,
              }
            : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const loadComments = async (postId: string) => {
    if (postComments[postId]) return;
    try {
      const res = await fetch(`/api/posts/comments?postId=${postId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) return;
      setPostComments((prev) => ({ ...prev, [postId]: data.comments ?? [] }));
    } catch (err) {
      console.error(err);
    }
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
      if (!res.ok) return;

      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), data.comment],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, stats: { ...p.stats, comments: p.stats.comments + 1 } } : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Load more functions
  const loadMorePosts = async () => {
    if (loadingMorePosts || !hasMorePosts) return;
    
    const oldestPost = posts[posts.length - 1];
    if (!oldestPost) return;

    setLoadingMorePosts(true);
    try {
      const url = viewedUserId 
        ? `/api/posts/user?userId=${viewedUserId}&limit=5&after=${oldestPost.createdAt}` 
        : `/api/posts/user?limit=5&after=${oldestPost.createdAt}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return;
      
      const data = await res.json();
      setPosts(prev => [...prev, ...(data.posts ?? [])]);
      setHasMorePosts(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMorePosts(false);
    }
  };

  const loadMoreShorts = async () => {
    if (loadingMoreShorts || !hasMoreShorts) return;
    
    const oldestShort = shorts[shorts.length - 1];
    if (!oldestShort) return;

    setLoadingMoreShorts(true);
    try {
      const url = viewedUserId 
        ? `/api/shorts/user?userId=${viewedUserId}&limit=5&after=${oldestShort.createdAt}` 
        : `/api/shorts/user?limit=5&after=${oldestShort.createdAt}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return;
      
      const data = await res.json();
      setShorts(prev => [...prev, ...(data.shorts ?? [])]);
      setHasMoreShorts(data.hasMore ?? false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMoreShorts(false);
    }
  };

  const loadMoreLikedContent = async () => {
    if (loadingMoreLikes || (!hasMoreLikedPosts && !hasMoreLikedShorts)) return;

    setLoadingMoreLikes(true);
    try {
      const promises = [];
      
      // Load more liked posts if available
      if (hasMoreLikedPosts && likedPosts.length > 0) {
        const oldestPost = likedPosts[likedPosts.length - 1];
        const postsPromise = fetch(viewedUserId 
          ? `/api/posts/liked?userId=${viewedUserId}&limit=3&after=${oldestPost.createdAt}` 
          : `/api/posts/liked?limit=3&after=${oldestPost.createdAt}`, 
          { credentials: 'include' }
        );
        promises.push(postsPromise);
      }

      // Load more liked shorts if available
      if (hasMoreLikedShorts && likedShorts.length > 0) {
        const oldestShort = likedShorts[likedShorts.length - 1];
        const shortsPromise = fetch(viewedUserId 
          ? `/api/shorts/liked?userId=${viewedUserId}&limit=2&after=${oldestShort.createdAt}` 
          : `/api/shorts/liked?limit=2&after=${oldestShort.createdAt}`, 
          { credentials: 'include' }
        );
        promises.push(shortsPromise);
      }

      const results = await Promise.all(promises);
      
      // Process results
      let postsIndex = 0;
      if (hasMoreLikedPosts && likedPosts.length > 0) {
        const postsRes = results[postsIndex];
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setLikedPosts(prev => [...prev, ...(postsData.posts ?? [])]);
          setHasMoreLikedPosts(postsData.hasMore ?? false);
        }
        postsIndex++;
      }

      if (hasMoreLikedShorts && likedShorts.length > 0) {
        const shortsRes = results[postsIndex];
        if (shortsRes.ok) {
          const shortsData = await shortsRes.json();
          setLikedShorts(prev => [...prev, ...(shortsData.shorts ?? [])]);
          setHasMoreLikedShorts(shortsData.hasMore ?? false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMoreLikes(false);
    }
  };

  const openDialog = () => {
    setError('');
    setFormData(profile ?? DEFAULT_PROFILE);
    setDialogOpen(true);
  };

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

      setProfile(data.profile);
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      setError('Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  const joinedLabel = profile?.createdAt
    ? `Joined ${format(new Date(profile.createdAt), 'MMMM yyyy')}`
    : 'Joined recently';

  return (
    <ScrollArea className="h-full bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-blue-600" />
          </div>
        ) : profile ? (
          <>
            <div className="relative">
              <div className="h-64 bg-gradient-to-r from-blue-600 to-cyan-600 relative">
                {profile.coverUrl ? (
                  <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/80 text-sm uppercase tracking-[0.3em]">
                    Cover image
                  </div>
                )}
              </div>

              <div className="px-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 mb-4">
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                      <AvatarImage src={profile.avatarUrl} />
                      <AvatarFallback className="text-3xl">
                        {profile.name ? profile.name[0] : 'N'}
                      </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                      <Button
                        size="icon"
                        className="absolute bottom-2 right-2 w-8 h-8 bg-white hover:bg-slate-100 text-slate-900 shadow-lg"
                        onClick={openDialog}
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {isOwnProfile && (
                    <div className="flex gap-2 mt-4 sm:mt-0">
                      <Button variant="outline" className="border-slate-300" onClick={openDialog}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button variant="outline" size="icon" className="border-slate-300">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {!isOwnProfile && (
                    <div className="flex gap-2 mt-4 sm:mt-0">
                      {isFriend ? (
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setUnfriendModalOpen(true)}
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Unfriend
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          onClick={async () => {
                            if (!viewedUserId) return;
                            try {
                              const res = await fetch('/api/friends/request', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ toUserId: viewedUserId }),
                              });
                              if (res.ok) {
                                alert('Friend request sent!');
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Friend
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
                    <p className="text-slate-600">{profile.username}</p>
                  </div>

                  {profile.bio && <p className="text-slate-700">{profile.bio}</p>}

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {profile.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center gap-1">
                        <LinkIcon className="w-4 h-4" />
                        <a
                          href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{joinedLabel}</span>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <button className="hover:underline">
                      <span className="font-bold text-slate-900">{posts.length}</span>
                      <span className="text-slate-600 ml-1">Posts</span>
                    </button>
                    <button className="hover:underline">
                      <span className="font-bold text-slate-900">{followers}</span>
                      <span className="text-slate-600 ml-1">Followers</span>
                    </button>
                    <button className="hover:underline">
                      <span className="font-bold text-slate-900">{following}</span>
                      <span className="text-slate-600 ml-1">Following</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3 mb-6">
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="shorts" onClick={fetchShorts}>Shorts</TabsTrigger>
                  <TabsTrigger value="likes" onClick={fetchLikedContent}>Likes</TabsTrigger>
                </TabsList>

                <TabsContent value="posts">
                  {loadingPosts ? (
                    <div className="text-center py-12 text-slate-500">
                      Loading your posts...
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      Your posts will appear here.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => {
                        const commentsForPost = postComments[post.id] ?? [];
                        const commentValue = commentInputs[post.id] ?? '';
                        return (
                          <Card
                            key={post.id}
                            className="border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <CardContent className="p-5 space-y-3">
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {post.content}
                              </p>
                              {post.imageUrl && (
                                <div className="rounded-xl overflow-hidden border border-slate-100">
                                  <img
                                    src={post.imageUrl}
                                    alt="Post"
                                    className="w-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                <span>
                                  {new Date(post.createdAt).toLocaleString(undefined, {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span>
                                  {post.stats.likes} likes · {post.stats.comments} comments
                                </span>
                              </div>

                              <div className="flex items-center gap-4 pt-2 text-sm">
                                <button
                                  type="button"
                                  onClick={() => toggleLike(post.id)}
                                  className="inline-flex items-center gap-1 text-slate-600 hover:text-rose-600"
                                >
                                  <Heart
                                    className="w-4 h-4"
                                    fill={post.liked ? '#fb7185' : 'none'}
                                  />
                                  <span>{post.liked ? 'Liked' : 'Like'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => loadComments(post.id)}
                                  className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span>Comments</span>
                                </button>
                              </div>

                              {commentsForPost.length > 0 && (
                                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                  {commentsForPost.map((c) => (
                                    <div key={c.id} className="text-xs text-slate-700">
                                      <span className="font-semibold">{c.author.name}</span>{' '}
                                      <span className="text-slate-500">{c.author.username}</span>
                                      <div>{c.content}</div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {postComments[post.id] && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Input
                                    value={commentValue}
                                    onChange={(e) =>
                                      setCommentInputs((prev) => ({
                                        ...prev,
                                        [post.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Add a comment..."
                                    className="h-8 text-xs"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 px-3 bg-gradient-to-r from-blue-600 to-cyan-600"
                                    onClick={() => addComment(post.id)}
                                  >
                                    Post
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {/* Load more posts button */}
                      {hasMorePosts && (
                        <div className="flex justify-center py-4">
                          <Button
                            variant="outline"
                            onClick={loadMorePosts}
                            disabled={loadingMorePosts}
                            className="text-sm"
                          >
                            {loadingMorePosts ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Load more posts
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="shorts">
                  {loadingShorts ? (
                    <div className="text-center py-12 text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading your shorts...
                    </div>
                  ) : shorts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      Your shorts will appear here.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {shorts.map((short) => (
                          <ProfileShortCard
                            key={short.id}
                            short={short}
                            isOwnProfile={isOwnProfile}
                            onView={(shortId) => {
                              // Open short viewer modal
                              window.dispatchEvent(new CustomEvent('view-short', { 
                                detail: { shortId } 
                              }));
                            }}
                            onEdit={(short) => {
                              // Handle edit - could open edit modal
                              console.log('Edit short:', short);
                            }}
                            onDelete={(shortId) => {
                              // Handle delete - could show confirmation dialog
                              console.log('Delete short:', shortId);
                            }}
                          />
                        ))}
                      </div>
                      
                      {/* Load more shorts button */}
                      {hasMoreShorts && (
                        <div className="flex justify-center py-4">
                          <Button
                            variant="outline"
                            onClick={loadMoreShorts}
                            disabled={loadingMoreShorts}
                            className="text-sm"
                          >
                            {loadingMoreShorts ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Load more shorts
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="likes">
                  {loadingLikes ? (
                    <div className="text-center py-12 text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading liked content...
                    </div>
                  ) : likedPosts.length === 0 && likedShorts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      Liked posts and shorts will appear here.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Liked Posts Section */}
                      {likedPosts.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Liked Posts</h3>
                          <div className="space-y-4">
                            {likedPosts.map((post) => (
                              <Card
                                key={post._id}
                                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => {
                                  // Navigate to original post
                                  window.dispatchEvent(new CustomEvent('highlight-post', { 
                                    detail: { postId: post._id } 
                                  }));
                                }}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3 mb-3">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={post.author.avatarUrl} />
                                      <AvatarFallback>{post.author.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm text-slate-900">{post.author.name}</p>
                                      <p className="text-xs text-slate-500">{post.author.username}</p>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                      {new Date(post.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  
                                  <p className="text-sm text-slate-700 mb-3 line-clamp-3">{post.content}</p>
                                  
                                  {post.imageUrl && (
                                    <div className="rounded-lg overflow-hidden mb-3">
                                      <img
                                        src={post.imageUrl}
                                        alt="Post content"
                                        className="w-full h-32 object-cover"
                                      />
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span>{post.stats.likes} likes</span>
                                    <span>{post.stats.comments} comments</span>
                                    <span>{post.stats.shares} shares</span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Liked Shorts Section */}
                      {likedShorts.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Liked Shorts</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {likedShorts.map((short) => (
                              <ProfileShortCard
                                key={short.id}
                                short={short}
                                isOwnProfile={false}
                                onView={(shortId) => {
                                  // Open short viewer modal
                                  window.dispatchEvent(new CustomEvent('view-short', { 
                                    detail: { shortId } 
                                  }));
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Load more liked content button */}
                      {(hasMoreLikedPosts || hasMoreLikedShorts) && (
                        <div className="flex justify-center py-4">
                          <Button
                            variant="outline"
                            onClick={loadMoreLikedContent}
                            disabled={loadingMoreLikes}
                            className="text-sm"
                          >
                            {loadingMoreLikes ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Load more liked content
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="px-6 py-16">
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="py-12 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <PlusCircle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">
                    Complete your profile
                  </h2>
                  <p className="text-slate-500 max-w-md">
                    Add your personal details, bio, and images to personalize your Nexus presence.
                  </p>
                </div>
                <Button onClick={openDialog} className="bg-gradient-to-r from-blue-600 to-cyan-600">
                  Start building your profile
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{profile ? 'Edit your profile' : 'Create your profile'}</DialogTitle>
            <DialogDescription>
              This information appears on your public profile. You can update it anytime.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Username</label>
                <Input
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  required
                  placeholder="@yourhandle"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Bio</label>
              <Textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="City, Country"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Website</label>
                <Input
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Avatar</label>
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
                <label className="text-sm font-medium text-slate-600">Cover</label>
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
                  <div className="mt-2 rounded-lg overflow-hidden border">
                    <img src={formData.coverUrl} alt="Cover preview" className="h-24 w-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
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
      
      {profile && viewedUserId && (
        <UnfriendModal
          open={unfriendModalOpen}
          onOpenChange={setUnfriendModalOpen}
          user={{
            id: viewedUserId,
            name: profile.name,
            username: profile.username,
            avatarUrl: profile.avatarUrl,
          }}
          onConfirm={async () => {
            if (!viewedUserId) return;
            try {
              setUnfriending(true);
              const res = await fetch(`/api/friends/${viewedUserId}`, {
                method: 'DELETE',
                credentials: 'include',
              });
              if (res.ok) {
                setIsFriend(false);
                setUnfriendModalOpen(false);
                // Reload page to update groups and feed
                window.location.reload();
              }
            } catch (err) {
              console.error(err);
            } finally {
              setUnfriending(false);
            }
          }}
          unfriending={unfriending}
        />
      )}
    </ScrollArea>
  );
}