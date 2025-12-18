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
import { VideoTestComponent } from './video-test-component';
import { useAudioManagement } from './use-audio-management';

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

interface VideoCallUIProps {
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

export function VideoCallUI({
  callState,
  selectedChat,
  friends,
  onAnswerCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
}: VideoCallUIProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Use audio management to prevent echo
  const { configureAudioElement } = useAudioManagement();

  // Set up video streams with multiple retry attempts
  useEffect(() => {
    const setupLocalVideo = async () => {
      if (localVideoRef.current && callState.localStream) {
        console.log('Setting local stream:', callState.localStream);
        console.log('Local stream tracks:', callState.localStream.getTracks());
        
        const videoElement = localVideoRef.current;
        
        try {
          // Clear any existing source
          videoElement.srcObject = null;
          videoElement.load();
          
          // Set the new stream
          videoElement.srcObject = callState.localStream;
          
          // Configure audio element to prevent echo - CRITICAL for local video
          videoElement.muted = true; // ALWAYS mute local video
          videoElement.volume = 0; // Set volume to 0 as extra safety
          if (videoElement instanceof HTMLVideoElement) {
            videoElement.playsInline = true;
          }
          videoElement.autoplay = true;
          
          console.log('[setup] Local video configured - muted:', videoElement.muted, 'volume:', videoElement.volume);
          
          // Multiple play attempts
          const attemptPlay = async (attempt = 1) => {
            try {
              console.log(`Local video play attempt ${attempt}`);
              await videoElement.play();
              console.log('Local video playing successfully');
            } catch (e) {
              console.error(`Local video play attempt ${attempt} failed:`, e);
              if (attempt < 3) {
                setTimeout(() => attemptPlay(attempt + 1), 500);
              }
            }
          };
          
          // Wait for metadata
          videoElement.addEventListener('loadedmetadata', () => {
            console.log('Local video metadata loaded');
            attemptPlay();
          }, { once: true });
          
          // Immediate attempt
          setTimeout(() => attemptPlay(), 100);
          
          console.log('Local video setup completed');
        } catch (e) {
          console.error('Local video setup failed:', e);
        }
      }
    };
    
    setupLocalVideo();
  }, [callState.localStream]);

  useEffect(() => {
    const setupRemoteVideo = async () => {
      if (remoteVideoRef.current && callState.remoteStream) {
        console.log('Setting remote stream:', callState.remoteStream);
        console.log('Remote stream tracks:', callState.remoteStream.getTracks());
        
        const videoElement = remoteVideoRef.current;
        
        try {
          // Clear any existing source
          videoElement.srcObject = null;
          videoElement.load();
          
          // Set the new stream
          videoElement.srcObject = callState.remoteStream;
          
          // Configure remote video element
          videoElement.muted = false; // Remote video should play audio
          videoElement.volume = callState.isSpeakerEnabled ? 1.0 : 0.8;
          if (videoElement instanceof HTMLVideoElement) {
            videoElement.playsInline = true;
          }
          videoElement.autoplay = true;
          
          console.log('[setup] Remote video configured - muted:', videoElement.muted, 'volume:', videoElement.volume);
          
          // Multiple play attempts
          const attemptPlay = async (attempt = 1) => {
            try {
              console.log(`Remote video play attempt ${attempt}`);
              await videoElement.play();
              console.log('Remote video playing successfully');
            } catch (e) {
              console.error(`Remote video play attempt ${attempt} failed:`, e);
              if (attempt < 3) {
                setTimeout(() => attemptPlay(attempt + 1), 500);
              }
            }
          };
          
          // Wait for metadata
          videoElement.addEventListener('loadedmetadata', () => {
            console.log('Remote video metadata loaded');
            attemptPlay();
          }, { once: true });
          
          // Immediate attempt
          setTimeout(() => attemptPlay(), 100);
          
          console.log('Remote video setup completed');
        } catch (e) {
          console.error('Remote video setup failed:', e);
        }
      }
    };
    
    setupRemoteVideo();
  }, [callState.remoteStream]);



  // Incoming Video Call Dialog
  const IncomingVideoCallDialog = () => {
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

  // Active Video Call UI
  const ActiveVideoCallUI = () => {
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

    if (isMinimized) {
      return (
        <div className="fixed bottom-4 right-4 z-50 bg-black rounded-lg overflow-hidden shadow-2xl">
          <div className="relative w-64 h-48">
            {callState.isVideoCall && callState.remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                controls={false}
                muted={false}
                className="w-full h-full object-cover bg-black border-2 border-green-500"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  minWidth: '100px',
                  minHeight: '100px',
                  display: 'block'
                }}
                onLoadedMetadata={() => {
                  console.log('Remote video metadata loaded');
                  remoteVideoRef.current?.play().catch(e => console.error('Remote video play error:', e));
                }}
                onCanPlay={() => {
                  console.log('Remote video can play');
                  remoteVideoRef.current?.play().catch(e => console.error('Remote video play error:', e));
                }}
                onPlay={() => console.log('Remote video started playing')}
                onPause={() => console.log('Remote video paused')}
                onError={(e) => console.error('Remote video error:', e)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={callPartner.avatarUrl} />
                  <AvatarFallback className="text-2xl">{callPartner.name[0]}</AvatarFallback>
                </Avatar>
              </div>
            )}
            
            {/* Local video (small overlay) */}
            {callState.isVideoCall && callState.localStream && callState.isVideoEnabled && (
              <div className="absolute top-2 right-2 w-16 h-12 bg-black rounded overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  controls={false}
                  className="w-full h-full object-cover bg-gray-800 border-2 border-yellow-500"
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    minWidth: '50px',
                    minHeight: '50px',
                    display: 'block'
                  }}
                  onLoadedMetadata={() => {
                    console.log('Local video metadata loaded (minimized)');
                    localVideoRef.current?.play().catch(e => console.error('Local video play error:', e));
                  }}
                  onCanPlay={() => {
                    console.log('Local video can play (minimized)');
                    localVideoRef.current?.play().catch(e => console.error('Local video play error:', e));
                  }}
                  onPlay={() => console.log('Local video started playing (minimized)')}
                  onError={(e) => console.error('Local video error (minimized):', e)}
                />
              </div>
            )}

            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 flex justify-between items-center">
              <span className="text-white text-xs font-medium truncate">
                {callPartner.name}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={() => setIsMinimized(false)}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 w-8 p-0"
                  onClick={onEndCall}
                >
                  <PhoneOff className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Video Area - Simplified approach */}
        <div className="flex-1 relative">
          {callState.isVideoCall && callState.remoteStream ? (
            <div className="w-full h-full absolute inset-0">
              <video
                ref={(el) => {
                  if (el && callState.remoteStream) {
                    console.log('[video] Setting up REMOTE video element');
                    el.srcObject = callState.remoteStream;
                    el.muted = false; // Remote audio should be heard
                    el.volume = callState.isSpeakerEnabled ? 1.0 : 0.8;
                    
                    // Ensure only audio tracks from remote stream are played
                    const audioTracks = callState.remoteStream.getAudioTracks();
                    const videoTracks = callState.remoteStream.getVideoTracks();
                    console.log('[remote-video] Remote stream - Audio tracks:', audioTracks.length, 'Video tracks:', videoTracks.length);
                    
                    // Log track details
                    audioTracks.forEach((track, i) => {
                      console.log(`[remote-video] Audio track ${i}:`, track.enabled, track.muted, track.readyState);
                    });
                    
                    el.play().catch(console.error);
                  }
                }}
                autoPlay
                playsInline
                muted={false}
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
          
          {/* Local video (overlay) */}
          {callState.isVideoCall && callState.localStream && callState.isVideoEnabled && (
            <div className="absolute top-4 right-4 w-32 h-24 bg-black rounded-lg overflow-hidden shadow-lg z-10">
              <video
                ref={(el) => {
                  if (el && callState.localStream) {
                    console.log('[video] Setting up LOCAL video element - MUTING COMPLETELY');
                    
                    // Create a completely clean video-only stream
                    const videoOnlyStream = new MediaStream();
                    const videoTracks = callState.localStream.getVideoTracks();
                    console.log('[local-video] Creating video-only stream with', videoTracks.length, 'video tracks');
                    
                    videoTracks.forEach(track => {
                      const clonedTrack = track.clone();
                      videoOnlyStream.addTrack(clonedTrack);
                    });
                    
                    // Verify no audio tracks
                    const audioTracks = videoOnlyStream.getAudioTracks();
                    console.log('[local-video] Audio tracks in video-only stream:', audioTracks.length);
                    
                    el.srcObject = videoOnlyStream; // Use completely clean video-only stream
                    el.muted = true; // CRITICAL: Always mute local video
                    el.volume = 0; // Extra safety
                    
                    // Disable any audio context for this element
                    if ('audioTracks' in el) {
                      (el as any).audioTracks = [];
                    }
                    
                    el.play().catch(console.error);
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

          {/* Top controls */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="w-4 h-4 mr-2" />
              Minimize
            </Button>
          </div>

          {/* Call info overlay */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center text-white">
            <p className="text-lg font-semibold">{callPartner.name}</p>
            <p className="text-sm opacity-80">
              {callState.isCalling ? 'Calling...' : callState.isInCall ? 'Connected' : 'Connecting...'}
            </p>
          </div>

          {/* Debug video test components */}
          {process.env.NODE_ENV === 'development' && (
            <div className="absolute bottom-20 left-4 flex gap-2 bg-white/90 p-2 rounded">
              <VideoTestComponent 
                stream={callState.localStream} 
                label="Local" 
                muted={true}
              />
              <VideoTestComponent 
                stream={callState.remoteStream} 
                label="Remote" 
                muted={false}
              />
              <div className="flex flex-col gap-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    // Force refresh main video elements
                    const videos = document.querySelectorAll('.fixed.inset-0 video');
                    videos.forEach(video => {
                      const videoEl = video as HTMLVideoElement;
                      if (videoEl.srcObject) {
                        videoEl.play().catch(console.error);
                      }
                    });
                  }}
                >
                  Play Main Videos
                </Button>
              </div>
            </div>
          )}
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
      <IncomingVideoCallDialog />
      <ActiveVideoCallUI />
    </>
  );
}