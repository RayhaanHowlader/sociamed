'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Mic, Paperclip, Smile, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: number;
  text: string;
  sender: 'ai' | 'user';
  time: string;
}

interface Chat {
  id: string;
  title: string;
  description: string;
  messages: Message[];
}

export function AIAssistant() {
  const [chats] = useState<Chat[]>([]);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize chats
  useEffect(() => {
    setAllChats(chats);
  }, [chats]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(prev => prev + (prev ? ' ' : '') + transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleChatSelect = (chatId: string) => {
    const selectedChat = allChats.find(chat => chat.id === chatId);
    if (selectedChat) {
      setSelectedChatId(chatId);
      setMessages(selectedChat.messages);
    }
  };

  const handleBackToList = () => {
    setSelectedChatId(null);
    setMessages([]);
  };

  const handleNewConversation = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      title: 'New Chat',
      description: 'Fresh conversation',
      messages: [
        {
          id: 1,
          text: "Hello! I'm your AI assistant. How can I help you today?",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setAllChats(prev => [newChat, ...prev]);
    setSelectedChatId(newChatId);
    setMessages(newChat.messages);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage = inputMessage.trim();
    const newMessage: Message = {
      id: messages.length + 1,
      text: userMessage,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add user message immediately
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsSending(true);
    setIsTyping(true);

    try {
      // Call the AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: messages.slice(-10) // Send last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response
      const aiResponse: Message = {
        id: messages.length + 2,
        text: data.response,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiResponse]);

      // Update the chat in allChats
      if (selectedChatId) {
        setAllChats(prev => prev.map(chat => 
          chat.id === selectedChatId 
            ? { ...chat, messages: [...messages, newMessage, aiResponse] }
            : chat
        ));
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add error message
      const errorResponse: Message = {
        id: messages.length + 2,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, errorResponse]);

      // Update the chat in allChats with error message
      if (selectedChatId) {
        setAllChats(prev => prev.map(chat => 
          chat.id === selectedChatId 
            ? { ...chat, messages: [...messages, newMessage, errorResponse] }
            : chat
        ));
      }
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  const selectedChat = allChats.find(chat => chat.id === selectedChatId);



  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-white flex overflow-hidden">
      {/* Desktop Layout */}
      <div className="hidden md:flex w-full">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm flex-shrink-0">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">AI Assistant</h1>
                <p className="text-[10px] text-gray-500">Always here to help</p>
              </div>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {allChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Bot className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-xs text-gray-500">No conversations yet</p>
                </div>
              ) : (
                allChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatSelect(chat.id)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-all",
                      selectedChatId === chat.id
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <Bot className={cn("w-4 h-4", selectedChatId === chat.id ? "text-white" : "text-gray-400")} />
                      <div className="flex-1">
                        <h3 className={cn("text-xs font-semibold", selectedChatId === chat.id ? "text-white" : "text-gray-900")}>
                          {chat.title}
                        </h3>
                        <p className={cn("text-[10px] truncate", selectedChatId === chat.id ? "text-blue-100" : "text-gray-500")}>
                          {chat.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-2 border-t border-gray-200 flex-shrink-0">
            <button 
              onClick={handleNewConversation}
              className="w-full py-2 bg-white border-2 border-blue-500 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-all"
            >
              + New Conversation
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChatId ? (
            <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{selectedChat?.title}</h2>
                  <p className="text-xs text-green-500 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                    Online
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex-shrink-0">
              <div className="flex items-center justify-center">
                <p className="text-sm text-gray-500">Select a conversation to start chatting</p>
              </div>
            </div>
          )}

          {/* Messages Container */}
          {selectedChatId ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  >
                    <div className={`flex ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-2xl`}>
                      {/* Avatar */}
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

                      {/* Message Bubble */}
                      <div className="flex flex-col">
                        <div
                          className={`rounded-xl px-3 py-2 shadow-sm ${
                            message.sender === 'user'
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                        </div>
                        <span className={`text-[10px] text-gray-400 mt-1 ${message.sender === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                          {message.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-end space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2 shadow-sm">
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

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0">
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-end space-x-2">
                    {/* Action Buttons */}
                    <div className="flex space-x-1">
                      <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                        <Paperclip className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                        <Smile className="w-4 h-4 text-gray-600" />
                      </button>
                      <button 
                        onClick={handleVoiceInput}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                          isListening 
                            ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                            : "bg-gray-100 hover:bg-gray-200"
                        )}
                        title={isListening ? "Stop recording" : "Start voice input"}
                      >
                        <Mic className={cn("w-4 h-4", isListening ? "text-white" : "text-gray-600")} />
                      </button>
                    </div>

                    {/* Input Field */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder={isListening ? "Listening..." : "Type your message..."}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={cn(
                          "w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm",
                          isListening ? "ring-2 ring-red-500 border-red-300" : "focus:ring-blue-500"
                        )}
                      />
                    </div>

                    {/* Send Button */}
                    <button 
                      onClick={handleSendMessage}
                      disabled={isSending || !inputMessage.trim()}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md",
                        isSending || !inputMessage.trim()
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105"
                      )}
                    >
                      <Send className={cn("w-4 h-4", isSending || !inputMessage.trim() ? "text-gray-500" : "text-white")} />
                    </button>
                  </div>

                  {/* Helper Text */}
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                    Press Enter to send • AI Assistant can make mistakes. Check important info.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Welcome to AI Assistant</h3>
                <p className="text-sm text-gray-500">Select a conversation from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full h-full bg-gradient-to-br from-blue-50 to-white flex flex-col">
        {!selectedChatId ? (
          <>
            {/* Mobile Chat List Header */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">AI Assistant</h1>
                  <p className="text-sm text-gray-500">Always here to help</p>
                </div>
              </div>
            </div>

            {/* Mobile Chat List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {allChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Bot className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No conversations yet</h3>
                  <p className="text-sm text-gray-500 mb-6">Start your first conversation with AI Assistant</p>
                </div>
              ) : (
                allChats.map((chat, index) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatSelect(chat.id)}
                    className={cn(
                      "w-full p-4 rounded-xl text-left transition-all shadow-sm",
                      index === 0
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <Bot className={cn("w-5 h-5", index === 0 ? "text-white" : "text-gray-400")} />
                      <div className="flex-1">
                        <h3 className={cn("text-sm font-semibold", index === 0 ? "text-white" : "text-gray-900")}>
                          {chat.title}
                        </h3>
                        <p className={cn("text-xs truncate", index === 0 ? "text-blue-100" : "text-gray-500")}>
                          {chat.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Mobile New Chat Button */}
            <div className="p-4 border-t border-gray-200 flex-shrink-0 bg-white">
              <button 
                onClick={handleNewConversation}
                className="w-full py-3 bg-white border-2 border-blue-500 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-all"
              >
                + New Conversation
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Mobile Chat Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex-shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBackToList}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{selectedChat?.title}</h2>
                  <p className="text-xs text-green-500 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                    Online
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div className={`flex ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-2xl`}>
                    {/* Avatar */}
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

                    {/* Message Bubble */}
                    <div className="flex flex-col">
                      <div
                        className={`rounded-xl px-3 py-2 shadow-sm ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                      </div>
                      <span className={`text-[10px] text-gray-400 mt-1 ${message.sender === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                        {message.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-end space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2 shadow-sm">
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

            {/* Mobile Input Area */}
            <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0">
              <div className="flex items-end space-x-2">
                {/* Action Buttons */}
                <div className="flex space-x-1">
                  <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                    <Paperclip className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all">
                    <Smile className="w-4 h-4 text-gray-600" />
                  </button>
                  <button 
                    onClick={handleVoiceInput}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      isListening 
                        ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                    title={isListening ? "Stop recording" : "Start voice input"}
                  >
                    <Mic className={cn("w-4 h-4", isListening ? "text-white" : "text-gray-600")} />
                  </button>
                </div>

                {/* Input Field */}
                <div className="flex-1 relative">
                  <input
                    key={`mobile-input-${selectedChatId}`}
                    type="text"
                    placeholder={isListening ? "Listening..." : "Type your message..."}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      "w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm",
                      isListening ? "ring-2 ring-red-500 border-red-300" : "focus:ring-blue-500"
                    )}
                    autoComplete="off"
                  />
                </div>

                {/* Send Button */}
                <button 
                  onClick={handleSendMessage}
                  disabled={isSending || !inputMessage.trim()}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md",
                    isSending || !inputMessage.trim()
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105"
                  )}
                >
                  <Send className={cn("w-4 h-4", isSending || !inputMessage.trim() ? "text-gray-500" : "text-white")} />
                </button>
              </div>

              {/* Helper Text */}
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Press Enter to send • AI Assistant can make mistakes. Check important info.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}