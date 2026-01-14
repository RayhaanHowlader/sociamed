'use client';

import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  callId: string | null;
  callerId: string | null;
  isMuted: boolean;
  remoteStream: MediaStream | null;
}

interface CallUIProps {
  callState: CallState;
  selectedChat: FriendConversation | null;
  friends: FriendConversation[];
  onAnswerCall: () => Promise<void>;
  onRejectCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
}

export function CallUI({
  callState,
  selectedChat,
  friends,
  onAnswerCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
}: CallUIProps) {
  // Incoming Call Dialog
  const IncomingCallDialog = () => {
    const caller = friends.find((f) => f.userId === callState.callerId);
    
    return (
      <Dialog 
        open={callState.isReceivingCall && !callState.isInCall} 
        onOpenChange={(open) => !open && !callState.isInCall && onRejectCall()}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Incoming Call</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {caller ? `${caller.name} is calling you...` : 'Someone is calling you...'}
            </DialogDescription>
          </DialogHeader>
          {caller && (
            <div className="flex flex-col items-center gap-6 py-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={caller.avatarUrl} />
                <AvatarFallback className="text-3xl">{caller.name[0]}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-xl font-semibold text-slate-900 dark:text-white">{caller.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">@{caller.username}</p>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full w-16 h-16"
                  onClick={onRejectCall}
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
                <Button
                  size="lg"
                  className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
                  onClick={onAnswerCall}
                >
                  <Phone className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  // Active Call UI
  const ActiveCallUI = () => {
    if (!callState.isInCall && !callState.isCalling) return null;

    // Determine who we're calling with
    const callPartnerId = callState.isCalling 
      ? selectedChat?.userId 
      : callState.callerId || selectedChat?.userId;
    const callPartner = friends.find((f) => f.userId === callPartnerId) || selectedChat;
    
    if (!callPartner) {
      return (
        <div className="fixed inset-0 z-50 bg-black/80 dark:bg-black/90 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">Connecting...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="fixed inset-0 z-50 bg-black/80 dark:bg-black/90 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-6">
            <Avatar className="w-32 h-32">
              <AvatarImage src={callPartner.avatarUrl} />
              <AvatarFallback className="text-4xl">{callPartner.name[0]}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{callPartner.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {callState.isCalling ? 'Calling...' : callState.isInCall ? (callState.remoteStream ? 'Connected' : 'Connecting...') : ''}
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-14 h-14 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={onToggleMute}
              >
                {callState.isMuted ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={onEndCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <IncomingCallDialog />
      <ActiveCallUI />
    </>
  );
}