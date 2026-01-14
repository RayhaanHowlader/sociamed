'use client';

import { useEffect, useState } from 'react';
import { Bot, ArrowLeft } from 'lucide-react';
import { useAIAssistant } from './use-ai-assistant';
import { AISidebar } from './ai-sidebar';
import { AIChatHeader } from './ai-chat-header';
import { AIMessagesArea } from './ai-messages-area';
import { AIInputArea } from './ai-input-area';
import { AIRenameConversationModal } from './ai-rename-conversation-modal';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function AIAssistant() {
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<{ id: string; title: string } | null>(null);

  const {
    conversations,
    selectedConversationId,
    messages,
    inputMessage,
    isTyping,
    isSending,
    isListening,
    loading,
    loadingMore,
    hasMoreConversations,
    hasMoreMessages,
    conversationsPage,
    messagesPage,
    editingMessageId,
    recognitionRef,
    setInputMessage,
    setIsListening,
    setEditingMessageId,
    setSelectedConversationId,
    setMessages,
    loadConversations,
    loadMessages,
    handleNewConversation,
    handleDeleteConversation,
    handleRenameConversation,
    handleSendMessage
  } = useAIAssistant();

  // Load conversations on mount
  useEffect(() => {
    loadConversations(1);
  }, [loadConversations]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(prev => prev + (prev ? ' ' : '') + transcript);
        };
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setIsListening, setInputMessage, recognitionRef]);

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setMessages([]);
    loadMessages(conversationId, 1);
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
    setMessages([]);
  };

  const handleOpenRenameModal = (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
      setConversationToRename({ id: conv.id, title: conv.title });
      setRenameModalOpen(true);
    }
  };

  const handleCloseRenameModal = () => {
    setRenameModalOpen(false);
    setConversationToRename(null);
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleEditMessage = (message: any) => {
    setInputMessage(message.text);
    setEditingMessageId(message.id);
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        alert('Could not start speech recognition. Please check your microphone permissions.');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 flex overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden md:flex w-full">
        <AISidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          loading={loading}
          loadingMore={loadingMore}
          hasMoreConversations={hasMoreConversations}
          conversationsPage={conversationsPage}
          onConversationSelect={handleConversationSelect}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleOpenRenameModal}
          onNewConversation={handleNewConversation}
          onLoadMore={() => loadConversations(conversationsPage + 1)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversationId ? (
            <>
              <AIChatHeader conversation={selectedConversation} />
              <AIMessagesArea
                messages={messages}
                isTyping={isTyping}
                hasMoreMessages={hasMoreMessages}
                loadingMore={loadingMore}
                onLoadMore={() => loadMessages(selectedConversationId, messagesPage + 1)}
                onCopyMessage={handleCopyMessage}
                onEditMessage={handleEditMessage}
              />
              <AIInputArea
                inputMessage={inputMessage}
                isListening={isListening}
                isSending={isSending}
                editingMessageId={editingMessageId}
                onMessageChange={setInputMessage}
                onSend={() => handleSendMessage()}
                onKeyDown={handleKeyDown}
                onVoiceInput={handleVoiceInput}
                onCancelEdit={() => {
                  setEditingMessageId(null);
                  setInputMessage('');
                }}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Bot className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 dark:text-slate-300 mb-2">Welcome to AI Assistant</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Select a conversation from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full h-full bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col">
        {!selectedConversationId ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">AI Assistant</h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Always here to help</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && conversationsPage === 1 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Bot className="w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-slate-300 mb-2">No conversations yet</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Start your first conversation with AI Assistant</p>
                </div>
              ) : (
                <>
                  {conversations.map((conv) => (
                    <div key={conv.id} className="relative">
                      <button
                        onClick={() => handleConversationSelect(conv.id)}
                        className="w-full p-4 rounded-xl text-left transition-all shadow-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600"
                      >
                        <div className="flex items-center space-x-3">
                          <Bot className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {conv.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                              {conv.lastMessage}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                  {hasMoreConversations && (
                    <button
                      onClick={() => loadConversations(conversationsPage + 1)}
                      disabled={loadingMore}
                      className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:text-gray-400 dark:disabled:text-slate-600"
                    >
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
              <button 
                onClick={handleNewConversation}
                className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-50 dark:hover:bg-slate-700 transition-all"
              >
                + New Conversation
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 shadow-sm flex-shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBackToList}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
                </button>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">{selectedConversation?.title}</h2>
                  <p className="text-xs text-green-500 dark:text-green-400 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full mr-1"></span>
                    Online
                  </p>
                </div>
              </div>
            </div>

            <AIMessagesArea
              messages={messages}
              isTyping={isTyping}
              hasMoreMessages={hasMoreMessages}
              loadingMore={loadingMore}
              onLoadMore={() => loadMessages(selectedConversationId, messagesPage + 1)}
              onCopyMessage={handleCopyMessage}
              onEditMessage={handleEditMessage}
            />

            <AIInputArea
              inputMessage={inputMessage}
              isListening={isListening}
              isSending={isSending}
              editingMessageId={editingMessageId}
              onMessageChange={setInputMessage}
              onSend={() => handleSendMessage()}
              onKeyDown={handleKeyDown}
              onVoiceInput={handleVoiceInput}
              onCancelEdit={() => {
                setEditingMessageId(null);
                setInputMessage('');
              }}
            />
          </>
        )}
      </div>

      {/* Rename Modal */}
      {conversationToRename && (
        <AIRenameConversationModal
          open={renameModalOpen}
          conversationId={conversationToRename.id}
          currentTitle={conversationToRename.title}
          onClose={handleCloseRenameModal}
          onRename={handleRenameConversation}
        />
      )}
    </div>
  );
}
