'use client';

import { Send, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onCancelEdit
}: AIInputAreaProps) {
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

          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={isListening ? "Listening..." : "Type your message..."}
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
            disabled={isSending || !inputMessage.trim()}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md",
              isSending || !inputMessage.trim()
                ? "bg-gray-300 dark:bg-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105"
            )}
          >
            <Send className={cn("w-4 h-4", isSending || !inputMessage.trim() ? "text-gray-500 dark:text-slate-500" : "text-white")} />
          </button>
        </div>

        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 text-center">
          Press Enter to send • AI Assistant can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
