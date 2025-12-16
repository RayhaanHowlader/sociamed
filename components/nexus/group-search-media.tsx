'use client';

import { useState, useEffect } from 'react';
import { Search, X, Image, FileText, Mic, Video, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface GroupMessage {
  id: string;
  groupId: string;
  fromUserId: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  isImage?: boolean;
  createdAt: string;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  fileName?: string;
  mimeType?: string;
  createdAt: string;
  fromUserId: string;
  message: GroupMessage;
}

interface GroupSearchMediaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currentUserId: string;
  groupName: string;
  groupMembers: Array<{
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  }>;
  onMessageClick?: (messageId: string) => void;
  onImageClick?: (url: string) => void;
}

export function GroupSearchMedia({ 
  open, 
  onOpenChange, 
  groupId, 
  currentUserId, 
  groupName, 
  groupMembers,
  onMessageClick,
  onImageClick 
}: GroupSearchMediaProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupMessage[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');

  // Load media items when dialog opens
  useEffect(() => {
    if (open && groupId) {
      loadMediaItems();
    }
  }, [open, groupId]);

  const loadMediaItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/media?groupId=${groupId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (res.ok) {
        const items: MediaItem[] = data.messages
          .filter((msg: GroupMessage) => msg.fileUrl)
          .map((msg: GroupMessage) => {
            let type: 'image' | 'video' | 'audio' | 'file' = 'file';
            
            if (msg.isImage) {
              type = 'image';
            } else if (msg.mimeType) {
              if (msg.mimeType.startsWith('video/')) type = 'video';
              else if (msg.mimeType.startsWith('audio/')) type = 'audio';
            } else if (msg.fileName) {
              const ext = msg.fileName.toLowerCase();
              if (/\.(jpg|jpeg|png|gif|webp)$/i.test(ext)) type = 'image';
              else if (/\.(mp4|webm|ogg|mov|avi)$/i.test(ext)) type = 'video';
              else if (/\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(ext)) type = 'audio';
            }

            return {
              id: msg.id,
              type,
              url: msg.fileUrl!,
              fileName: msg.fileName,
              mimeType: msg.mimeType,
              createdAt: msg.createdAt,
              fromUserId: msg.fromUserId,
              message: msg,
            };
          });
        
        setMediaItems(items);
      }
    } catch (err) {
      console.error('Failed to load media items:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchMessages = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/groups/search?groupId=${groupId}&query=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (res.ok) {
        setSearchResults(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to search messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMessages();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const getMemberInfo = (userId: string) => {
    return groupMembers.find(m => m.id === userId);
  };

  const groupedMedia = mediaItems.reduce((acc, item) => {
    const date = formatDate(item.createdAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, MediaItem[]>);

  const mediaByType = {
    images: mediaItems.filter(item => item.type === 'image'),
    videos: mediaItems.filter(item => item.type === 'video'),
    audio: mediaItems.filter(item => item.type === 'audio'),
    files: mediaItems.filter(item => item.type === 'file'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] max-h-[700px] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Search Group Media</DialogTitle>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 h-full">
          <TabsList className="mx-3 md:mx-4 mt-3 md:mt-4 grid w-auto grid-cols-2 h-8 md:h-9">
            <TabsTrigger value="search" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Search className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden xs:inline">Search</span>
              <span className="xs:hidden">🔍</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Image className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden xs:inline">Media</span>
              <span className="xs:hidden">📁</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 px-3 md:px-4 pt-2 pb-3 md:pb-4 min-h-0">
            <div className="space-y-2 md:space-y-3 h-full flex flex-col">
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search group messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 md:h-10 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="pr-2">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="text-sm text-slate-500">Searching...</div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2 md:space-y-3">
                      {searchResults.map((message) => {
                        const isMine = message.fromUserId === currentUserId;
                        const memberInfo = getMemberInfo(message.fromUserId);
                        const displayName = isMine ? 'You' : (memberInfo?.name || 'Member');
                        const avatarUrl = isMine ? undefined : memberInfo?.avatarUrl;
                        
                        return (
                          <div
                            key={message.id}
                            className="p-2 md:p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => onMessageClick?.(message.id)}
                          >
                            <div className="flex items-start gap-2 md:gap-3">
                              <Avatar className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback className="text-xs">
                                  {displayName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium truncate">
                                    {displayName}
                                  </span>
                                  <span className="text-xs text-slate-500 flex-shrink-0">
                                    {formatDate(message.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs md:text-sm text-slate-700 break-words">
                                  {highlightText(message.content, searchQuery)}
                                </p>
                                {message.fileUrl && (
                                  <div className="mt-1 md:mt-2 text-xs text-slate-500 flex items-center gap-1">
                                    {message.isImage ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                    <span className="truncate">{message.fileName || 'Attachment'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : searchQuery ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Search className="w-8 h-8 md:w-12 md:h-12 text-slate-300 mb-2 md:mb-3" />
                      <p className="text-xs md:text-sm text-slate-500 px-4">No messages found for "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Search className="w-8 h-8 md:w-12 md:h-12 text-slate-300 mb-2 md:mb-3" />
                      <p className="text-xs md:text-sm text-slate-500">Type to search group messages</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="media" className="flex-1 px-3 md:px-4 pt-2 pb-3 md:pb-4 min-h-0">
            <Tabs defaultValue="all" className="space-y-2 md:space-y-3 h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-8 md:h-9 flex-shrink-0">
                <TabsTrigger value="all" className="text-xs md:text-sm px-1 md:px-2">
                  <span className="hidden md:inline">All ({mediaItems.length})</span>
                  <span className="md:hidden">All</span>
                </TabsTrigger>
                <TabsTrigger value="images" className="text-xs md:text-sm px-1 md:px-2">
                  <span className="hidden md:inline">Images ({mediaByType.images.length})</span>
                  <span className="md:hidden">📷</span>
                </TabsTrigger>
                <TabsTrigger value="videos" className="text-xs md:text-sm px-1 md:px-2">
                  <span className="hidden md:inline">Videos ({mediaByType.videos.length})</span>
                  <span className="md:hidden">🎥</span>
                </TabsTrigger>
                <TabsTrigger value="audio" className="text-xs md:text-sm px-1 md:px-2 hidden md:flex">
                  Audio ({mediaByType.audio.length})
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs md:text-sm px-1 md:px-2 hidden md:flex">
                  Files ({mediaByType.files.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 min-h-0">
                <div className="pr-2">
                  <TabsContent value="all" className="mt-0">
                    {Object.entries(groupedMedia).length > 0 ? (
                      Object.entries(groupedMedia).map(([date, items]) => (
                        <div key={date} className="mb-4 md:mb-6">
                          <h3 className="text-xs md:text-sm font-medium text-slate-700 mb-2 md:mb-3 flex items-center gap-1 md:gap-2">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                            {date}
                          </h3>
                          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                            {items.map((item) => (
                              <MediaItemCard key={item.id} item={item} onImageClick={onImageClick} />
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Image className="w-8 h-8 md:w-12 md:h-12 text-slate-300 mb-2 md:mb-3" />
                        <p className="text-xs md:text-sm text-slate-500">No media files found</p>
                      </div>
                    )}
                  </TabsContent>

                  {(['images', 'videos', 'audio', 'files'] as const).map((type) => (
                    <TabsContent key={type} value={type} className="mt-0">
                      {mediaByType[type].length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                          {mediaByType[type].map((item) => (
                            <MediaItemCard key={item.id} item={item} onImageClick={onImageClick} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="text-slate-300 mb-2 md:mb-3">
                            {type === 'images' && <Image className="w-8 h-8 md:w-12 md:h-12" />}
                            {type === 'videos' && <Video className="w-8 h-8 md:w-12 md:h-12" />}
                            {type === 'audio' && <Mic className="w-8 h-8 md:w-12 md:h-12" />}
                            {type === 'files' && <FileText className="w-8 h-8 md:w-12 md:h-12" />}
                          </div>
                          <p className="text-xs md:text-sm text-slate-500">No {type} found</p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </div>
              </ScrollArea>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MediaItemCard({ item, onImageClick }: { item: MediaItem; onImageClick?: (url: string) => void }) {
  const getIcon = () => {
    switch (item.type) {
      case 'image': return <Image className="w-3 h-3 md:w-4 md:h-4" />;
      case 'video': return <Video className="w-3 h-3 md:w-4 md:h-4" />;
      case 'audio': return <Mic className="w-3 h-3 md:w-4 md:h-4" />;
      default: return <FileText className="w-3 h-3 md:w-4 md:h-4" />;
    }
  };

  const handleClick = () => {
    if (item.type === 'image') {
      onImageClick?.(item.url);
    } else {
      // For other file types, open in new tab
      window.open(item.url, '_blank');
    }
  };

  const formatFileName = (fileName: string) => {
    if (fileName.length <= 12) return fileName;
    const ext = fileName.split('.').pop();
    const name = fileName.substring(0, fileName.lastIndexOf('.'));
    return `${name.substring(0, 8)}...${ext ? `.${ext}` : ''}`;
  };

  return (
    <div
      className="aspect-square border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 group bg-white"
      onClick={handleClick}
    >
      {item.type === 'image' ? (
        <div className="relative w-full h-full">
          <img
            src={item.url}
            alt={item.fileName || 'Image'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
        </div>
      ) : (
        <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-2 md:p-3 group-hover:bg-slate-100 transition-colors">
          <div className="text-slate-600 mb-1 md:mb-2 group-hover:text-slate-700 transition-colors">
            {getIcon()}
          </div>
          <p className="text-xs text-slate-600 text-center w-full leading-tight group-hover:text-slate-700 transition-colors">
            {formatFileName(item.fileName || 'File')}
          </p>
          <div className="mt-1 md:mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Download className="w-2 h-2 md:w-3 md:h-3" />
              <span className="hidden md:inline">Open</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}