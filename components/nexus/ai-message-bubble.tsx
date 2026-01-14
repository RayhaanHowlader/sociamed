'use client';

import { Bot, User, Copy, Edit2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  createdAt: Date;
}

interface AIMessageBubbleProps {
  message: Message;
  onCopy: (text: string) => void;
  onEdit: (message: Message) => void;
}

export function AIMessageBubble({ message, onCopy, onEdit }: AIMessageBubbleProps) {
  return (
    <div
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn group`}
    >
      <div className={`flex ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-2xl`}>
        <div className={`flex-shrink-0 ${message.sender === 'user' ? 'ml-2' : 'mr-2'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            message.sender === 'ai'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600'
              : 'bg-gradient-to-br from-blue-400 to-blue-500'
          }`}>
            {message.sender === 'ai' ? (
              <Bot className="w-4 h-4 text-white" />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1">
          <div
            className={`rounded-xl px-3 py-2 shadow-sm ${
              message.sender === 'user'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
                : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-600 rounded-bl-sm'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
          </div>
          <div className={`flex items-center gap-2 mt-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <button
                onClick={() => onCopy(message.text)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                title="Copy message"
              >
                <Copy className="w-3 h-3 text-gray-500 dark:text-slate-400" />
              </button>
              {message.sender === 'user' && (
                <button
                  onClick={() => onEdit(message)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                  title="Edit and resend"
                >
                  <Edit2 className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
