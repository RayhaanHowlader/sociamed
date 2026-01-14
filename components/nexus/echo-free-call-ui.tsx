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
import { useLocalAudioIsolation } from './use-local-audio-isolation';

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
  isLocalSpeaking: boolean;
  isRemoteSpeaking: boolean;
  shouldMuteRemote: boolean;
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
  const [hasHeadphones, setHasHeadphones] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null); // Separate audio element

  // Use local audio isolation to prevent self-hearing
  const { ensureLocalMuting } = useLocalAudioIsolation({
    enabled: true,
    debugLogging: true,
  });

  // Detect headphones/speakers to adjust echo prevention
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        const hasHeadphoneDevice = audioOutputs.some(device => 
          device.label.toLowerCase().includes('headphone') ||
          device.label.toLowerCase().includes('headset') ||
          device.label.toLowerCase().includes('earphone')
        );
        setHasHeadphones(hasHeadphoneDevice);
        console.log('[echo-free] Headphones detected:', hasHeadphoneDevice);
      }).catch(e => {
        console.log('[echo-free] Could not detect audio devices:', e);
        setHasHeadphones(false); // Assume speakers (more aggressive echo prevention)
      });
    }
  }, []);

  // Video setup is now handled by inline ref callbacks for better reliability

  // Set up remote audio with voice activity detection
  useEffect(() => {
    if (remoteAudioRef.current && callState.remoteStream) {
      console.log('[REMOTE-AUDIO] 🔊 Setting up REMOTE audio with VAD');
      
      const audioElement = remoteAudioRef.current;
      audioElement.srcObject = callState.remoteStream; // Use full stream
      
      // Auto-mute based on voice activity detection
      if (callState.shouldMuteRemote) {
        audioElement.muted = true;
        console.log('[VAD-UI] 🔇 Remote audio MUTED (you are speaking - preventing echo)');
      } else {
        audioElement.muted = false;
        console.log('[VAD-UI] 🔊 Remote audio UNMUTED (you are silent - can hear remote person)');
      }
      
      // Volume control based on speaker setting
      const volume = callState.isSpeakerEnabled ? 0.8 : 0.6;
      audioElement.volume = volume;
      audioElement.autoplay = true;
      
      console.log('[REMOTE-AUDIO] 📊 Remote audio config:', {
        muted: audioElement.muted,
        volume: audioElement.volume,
        speakerEnabled: callState.isSpeakerEnabled,
        shouldMuteRemote: callState.shouldMuteRemote,
        streamTracks: callState.remoteStream.getTracks().length
      });
      
      audioElement.play().then(() => {
        console.log('[REMOTE-AUDIO] ✅ Remote audio playing successfully');
      }).catch(e => {
        console.error('[REMOTE-AUDIO] ❌ Remote audio play failed:', e);
      });
    }
  }, [callState.remoteStream, callState.isSpeakerEnabled, callState.shouldMuteRemote]);

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
            <DialogTitle className="text-slate-900 dark:text-white">
              {callState.isVideoCall ? 'Incoming Video Call' : 'Incoming Call'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
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
                <p className="text-xl font-semibold text-slate-900 dark:text-white">{caller.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">@{caller.username}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
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
                ref={(el) => {
                  if (el && callState.remoteStream) {
                    console.log('[video-fix] Setting up remote video element');
                    console.log('[video-fix] Remote stream tracks:', callState.remoteStream.getTracks());
                    console.log('[video-fix] Remote video tracks:', callState.remoteStream.getVideoTracks());
                    
                    el.srcObject = callState.remoteStream;
                    el.muted = true; // Muted to prevent echo (audio handled separately)
                    el.playsInline = true;
                    el.autoplay = true;
                    
                    // Add event listeners for debugging
                    el.addEventListener('loadedmetadata', () => {
                      console.log('[video-fix] Remote video metadata loaded');
                    });
                    
                    el.addEventListener('canplay', () => {
                      console.log('[video-fix] Remote video can play');
                    });
                    
                    // Force play
                    el.play().then(() => {
                      console.log('[video-fix] Remote video playing successfully');
                    }).catch(e => {
                      console.error('[video-fix] Remote video play failed:', e);
                    });
                  }
                }}
                autoPlay
                playsInline
                muted={true}
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
                ref={(el) => {
                  if (el && callState.localStream) {
                    console.log('[SELF-HEARING-PREVENTION] 🎥 Setting up LOCAL video element');
                    console.log('[SELF-HEARING-PREVENTION] 📊 Local stream tracks:', callState.localStream.getTracks());
                    console.log('[SELF-HEARING-PREVENTION] 🎬 Local video tracks:', callState.localStream.getVideoTracks());
                    
                    el.srcObject = callState.localStream;
                    
                    // CRITICAL: Use local audio isolation to prevent self-hearing
                    ensureLocalMuting(el);
                    console.log('[SELF-HEARING-PREVENTION] 🔇 Local video element muting enforced');
                    
                    el.playsInline = true;
                    el.autoplay = true;
                    
                    // Add event listeners for debugging
                    el.addEventListener('loadedmetadata', () => {
                      console.log('[SELF-HEARING-PREVENTION] 📺 Local video metadata loaded');
                    });
                    
                    el.addEventListener('canplay', () => {
                      console.log('[SELF-HEARING-PREVENTION] ▶️ Local video can play');
                    });
                    
                    el.addEventListener('play', () => {
                      console.log('[SELF-HEARING-PREVENTION] ✅ Local video started playing (MUTED)');
                      // Double-check muting
                      if (!el.muted || el.volume > 0) {
                        console.log('[SELF-HEARING-PREVENTION] ⚠️ WARNING: Local video not muted - fixing!');
                        ensureLocalMuting(el);
                      }
                    });
                    
                    // Force play
                    el.play().then(() => {
                      console.log('[SELF-HEARING-PREVENTION] ✅ Local video playing successfully (you will NOT hear yourself)');
                    }).catch(e => {
                      console.error('[SELF-HEARING-PREVENTION] ❌ Local video play failed:', e);
                    });
                  }
                }}
                autoPlay
                playsInline
                muted={true}
                className="w-full h-full object-cover"
                style={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}

          {/* Call info overlay with voice activity indicators */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center text-white">
            <p className="text-lg font-semibold">{callPartner.name}</p>
            <p className="text-sm opacity-80">
              {callState.isCalling ? 'Calling...' : callState.isInCall ? 'Connected' : 'Connecting...'}
            </p>
            
            {/* Voice Activity Indicators */}
            {callState.isInCall && (
              <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                  callState.isLocalSpeaking ? 'bg-green-600' : 'bg-gray-600/50'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    callState.isLocalSpeaking ? 'bg-green-300 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span>You</span>
                </div>
                
                <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                  callState.isRemoteSpeaking ? 'bg-blue-600' : 'bg-gray-600/50'
                } ${callState.shouldMuteRemote ? 'opacity-50' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${
                    callState.isRemoteSpeaking && !callState.shouldMuteRemote ? 'bg-blue-300 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span>{callPartner.name}</span>
                  {callState.shouldMuteRemote && <span className="ml-1">🔇</span>}
                </div>
              </div>
            )}
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