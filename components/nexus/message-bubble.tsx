'use client';

import { Check, CheckCheck, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  isImage?: boolean;
  createdAt: string;
  status?: 'sent' | 'seen';
  deleted?: boolean;
  type?: string;
  sharedPostId?: string;
  sharedPostData?: {
    content: string;
    imageUrl?: string;
    author: {
      userId: string;
      name: string;
      username: string;
      avatarUrl?: string;
    };
    createdAt: string;
  };
  sharedShort?: {
    _id: string;
    caption: string;
    videoUrl: string;
    duration: number;
    author: {
      name: string;
      username: string;
      avatarUrl?: string;
    };
    createdAt: string;
  };
  sharedBy?: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
}

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  currentUserId: string;
  selected?: boolean;
  selectable?: boolean;
  onSelectToggle?: (id: string) => void;
  onImageClick?: (url: string) => void;
  onSharedPostClick?: (postId: string) => void;
  onSharedShortClick?: (short: any) => void;
  onProfileClick?: (userId: string) => void;
}

export function MessageBubble({ message, isMine, currentUserId, selected, selectable, onSelectToggle, onImageClick, onSharedPostClick, onSharedShortClick, onProfileClick }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Determine file type
  const getFileType = () => {
    if (message.isImage) return 'image';
    if (!message.fileUrl) return null;
    
    const fileName = (message.fileName || '').toLowerCase();
    const mimeType = (message.mimeType || '').toLowerCase();
    const fileUrl = message.fileUrl.toLowerCase();
    
    // Check for video
    const hasVideoExtension = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp|mpg|mpeg)$/i.test(fileName) ||
                             /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp|mpg|mpeg)$/i.test(fileUrl);
    const hasVideoMimeType = mimeType.startsWith('video/');
    if (hasVideoMimeType || hasVideoExtension) return 'video';
    
    // Check for audio
    const hasAudioExtension = /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|webm)$/i.test(fileName) ||
                              /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|webm)$/i.test(fileUrl);
    const hasAudioMimeType = mimeType.startsWith('audio/');
    if (hasAudioMimeType || hasAudioExtension) return 'audio';
    
    return 'file';
  };

  const fileType = getFileType();

  const handleSelect = () => {
    if (selectable && !message.deleted && onSelectToggle) {
      onSelectToggle(message.id);
    }
  };

  return (
    <div
      className={cn('flex', isMine ? 'justify-end' : 'justify-start', selectable && !message.deleted && 'cursor-pointer')}
      onClick={selectable ? handleSelect : undefined}
    >
      <div
        className={cn(
          'max-w-md px-4 py-2 rounded-2xl',
          isMine
            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-sm'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm shadow-sm',
          selectable && !message.deleted && 'ring-1 ring-offset-2 ring-blue-200',
          selectable && !message.deleted && selected && 'ring-blue-500',
        )}
      >
        {selectable && !message.deleted && (
          <div className="flex items-center gap-2 text-xs mb-1">
            <input type="checkbox" checked={!!selected} readOnly className="h-3 w-3" />
            <span className="opacity-80">Select</span>
          </div>
        )}

        {message.deleted && (
          <div className="italic text-sm opacity-80">Message deleted</div>
        )}

        {/* Image Display */}
        {!message.deleted && message.isImage && message.fileUrl && (
          <div className="mb-2">
            <img
              src={message.fileUrl}
              alt={message.fileName || 'Attachment'}
              className="max-h-64 rounded-lg border border-white/10 cursor-pointer transition-transform hover:scale-[1.015]"
              onClick={(event) => {
                event.stopPropagation();
                onImageClick?.(message.fileUrl!);
              }}
            />
          </div>
        )}

        {/* Video Display */}
        {!message.deleted && fileType === 'video' && message.fileUrl && (
          <div className="mb-2">
            <video
              src={message.fileUrl}
              controls
              className="max-h-64 rounded-lg border border-white/10 w-full"
              preload="metadata"
              playsInline
              style={{ maxWidth: '100%', height: 'auto' }}
            >
              Your browser does not support the video tag.
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline"
              >
                Download video
              </a>
            </video>
          </div>
        )}

        {/* Audio Display */}
        {!message.deleted && fileType === 'audio' && message.fileUrl && (
          <div className="mb-2 p-3 rounded-lg bg-black/10">
            <div className="flex items-center gap-3">
              <audio
                src={message.fileUrl}
                controls
                className="flex-1"
                preload="metadata"
              >
                Your browser does not support the audio tag.
              </audio>
            </div>
            {message.fileName && (
              <p className="text-xs mt-2 opacity-90 truncate">
                {message.fileName}
              </p>
            )}
          </div>
        )}

        {/* Other File Types */}
        {!message.deleted && fileType === 'file' && message.fileUrl && (
          <div className="mb-2">
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs underline break-all"
            >
              {message.fileName || 'Download file'}
            </a>
          </div>
        )}

        {/* Shared Post Display */}
        {!message.deleted && message.sharedPostData && (
          <div className="mb-2">
            <div 
              className={cn(
                'border rounded-lg p-3 bg-opacity-50 cursor-pointer transition-all hover:shadow-md',
                isMine ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              onClick={(event) => {
                console.log('[MessageBubble] Shared post clicked:', message.sharedPostId);
                event.stopPropagation();
                if (message.sharedPostId && onSharedPostClick) {
                  console.log('[MessageBubble] Calling onSharedPostClick with postId:', message.sharedPostId);
                  onSharedPostClick(message.sharedPostId);
                } else {
                  console.log('[MessageBubble] Missing sharedPostId or onSharedPostClick handler');
                }
              }}
            >
              <div className="flex items-start gap-2 mb-2">
                <div 
                  className="flex items-start gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to the original post author's profile
                    if (message.sharedPostData?.author.userId) {
                      window.dispatchEvent(new CustomEvent('view-profile', { 
                        detail: { userId: message.sharedPostData.author.userId } 
                      }));
                    }
                  }}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={message.sharedPostData.author.avatarUrl} />
                    <AvatarFallback className="text-xs">{message.sharedPostData.author.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-xs font-semibold',
                      isMine ? 'text-white hover:text-blue-100' : 'text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400'
                    )}>
                      {message.sharedPostData.author.name}
                    </p>
                    <p className={cn(
                      'text-xs',
                      isMine ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                    )}>
                      @{message.sharedPostData.author.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'text-xs',
                    isMine ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  )}>
                    View post
                  </span>
                  <ExternalLink className={cn(
                    'w-3 h-3',
                    isMine ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                  )} />
                </div>
              </div>
              
              {message.sharedPostData.content && (
                <p className={cn(
                  'text-xs mb-2',
                  isMine ? 'text-blue-50' : 'text-slate-700 dark:text-slate-300'
                )}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {message.sharedPostData.content}
                </p>
              )}
              
              {message.sharedPostData.imageUrl && (
                <div className="rounded-md overflow-hidden">
                  <img 
                    src={message.sharedPostData.imageUrl} 
                    alt="Shared post content" 
                    className="w-full h-20 object-cover"
                  />
                </div>
              )}
              
              <div className={cn(
                'text-xs mt-2 pt-2 border-t opacity-75',
                isMine ? 'border-white/20 text-blue-100' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              )}>
                Click to view original post
              </div>
            </div>
          </div>
        )}

        {/* Shared Short Display */}
        {!message.deleted && message.sharedShort && (
          <div className="mb-2">
            <div 
              className={cn(
                'p-3 rounded-lg border cursor-pointer transition-colors',
                isMine 
                  ? 'bg-blue-700/50 border-blue-600/50 hover:bg-blue-700/70' 
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-150 dark:hover:bg-slate-800'
              )}
              onClick={() => onSharedShortClick?.(message.sharedShort)}
            >
              <div className="flex items-start gap-3">
                {/* Video Thumbnail */}
                <div className="w-16 h-20 bg-black rounded-lg overflow-hidden flex-shrink-0">
                  <video
                    src={message.sharedShort.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                </div>
                
                {/* Short Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={message.sharedShort.author.avatarUrl} />
                      <AvatarFallback className="text-xs">{message.sharedShort.author.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-xs font-medium truncate',
                        isMine ? 'text-white' : 'text-slate-900 dark:text-white'
                      )}>
                        {message.sharedShort.author.name}
                      </p>
                      <p className={cn(
                        'text-xs truncate',
                        isMine ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      )}>
                        @{message.sharedShort.author.username}
                      </p>
                    </div>
                  </div>
                  
                  {message.sharedShort.caption && (
                    <p className={cn(
                      'text-xs mb-1 line-clamp-2',
                      isMine ? 'text-blue-100' : 'text-slate-700 dark:text-slate-300'
                    )}>
                      {message.sharedShort.caption}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      isMine ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'
                    )}>
                      {Math.floor(message.sharedShort.duration)}s
                    </span>
                    <span className={cn(
                      isMine ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'
                    )}>
                      •
                    </span>
                    <span className={cn(
                      isMine ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'
                    )}>
                      {new Date(message.sharedShort.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Click to view indicator */}
              <div className={cn(
                'flex items-center justify-center gap-1 mt-2 pt-2 border-t text-xs',
                isMine 
                  ? 'border-blue-600/30 text-blue-200' 
                  : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              )}>
                <ExternalLink className="w-3 h-3" />
                <span>Click to view short</span>
              </div>
            </div>
          </div>
        )}

        {/* Text Content */}
        {!message.deleted && message.content && !message.sharedPostData && !message.sharedShort && <p className="text-sm">{message.content}</p>}
        
        {/* Text Content for shared posts (user's message) */}
        {!message.deleted && message.content && message.sharedPostData && (
          <div className="mb-2">
            {/* Extract user's message from the shared content */}
            {(() => {
              const lines = message.content.split('\n');
              const userMessage = lines.find(line => !line.includes('📎 Shared a post') && !line.startsWith('http') && line.trim());
              return userMessage ? <p className="text-sm mb-2">{userMessage}</p> : null;
            })()}
          </div>
        )}

        {/* Text Content for shared shorts (user's message) */}
        {!message.deleted && message.content && message.sharedShort && (
          <div className="mb-2">
            <p className="text-sm">{message.content}</p>
          </div>
        )}

        {/* Timestamp and Status */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <p
            className={cn(
              'text-xs',
              isMine ? 'text-blue-100' : 'text-slate-500',
            )}
          >
            {time}
          </p>
          {isMine && (
            <span className="inline-flex items-center text-xs">
              {message.status === 'seen' ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

