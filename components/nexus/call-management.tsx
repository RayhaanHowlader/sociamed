'use client';

import { PhoneOff, Mic, MicOff, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  callId?: string;
  callerId?: string;
  remoteStream?: MediaStream;
  isMuted: boolean;
}

interface CallManagementProps {
  friends: FriendConversation[];
  selectedChat: FriendConversation | null;
  callState: CallState;
  localAudioRef: React.RefObject<HTMLAudioElement>;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
  onAnswerCall: () => void;
  onRejectCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
}

export function CallManagement({
  friends,
  selectedChat,
  callState,
  localAudioRef,
  remoteAudioRef,
  onAnswerCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
}: CallManagementProps) {
  // Incoming Call Dialog
  const IncomingCallDialog = () => {
    const caller = friends.find((f) => f.userId === callState.callerId);
    
    return (
      <Dialog open={callState.isReceivingCall && !callState.isInCall} onOpenChange={(open) => !open && !callState.isInCall && onRejectCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incoming Call</DialogTitle>
            <DialogDescription>
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
                <p className="text-xl font-semibold">{caller.name}</p>
                <p className="text-sm text-slate-500">@{caller.username}</p>
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
  const ActiveCallDialog = () => {
    if (!(callState.isInCall || callState.isCalling)) return null;

    const callPartnerId = callState.isCalling 
      ? selectedChat?.userId 
      : callState.callerId || selectedChat?.userId;
    const callPartner = friends.find((f) => f.userId === callPartnerId) || selectedChat;
    
    if (!callPartner) {
      return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-semibold">Connecting...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-6">
            <Avatar className="w-32 h-32">
              <AvatarImage src={callPartner.avatarUrl} />
              <AvatarFallback className="text-4xl">{callPartner.name[0]}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-2xl font-semibold">{callPartner.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                {callState.isCalling ? 'Calling...' : callState.isInCall ? (callState.remoteStream ? 'Connected' : 'Connecting...') : ''}
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-14 h-14"
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

  // Hidden audio elements
  const AudioElements = () => (
    <>
      <audio 
        ref={localAudioRef} 
        autoPlay 
        muted 
        playsInline
        controls={false}
        style={{ display: 'none', position: 'fixed', top: '-9999px' }}
      />
      <audio 
        ref={remoteAudioRef} 
        autoPlay 
        playsInline
        controls={false}
        style={{ display: 'none', position: 'fixed', top: '-9999px' }}
        onLoadedMetadata={(e) => {
          const audio = e.target as HTMLAudioElement;
          audio.play().catch((err) => console.error('Auto-play failed on metadata:', err));
        }}
        onCanPlay={(e) => {
          const audio = e.target as HTMLAudioElement;
          audio.play().catch((err) => console.error('Auto-play failed on canplay:', err));
        }}
      />
    </>
  );

  return (
    <>
      <IncomingCallDialog />
      <ActiveCallDialog />
      <AudioElements />
    </>
  );
}