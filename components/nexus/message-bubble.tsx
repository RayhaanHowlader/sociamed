'use client';

import { Check, CheckCheck } from 'lucide-react';
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
}

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  currentUserId: string;
}

export function MessageBubble({ message, isMine, currentUserId }: MessageBubbleProps) {
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
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-md px-4 py-2 rounded-2xl',
          isMine
            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-sm'
            : 'bg-white text-slate-900 rounded-bl-sm shadow-sm',
        )}
      >
        {/* Image Display */}
        {message.isImage && message.fileUrl && (
          <div className="mb-2">
            <img
              src={message.fileUrl}
              alt={message.fileName || 'Attachment'}
              className="max-h-64 rounded-lg border border-white/10"
            />
          </div>
        )}

        {/* Video Display */}
        {fileType === 'video' && message.fileUrl && (
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
        {fileType === 'audio' && message.fileUrl && (
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
        {message.content && <p className="text-sm">{message.content}</p>}

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

