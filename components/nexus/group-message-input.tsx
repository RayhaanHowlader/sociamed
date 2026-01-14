'use client';

import { useRef } from 'react';
import { Send, Paperclip, Smile, Mic, AlertCircle, X, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilePreview } from './file-preview';
import { UploadProgress } from './upload-progress';
import { EmojiPicker } from './emoji-picker';
import { VoiceInput } from './voice-input';

interface Group {
  _id: string;
  name: string;
  icon: string;
  memberIds: string[];
  lastMessage?: string;
  lastActivityAt?: string;
  isPrivate?: boolean;
  ownerId?: string;
  allowMemberEdit?: boolean;
  allowMemberInvite?: boolean;
}

interface GroupMessageInputProps {
  selectedGroup: Group | null;
  message: string;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onSendPreview: () => void;
  filePreview: { url: string; type: 'image' | 'video' | 'audio'; file: File } | null;
  onFileChange: (file: File) => void;
  onCancelPreview: () => void;
  uploadProgress: number;
  uploadingFile: boolean;
  uploadError: string;
  onClearUploadError: () => void;
  onEmojiSelect: (emoji: string) => void;
  onVoiceTextReceived: (text: string) => void;
  onVoiceMessageSent: (audioBlob: Blob, duration: number) => void;
  onCreatePoll: () => void;
}

export function GroupMessageInput({
  selectedGroup,
  message,
  onMessageChange,
  onSendMessage,
  onSendPreview,
  filePreview,
  onFileChange,
  onCancelPreview,
  uploadProgress,
  uploadingFile,
  uploadError,
  onClearUploadError,
  onEmojiSelect,
  onVoiceTextReceived,
  onVoiceMessageSent,
  onCreatePoll
}: GroupMessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (filePreview) {
        onSendPreview();
      } else {
        onSendMessage();
      }
    }
  };

  const handleSendClick = () => {
    if (filePreview) {
      onSendPreview();
    } else {
      onSendMessage();
    }
  };

  return (
    <div className="p-2 md:p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
      <div className="max-w-3xl mx-auto space-y-2 md:space-y-3">
        {/* File Preview */}
        {filePreview && (
          <FilePreview preview={filePreview} onCancel={onCancelPreview} />
        )}

        {/* Upload Progress Bar */}
        <UploadProgress progress={uploadProgress} isUploading={uploadingFile} />

        {/* Error Message */}
        {uploadError && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            <AlertCircle className="w-4 h-4" />
            {uploadError}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-auto p-1"
              onClick={onClearUploadError}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-1 md:gap-2">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileChange(file);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 h-8 w-8 md:h-10 md:w-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedGroup || uploadingFile}
            >
              <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
          <EmojiPicker onEmojiSelect={onEmojiSelect}>
            <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 h-8 w-8 md:h-10 md:w-10">
              <Smile className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </EmojiPicker>
          <VoiceInput 
            onTextReceived={onVoiceTextReceived}
            onVoiceMessageSent={onVoiceMessageSent}
          >
            <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 h-8 w-8 md:h-10 md:w-10">
              <Mic className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </VoiceInput>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 h-8 w-8 md:h-10 md:w-10"
            onClick={onCreatePoll}
            disabled={!selectedGroup || uploadingFile}
            title="Create Poll"
          >
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Input
            placeholder={selectedGroup ? 'Type a message...' : 'Select a group to start chatting'}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            className="flex-1 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm h-8 md:h-10"
            disabled={!selectedGroup || uploadingFile}
            onKeyDown={handleKeyDown}
          />
          <Button
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-8 w-8 md:h-10 md:w-10 md:px-4"
            disabled={!selectedGroup || uploadingFile}
            onClick={handleSendClick}
          >
            <Send className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}