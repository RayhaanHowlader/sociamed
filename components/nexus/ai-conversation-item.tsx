'use client';

import { Bot, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AIConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
}

export function AIConversationItem({ 
  conversation, 
  isSelected, 
  onSelect, 
  onDelete,
  onRename
}: AIConversationItemProps) {
  return (
    <div className="relative group">
      <button
        onClick={() => onSelect(conversation.id)}
        className={cn(
          "w-full p-3 rounded-lg text-left transition-all",
          isSelected
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
            : "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
        )}
      >
        <div className="flex items-center space-x-2">
          <Bot className={cn("w-4 h-4", isSelected ? "text-white" : "text-gray-400 dark:text-slate-500")} />
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-xs font-semibold truncate", isSelected ? "text-white" : "text-gray-900 dark:text-white")}>
              {conversation.title}
            </h3>
            <p className={cn("text-[10px] truncate", isSelected ? "text-blue-100" : "text-gray-500 dark:text-slate-400")}>
              {conversation.lastMessage}
            </p>
          </div>
        </div>
      </button>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename(conversation.id);
          }}
          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          title="Rename conversation"
        >
          <Edit2 className="w-3 h-3 text-blue-500 dark:text-blue-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(conversation.id);
          }}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          title="Delete conversation"
        >
          <Trash2 className="w-3 h-3 text-red-500 dark:text-red-400" />
        </button>
      </div>
    </div>
  );
}
