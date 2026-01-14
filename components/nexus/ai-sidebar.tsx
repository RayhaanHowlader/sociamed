'use client';

import { Bot } from 'lucide-react';
import { AIConversationItem } from './ai-conversation-item';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AISidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  loading: boolean;
  loadingMore: boolean;
  hasMoreConversations: boolean;
  conversationsPage: number;
  onConversationSelect: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string) => void;
  onNewConversation: () => void;
  onLoadMore: () => void;
}

export function AISidebar({
  conversations,
  selectedConversationId,
  loading,
  loadingMore,
  hasMoreConversations,
  conversationsPage,
  onConversationSelect,
  onDeleteConversation,
  onRenameConversation,
  onNewConversation,
  onLoadMore
}: AISidebarProps) {
  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col shadow-sm flex-shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white">AI Assistant</h1>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">Always here to help</p>
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 space-y-1">
          {loading && conversationsPage === 1 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Bot className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-xs text-gray-500 dark:text-slate-400">No conversations yet</p>
            </div>
          ) : (
            <>
              {conversations.map((conv) => (
                <AIConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedConversationId === conv.id}
                  onSelect={onConversationSelect}
                  onDelete={onDeleteConversation}
                  onRename={onRenameConversation}
                />
              ))}
              {hasMoreConversations && (
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-slate-600"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-2 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
        <button 
          onClick={onNewConversation}
          className="w-full py-2 bg-white dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-50 dark:hover:bg-slate-700 transition-all"
        >
          + New Conversation
        </button>
      </div>
    </div>
  );
}
