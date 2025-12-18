'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface FriendConversation {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface VideoCallState {
  isInCall: boolean;
  isCalling: boolean;
  isReceivingCall: boolean;
  callId: string | null;
  callerId: string | null;
  isVideoCall: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerEnabled: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

interface EchoFreeCallUIProps {
  callState: VideoCallState;
  selectedChat: FriendConversation | null;
  friends: FriendConversation[];
  onAnswerCall: () => Promise<void>;
  onRejectCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
}

export function EchoFreeCallUI({
  callState,
  selectedChat,
  friends,
  onAnswerCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
}: EchoFreeCallUIProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null); // Separate audio element

  // Set up local video (video only, no audio)
  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      console.log('[echo-free] Setting up LOCAL video (video only)');
      
      // Create video-only stream
      const videoOnlyStream = new MediaStream();
      const videoTracks = callState.localStream.getVideoTracks();
      videoTracks.forEach(track => videoOnlyStream.addTrack(track.clone()));
      
      const videoElement = localVideoRef.current;
      videoElement.srcObject = videoOnlyStream;
      videoElement.muted = true; // Always muted
      videoElement.volume = 0; // Extra safety
      videoElement.playsInline = true;
      videoElement.autoplay = true;
      
      console.log('[echo-free] Local video setup - tracks:', videoOnlyStream.getTracks().length);
      videoElement.play().catch(console.error);
    }
  }, [callState.localStream]);

  // Set up remote video (video only)
  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      console.log('[echo-free] Setting up REMOTE video (video only)');
      
      // Create video-only stream for video element
      const videoOnlyStream = new MediaStream();
      const videoTracks = callState.remoteStream.getVideoTracks();
      videoTracks.forEach(track => videoOnlyStream.addTrack(track.clone()));
      
      const videoElement = remoteVideoRef.current;
      videoElement.srcObject = videoOnlyStream;
      videoElement.muted = true; // Video element is muted (audio handled separately)
      videoElement.volume = 0;
      videoElement.playsInline = true;
      videoElement.autoplay = true;
      
      console.log('[echo-free] Remote video setup - tracks:', videoOnlyStream.getTracks().length);
      videoElement.play().catch(console.error);
    }
  }, [callState.remoteStream]);

  // Set up remote audio (audio only, separate element)
  useEffect(() => {
    if (remoteAudioRef.current && callState.remoteStream) {
      console.log('[echo-free] Setting up REMOTE audio (audio only)');
      
      // Create audio-only stream for audio element
      const audioOnlyStream = new MediaStream();
      const audioTracks = callState.remoteStream.getAudioTracks();
      audioTracks.forEach(track => audioOnlyStream.addTrack(track.clone()));
      
      const audioElement = remoteAudioRef.current;
      audioElement.srcObject = audioOnlyStream;
      audioElement.muted = false; // Audio element plays sound
      audioElement.volume = callState.isSpeakerEnabled ? 1.0 : 0.8;
      audioElement.autoplay = true;
      
      console.log('[echo-free] Remote audio setup - tracks:', audioOnlyStream.getTracks().length);
      audioElement.play().catch(console.error);
    }
  }, [callState.remoteStream, callState.isSpeakerEnabled]);

  // Incoming Call Dialog
  const IncomingCallDialog = () => {
    const caller = friends.find((f) => f.userId === callState.callerId);
    
    return (
      <Dialog 
        open={callState.isReceivingCall && !callState.isInCall} 
        onOpenChange={(open) => !open && !callState.isInCall && onRejectCall()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {callState.isVideoCall ? 'Incoming Video Call' : 'Incoming Call'}
            </DialogTitle>
            <DialogDescription>
              {caller ? `${caller.name} is ${callState.isVideoCall ? 'video ' : ''}calling you...` : `Someone is ${callState.isVideoCall ? 'video ' : ''}calling you...`}
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
                <p className="text-xs text-blue-600 mt-1">
                  {callState.isVideoCall ? 'Video Call' : 'Voice Call'}
                </p>
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

    const callPartnerId = callState.isCalling 
      ? selectedChat?.userId 
      : callState.callerId || selectedChat?.userId;
    const callPartner = friends.find((f) => f.userId === callPartnerId) || selectedChat;
    
    if (!callPartner) {
      return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <p className="text-2xl font-semibold">Connecting...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Hidden audio element for remote audio */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          style={{ display: 'none' }}
        />
        
        {/* Video Area */}
        <div className="flex-1 relative">
          {callState.isVideoCall && callState.remoteStream ? (
            <div className="w-full h-full absolute inset-0">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={true} // Video element is muted (audio handled by separate audio element)
                className="w-full h-full object-cover"
                style={{ 
                  width: '100vw',
                  height: '100vh',
                  objectFit: 'cover'
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center text-white">
              <Avatar className="w-32 h-32 mb-4">
                <AvatarImage src={callPartner.avatarUrl} />
                <AvatarFallback className="text-4xl">{callPartner.name[0]}</AvatarFallback>
              </Avatar>
              <p className="text-2xl font-semibold">{callPartner.name}</p>
              <p className="text-sm opacity-80 mt-1">
                {callState.isCalling ? 'Calling...' : callState.isInCall ? 'Connected' : 'Connecting...'}
              </p>
            </div>
          )}
          
          {/* Local video (overlay) - video only */}
          {callState.isVideoCall && callState.localStream && callState.isVideoEnabled && (
            <div className="absolute top-4 right-4 w-32 h-24 bg-black rounded-lg overflow-hidden shadow-lg z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted={true} // Always muted
                className="w-full h-full object-cover"
                style={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}

          {/* Call info overlay */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center text-white">
            <p className="text-lg font-semibold">{callPartner.name}</p>
            <p className="text-sm opacity-80">
              {callState.isCalling ? 'Calling...' : callState.isInCall ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="p-6 bg-black/80 backdrop-blur">
          <div className="flex justify-center gap-4">
            {/* Mute button */}
            <Button
              size="lg"
              variant="outline"
              className={cn(
                "rounded-full w-14 h-14 border-white/20",
                callState.isMuted 
                  ? "bg-red-600 hover:bg-red-700 text-white border-red-600" 
                  : "bg-white/10 hover:bg-white/20 text-white"
              )}
              onClick={onToggleMute}
            >
              {callState.isMuted ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>

            {/* Video toggle button */}
            {callState.isVideoCall && (
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  "rounded-full w-14 h-14 border-white/20",
                  !callState.isVideoEnabled 
                    ? "bg-red-600 hover:bg-red-700 text-white border-red-600" 
                    : "bg-white/10 hover:bg-white/20 text-white"
                )}
                onClick={onToggleVideo}
              >
                {callState.isVideoEnabled ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <VideoOff className="w-6 h-6" />
                )}
              </Button>
            )}

            {/* Speaker button */}
            <Button
              size="lg"
              variant="outline"
              className={cn(
                "rounded-full w-14 h-14 border-white/20",
                callState.isSpeakerEnabled 
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" 
                  : "bg-white/10 hover:bg-white/20 text-white"
              )}
              onClick={onToggleSpeaker}
            >
              {callState.isSpeakerEnabled ? (
                <Volume2 className="w-6 h-6" />
              ) : (
                <VolumeX className="w-6 h-6" />
              )}
            </Button>

            {/* End call button */}
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
              onClick={onEndCall}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
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