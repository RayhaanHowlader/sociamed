'use client';

import { Bot } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AIChatHeaderProps {
  conversation: Conversation | undefined;
}

export function AIChatHeader({ conversation }: AIChatHeaderProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 shadow-sm flex-shrink-0">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{conversation?.title}</h2>
          <p className="text-xs text-green-500 dark:text-green-400 flex items-center">
            <span className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full mr-1"></span>
            Online
          </p>
        </div>
      </div>
    </div>
  );
}
