'use client';

import { Send, Mic, Image as ImageIcon, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';

interface AIInputAreaProps {
  inputMessage: string;
  isListening: boolean;
  isSending: boolean;
  editingMessageId: string | null;
  onMessageChange: (message: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onVoiceInput: () => void;
  onCancelEdit: () => void;
  selectedImage?: string | null;
  onImageSelect?: (image: string | null) => void;
  onGenerateImage?: (prompt: string) => void;
}

export function AIInputArea({
  inputMessage,
  isListening,
  isSending,
  editingMessageId,
  onMessageChange,
  onSend,
  onKeyDown,
  onVoiceInput,
  onCancelEdit,
  selectedImage,
  onImageSelect,
  onGenerateImage
}: AIInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onImageSelect?.(base64String);
        setUploadingImage(false);
      };
      reader.onerror = () => {
        alert('Failed to read image');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setUploadingImage(false);
    }

    // Reset input
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    onImageSelect?.(null);
  };

  const handleGenerateImage = async () => {
    if (!inputMessage.trim()) {
      alert('Please enter a description for the image you want to generate');
      return;
    }

    alert('Image generation requires a paid API plan. This feature is currently not available. You can upload images for AI analysis instead!');
    return;

    /* Disabled until paid API is available
    setGeneratingImage(true);
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: inputMessage })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Set the generated image
      onImageSelect?.(data.imageUrl);
      onMessageChange('Generated image: ' + inputMessage);
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setGeneratingImage(false);
    }
    */
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 p-3 flex-shrink-0">
      <div className="max-w-5xl mx-auto">
        {editingMessageId && (
          <div className="mb-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <span className="text-xs text-blue-700 dark:text-blue-400">Editing message</span>
            <button
              onClick={onCancelEdit}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Image Preview */}
        {selectedImage && (
          <div className="mb-2 relative inline-block">
            <img 
              src={selectedImage} 
              alt="Selected" 
              className="max-h-32 rounded-lg border-2 border-blue-500 dark:border-blue-400"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        <div className="flex items-end space-x-2">
          <button 
            onClick={onVoiceInput}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              isListening 
                ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                : "bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
            )}
            title={isListening ? "Stop recording" : "Start voice input"}
          >
            <Mic className={cn("w-4 h-4", isListening ? "text-white" : "text-gray-600 dark:text-slate-300")} />
          </button>

          <button 
            onClick={handleImageClick}
            disabled={uploadingImage}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              uploadingImage
                ? "bg-gray-300 dark:bg-slate-700 cursor-not-allowed"
                : "bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
            )}
            title="Upload image for analysis"
          >
            <ImageIcon className={cn("w-4 h-4", uploadingImage ? "text-gray-500 dark:text-slate-500" : "text-gray-600 dark:text-slate-300")} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          <button 
            onClick={handleGenerateImage}
            disabled={generatingImage || !inputMessage.trim()}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              generatingImage || !inputMessage.trim()
                ? "bg-gray-300 dark:bg-slate-700 cursor-not-allowed"
                : "bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50"
            )}
            title="Generate image from description"
          >
            <Sparkles className={cn("w-4 h-4", generatingImage || !inputMessage.trim() ? "text-gray-500 dark:text-slate-500" : "text-purple-600 dark:text-purple-400")} />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={isListening ? "Listening..." : selectedImage ? "Ask about the image..." : "Type your message..."}
              value={inputMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={onKeyDown}
              className={cn(
                "w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm text-gray-900 dark:text-white",
                isListening ? "ring-2 ring-red-500 border-red-300" : "focus:ring-blue-500"
              )}
            />
          </div>

          <button 
            onClick={onSend}
            disabled={isSending || (!inputMessage.trim() && !selectedImage)}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md",
              isSending || (!inputMessage.trim() && !selectedImage)
                ? "bg-gray-300 dark:bg-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105"
            )}
          >
            <Send className={cn("w-4 h-4", isSending || (!inputMessage.trim() && !selectedImage) ? "text-gray-500 dark:text-slate-500" : "text-white")} />
          </button>
        </div>

        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 text-center">
          Press Enter to send • Upload images for AI analysis • ✨ Generate images • AI can make mistakes
        </p>
      </div>
    </div>
  );
}
