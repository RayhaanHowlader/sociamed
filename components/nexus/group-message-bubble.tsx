'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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

interface GroupMessageBubbleProps {
  message: GroupMessage;
  isMine: boolean;
  displayName: string;
  avatarUrl?: string;
}

export function GroupMessageBubble({ message, isMine, displayName, avatarUrl }: GroupMessageBubbleProps) {
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
    const hasAudioExtension = /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus)$/i.test(fileName) ||
                              /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus)$/i.test(fileUrl);
    const hasAudioMimeType = mimeType.startsWith('audio/');
    if (hasAudioMimeType || hasAudioExtension) return 'audio';
    
    return 'file';
  };

  const fileType = getFileType();

  return (
    <div className={cn('flex gap-2 md:gap-3', isMine ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback>{displayName[0]}</AvatarFallback>
      </Avatar>
      <div className={cn('flex flex-col min-w-0 flex-1', isMine && 'items-end')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-700">
            {displayName}
          </span>
          <span className="text-xs text-slate-500">{time}</span>
        </div>
        <div
          className={cn(
            'max-w-[85vw] md:max-w-md px-3 md:px-4 py-2 rounded-2xl',
            isMine
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm'
              : 'bg-white text-slate-900 rounded-tl-sm shadow-sm',
            'overflow-visible'
          )}
        >
          {/* Image Display */}
          {message.isImage && message.fileUrl && (
            <div className="mb-2 w-full">
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Attachment'}
                className="max-h-48 md:max-h-64 rounded-lg border border-white/10 w-full object-contain"
                style={{ maxWidth: '100%' }}
              />
            </div>
          )}

          {/* Video Display */}
          {fileType === 'video' && message.fileUrl && (
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
          {fileType === 'audio' && message.fileUrl && (
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
          {fileType === 'file' && message.fileUrl && (
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

          {/* Text Content */}
          {message.content && <p className="text-xs md:text-sm break-words">{message.content}</p>}
        </div>
      </div>
    </div>
  );
}

