'use client';

import { useRef, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { AIMessageBubble } from './ai-message-bubble';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  createdAt: Date;
}

interface AIMessagesAreaProps {
  messages: Message[];
  isTyping: boolean;
  hasMoreMessages: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onCopyMessage: (text: string) => void;
  onEditMessage: (message: Message) => void;
}

export function AIMessagesArea({
  messages,
  isTyping,
  hasMoreMessages,
  loadingMore,
  onLoadMore,
  onCopyMessage,
  onEditMessage
}: AIMessagesAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      {hasMoreMessages && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-slate-600"
        >
          {loadingMore ? 'Loading...' : 'Load Earlier Messages'}
        </button>
      )}
      
      {messages.map((message) => (
        <AIMessageBubble
          key={message.id}
          message={message}
          onCopy={onCopyMessage}
          onEdit={onEditMessage}
        />
      ))}

      {isTyping && (
        <div className="flex justify-start">
          <div className="flex items-end space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl rounded-bl-sm px-3 py-2 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
