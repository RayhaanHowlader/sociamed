'use client';

import { ArrowLeft, Phone, PhoneOff, Video, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FriendConversation {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface CallState {
  isInCall: boolean;
  isCalling: boolean;
  isReceivingCall: boolean;
}

interface ChatHeaderProps {
  selectedChat: FriendConversation | null;
  callState: CallState;
  selectMode: boolean;
  selectedMessageIds: Set<string>;
  onBackClick: () => void;
  onProfileClick: (userId: string) => void;
  onCallClick: () => void;
  onVideoCallClick: () => void;
  onEndCall: () => void;
  onSearchMediaClick: () => void;
  onSelectModeToggle: () => void;
  onDeleteMessages: () => void;
  onClearSelection: () => void;
}

export function ChatHeader({
  selectedChat,
  callState,
  selectMode,
  selectedMessageIds,
  onBackClick,
  onProfileClick,
  onCallClick,
  onVideoCallClick,
  onEndCall,
  onSearchMediaClick,
  onSelectModeToggle,
  onDeleteMessages,
  onClearSelection,
}: ChatHeaderProps) {
  const handleProfileClick = () => {
    if (selectedChat) {
      onProfileClick(selectedChat.userId);
    }
  };

  const handleCallButtonClick = () => {
    if (callState.isInCall) {
      onEndCall();
    } else if (!callState.isCalling && selectedChat) {
      onCallClick();
    }
  };

  return (
    <div className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900">
      {selectedChat ? (
        <div className="flex items-center gap-3">
          {/* Back button - only visible on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            onClick={onBackClick}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar 
            className="cursor-pointer hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-500 transition-all"
            onClick={handleProfileClick}
          >
            <AvatarImage src={selectedChat.avatarUrl} />
            <AvatarFallback>{selectedChat.name[0]}</AvatarFallback>
          </Avatar>
          <div 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleProfileClick}
          >
            <p className="font-semibold text-slate-900 dark:text-white">{selectedChat.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Say hi to your new friend.</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">Select a friend to start chatting.</p>
      )}
      
      <div className="flex gap-2 items-center flex-wrap justify-end sticky top-0 bg-white dark:bg-slate-900 z-10 py-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400',
            (callState.isCalling || callState.isInCall) && 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
          )}
          onClick={handleCallButtonClick}
          disabled={!selectedChat || callState.isReceivingCall}
        >
          {callState.isInCall || callState.isCalling ? (
            <PhoneOff className="w-5 h-5" />
          ) : (
            <Phone className="w-5 h-5" />
          )}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
          onClick={onVideoCallClick}
          disabled={!selectedChat || callState.isReceivingCall}
        >
          <Video className="w-5 h-5" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          onClick={onSearchMediaClick}
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
        <Button
          variant={selectMode ? 'secondary' : 'outline'}
          size="sm"
          disabled={!selectedChat}
          onClick={() => (selectMode ? onClearSelection() : onSelectModeToggle())}
          className="min-w-[92px] dark:border-slate-600 dark:text-slate-300"
        >
          {selectMode ? 'Cancel' : 'Select'}
        </Button>
        {selectedMessageIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteMessages}
            className="min-w-[110px]"
          >
            Delete ({selectedMessageIds.size})
          </Button>
        )}
      </div>
    </div>
  );
}