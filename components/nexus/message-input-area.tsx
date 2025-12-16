'use client';

import { useRef } from 'react';
import { Send, Paperclip, Smile, Mic, AlertCircle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from './emoji-picker';
import { VoiceInput } from './voice-input';
import { FilePreview } from './file-preview';
import { UploadProgress } from './upload-progress';

interface FriendConversation {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface FilePreviewData {
  url: string;
  type: 'image' | 'video' | 'audio';
  file: File;
}

interface MessageInputAreaProps {
  selectedChat: FriendConversation | null;
  message: string;
  uploadingFile: boolean;
  uploadProgress: number;
  filePreview: FilePreviewData | null;
  error: string;
  onMessageChange: (message: string) => void;
  onFileChange: (file: File) => void;
  onEmojiSelect: (emoji: string) => void;
  onVoiceTextReceived: (text: string) => void;
  onVoiceMessageSent: (audioBlob: Blob, duration: number) => void;
  onSend: () => void;
  onSendPreview: () => void;
  onCancelPreview: () => void;
  onClearError: () => void;
}

export function MessageInputArea({
  selectedChat,
  message,
  uploadingFile,
  uploadProgress,
  filePreview,
  error,
  onMessageChange,
  onFileChange,
  onEmojiSelect,
  onVoiceTextReceived,
  onVoiceMessageSent,
  onSend,
  onSendPreview,
  onCancelPreview,
  onClearError,
}: MessageInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (filePreview) {
        onSendPreview();
      } else {
        onSend();
      }
    }
  };

  const handleSendClick = () => {
    if (filePreview) {
      onSendPreview();
    } else {
      onSend();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
  };

  return (
    <div className="p-3 md:p-4 border-t border-slate-200 bg-white">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* File Preview */}
        {filePreview && (
          <FilePreview preview={filePreview} onCancel={onCancelPreview} />
        )}

        {/* Upload Progress Bar */}
        <UploadProgress progress={uploadProgress} isUploading={uploadingFile} />

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="w-4 h-4" />
            {error}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-auto p-1"
              onClick={onClearError}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 hover:text-blue-600"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedChat || uploadingFile}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          </div>
          
          <EmojiPicker onEmojiSelect={onEmojiSelect}>
            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-blue-600">
              <Smile className="w-5 h-5" />
            </Button>
          </EmojiPicker>
          
          <VoiceInput 
            onTextReceived={onVoiceTextReceived}
            onVoiceMessageSent={onVoiceMessageSent}
          >
            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-green-600">
              <Mic className="w-5 h-5" />
            </Button>
          </VoiceInput>
          
          <Input
            placeholder={selectedChat ? 'Type a message...' : 'Select a friend to start chatting'}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            className="flex-1 border-slate-200"
            disabled={!selectedChat || uploadingFile}
            onKeyDown={handleKeyDown}
          />
          
          <Button
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            disabled={!selectedChat || uploadingFile}
            onClick={handleSendClick}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}