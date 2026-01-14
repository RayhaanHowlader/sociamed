'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  createdAt: Date;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function useAIAssistant() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [conversationsPage, setConversationsPage] = useState(1);
  const [messagesPage, setMessagesPage] = useState(1);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load conversations
  const loadConversations = useCallback(async (page: number) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(`/api/ai/conversations?page=${page}&limit=20`, {
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok) {
        if (page === 1) {
          setConversations(data.conversations);
        } else {
          setConversations(prev => [...prev, ...data.conversations]);
        }
        setHasMoreConversations(data.hasMore);
        setConversationsPage(page);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(async (conversationId: string, page: number = 1) => {
    try {
      const res = await fetch(`/api/ai/messages?conversationId=${conversationId}&page=${page}&limit=50`, {
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok) {
        if (page === 1) {
          setMessages(data.messages);
        } else {
          setMessages(prev => [...data.messages, ...prev]);
        }
        setHasMoreMessages(data.hasMore);
        setMessagesPage(page);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  // Create new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: 'New Chat' })
      });

      const data = await res.json();
      if (res.ok) {
        setConversations(prev => [data.conversation, ...prev]);
        setSelectedConversationId(data.conversation.id);
        loadMessages(data.conversation.id, 1);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, [loadMessages]);

  // Delete conversation
  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    if (!confirm('Delete this conversation?')) return;

    try {
      const res = await fetch(`/api/ai/conversations?id=${conversationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (selectedConversationId === conversationId) {
          setSelectedConversationId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }, [selectedConversationId]);

  // Rename conversation
  const handleRenameConversation = useCallback(async (conversationId: string, newTitle: string) => {
    try {
      const res = await fetch('/api/ai/conversations/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId, title: newTitle })
      });

      const data = await res.json();
      if (res.ok) {
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title: data.title, updatedAt: new Date() }
            : conv
        ));
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
      throw error;
    }
  }, []);

  // Send message
  const handleSendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isSending || !selectedConversationId) return;

    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      text: textToSend,
      sender: 'user',
      createdAt: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsSending(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: textToSend,
          chatHistory: messages.slice(-10),
          conversationId: selectedConversationId
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        text: data.response,
        sender: 'ai',
        createdAt: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversationId 
          ? { ...conv, lastMessage: textToSend.substring(0, 100), updatedAt: new Date() }
          : conv
      ));
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorResponse: Message = {
        id: `error-${Date.now()}`,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'ai',
        createdAt: new Date()
      };

      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  }, [inputMessage, isSending, selectedConversationId, messages]);

  return {
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
  };
}
