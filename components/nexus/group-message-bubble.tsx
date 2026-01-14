'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PollMessage } from './poll-message';

interface GroupMessage {
  id: string;
  groupId: string;
  fromUserId: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  filePublicId?: string;
  isImage?: boolean;
  createdAt: string;
  deleted?: boolean;
  deletedBy?: string;
  pinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  type?: 'text' | 'poll' | 'file';
  pollId?: string;
  poll?: {
    _id: string;
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes: number;
      voters: string[];
    }>;
    allowMultiple: boolean;
    anonymous: boolean;
    createdBy: string;
    createdAt: string;
    expiresAt: string;
    totalVotes: number;
    author: {
      name: string;
      username: string;
      avatarUrl: string;
    };
  };
}

interface GroupMessageBubbleProps {
  message: GroupMessage;
  isMine: boolean;
  displayName: string;
  avatarUrl?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
  ownerId?: string;
  currentUserId?: string;
  onImageClick?: (payload: { url: string; message: GroupMessage }) => void;
  onPinToggle?: (messageId: string, shouldPin: boolean) => void;
  onPollVote?: (pollId: string, optionIds: string[]) => void;
  isAdmin?: boolean;
  isPinnedView?: boolean;
}

export function GroupMessageBubble({ message, isMine, displayName, avatarUrl, selectable, selected, onSelectToggle, ownerId, currentUserId, onImageClick, onPinToggle, onPollVote, isAdmin, isPinnedView }: GroupMessageBubbleProps) {
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

  const deletedLabel =
    message.deleted && message.deletedBy && ownerId && message.deletedBy === ownerId && message.deletedBy !== message.fromUserId
      ? 'Admin deleted this message'
      : 'Message deleted';

  return (
    <div
      className={cn('flex gap-2 md:gap-3', isMine ? 'flex-row-reverse' : 'flex-row', selectable && !message.deleted && 'cursor-pointer')}
      onClick={selectable ? handleSelect : undefined}
    >
      <Avatar className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback>{displayName[0]}</AvatarFallback>
      </Avatar>
      <div className={cn('flex flex-col min-w-0 flex-1', isMine && 'items-end')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {displayName}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{time}</span>
        </div>
        <div
          className={cn(
            'max-w-[85vw] md:max-w-md px-3 md:px-4 py-2 rounded-2xl',
            isMine
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm'
              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm shadow-sm',
            'overflow-visible',
            selectable && !message.deleted && 'ring-1 ring-offset-2 ring-blue-200',
            selectable && !message.deleted && selected && 'ring-blue-500'
          )}
        >
          {selectable && !message.deleted && (
            <div className="flex items-center gap-2 text-xs mb-1">
              <input type="checkbox" checked={!!selected} readOnly className="h-3 w-3" />
              <span className="opacity-80">Select</span>
            </div>
          )}

          {message.deleted && <div className="italic text-sm opacity-80">{deletedLabel}</div>}

          {/* Image Display */}
          {!message.deleted && message.isImage && message.fileUrl && (
            <div className="mb-2 w-full">
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Attachment'}
                className="max-h-48 md:max-h-64 rounded-lg border border-white/10 w-full object-contain cursor-pointer transition-transform hover:scale-[1.015]"
                onClick={() => onImageClick?.({ url: message.fileUrl!, message })}
                style={{ maxWidth: '100%' }}
              />
            </div>
          )}

          {/* Video Display */}
          {!message.deleted && fileType === 'video' && message.fileUrl && (
            <div className="mb-2 w-full">
              <video
                src={message.fileUrl}
                controls
                className="max-h-48 md:max-h-64 rounded-lg border border-white/10 w-full"
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
            <div className="mb-2 p-2 md:p-3 rounded-lg bg-black/10 w-full min-w-0">
              <div className="w-full min-w-0">
                <audio
                  src={message.fileUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full"
                  preload="metadata"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: '200px',
                    height: '32px',
                    outline: 'none',
                  }}
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
              {message.fileName && (
                <p className="text-xs mt-2 opacity-90 truncate w-full min-w-0">
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

          {/* Poll Content */}
          {!message.deleted && message.type === 'poll' && message.poll && currentUserId && (
            <div className="w-full">
              <PollMessage
                key={`poll-${message.poll._id}-${message.poll.totalVotes}`}
                poll={message.poll}
                currentUserId={currentUserId}
                onVote={onPollVote || (() => {})}
                className="w-full"
              />
            </div>
          )}

          {/* Text Content */}
          {!message.deleted && message.content && message.type !== 'poll' && <p className="text-xs md:text-sm break-words">{message.content}</p>}
          
          {/* Pinned Message Indicator */}
          {message.pinned && !isPinnedView && (
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/20">
              <Pin className="w-3 h-3 text-yellow-400" />
              <span className="text-xs opacity-75">Pinned message</span>
            </div>
          )}
        </div>
        
        {/* Pin/Unpin Button for Admins */}
        {isAdmin && !message.deleted && !selectable && (
          <div className="flex items-center mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs opacity-60 hover:opacity-100"
              onClick={() => onPinToggle?.(message.id, !message.pinned)}
              disabled={!/^[a-f\d]{24}$/i.test(message.id)} // Disable for temporary IDs
              title={!/^[a-f\d]{24}$/i.test(message.id) ? "Message is still being saved..." : undefined}
            >
              {message.pinned ? (
                <>
                  <PinOff className="w-3 h-3 mr-1" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="w-3 h-3 mr-1" />
                  Pin
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

