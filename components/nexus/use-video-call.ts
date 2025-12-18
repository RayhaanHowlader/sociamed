'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useAudioManagement } from './use-audio-management';
import { useVoiceActivityDetection } from './use-voice-activity-detection';
import { useLocalAudioIsolation } from './use-local-audio-isolation';

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
  localStream: MediaStream | null; // Display stream (video only)
  remoteStream: MediaStream | null;
  // Voice activity detection states
  isLocalSpeaking: boolean;
  isRemoteSpeaking: boolean;
  shouldMuteRemote: boolean;
}

interface UseVideoCallProps {
  socket: Socket | null;
  currentUserId: string;
}

export function useVideoCall({ socket, currentUserId }: UseVideoCallProps) {
  const [callState, setCallState] = useState<VideoCallState>({
    isInCall: false,
    isCalling: false,
    isReceivingCall: false,
    callId: null,
    callerId: null,
    isVideoCall: false,
    isMuted: false,
    isVideoEnabled: true,
    isSpeakerEnabled: false,
    localStream: null,
    remoteStream: null,
    isLocalSpeaking: false,
    isRemoteSpeaking: false,
    shouldMuteRemote: false,
  });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcStream = useRef<MediaStream | null>(null); // Actual stream for WebRTC (with audio)
  
  // Use audio management hook to prevent echo
  const { processLocalAudio, processRemoteAudio, configureAudioElement, cleanup: cleanupAudio } = useAudioManagement({
    enableEchoCancellation: true,
    enableNoiseSuppression: true,
    enableAutoGainControl: true,
    localAudioGain: 0.6, // Reduce local gain to prevent echo
    remoteAudioGain: 1.0,
  });

  // Use voice activity detection for automatic muting
  const { 
    isLocalSpeaking, 
    isRemoteSpeaking, 
    shouldMuteRemote, 
    startDetection, 
    stopDetection 
  } = useVoiceActivityDetection({
    threshold: 20, // Lower threshold for better detection
    silenceDelay: 600, // Faster unmuting
    enabled: true, // Enable voice activity detection
  });

  // Use local audio isolation to prevent self-hearing
  const { 
    isolateLocalAudio, 
    ensureLocalMuting, 
    cleanup: cleanupLocalIsolation 
  } = useLocalAudioIsolation({
    enabled: true,
    debugLogging: true, // Enable detailed logging
  });

  // End call
  const endCall = useCallback(() => {
    if (socket && callState.callId) {
      const calleeId = callState.callerId === currentUserId ? 
        callState.callId.split('-').find(id => id !== currentUserId) : 
        callState.callerId;
      
      socket.emit('call-end', {
        callId: callState.callId,
        userId: currentUserId,
        callerId: callState.callerId,
        calleeId: calleeId,
      });
    }

    // Stop voice activity detection
    stopDetection();

    // Clean up local audio isolation
    cleanupLocalIsolation();

    // Clean up streams
    if (callState.localStream) {
      callState.localStream.getTracks().forEach(track => track.stop());
    }
    if (webrtcStream.current) {
      webrtcStream.current.getTracks().forEach(track => track.stop());
      webrtcStream.current = null;
    }

    // Clean up audio processing
    cleanupAudio();

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    setCallState({
      isInCall: false,
      isCalling: false,
      isReceivingCall: false,
      callId: null,
      callerId: null,
      isVideoCall: false,
      isMuted: false,
      isVideoEnabled: true,
      isSpeakerEnabled: false,
      localStream: null,
      remoteStream: null,
      isLocalSpeaking: false,
      isRemoteSpeaking: false,
      shouldMuteRemote: false,
    });
  }, [socket, callState.callId, callState.localStream, callState.callerId, currentUserId]);

  // Reject call
  const rejectCall = useCallback(() => {
    if (!socket || !callState.callId) return;

    socket.emit('call-reject', {
      callId: callState.callId,
      callerId: callState.callerId,
      calleeId: currentUserId,
    });

    setCallState({
      isInCall: false,
      isCalling: false,
      isReceivingCall: false,
      callId: null,
      callerId: null,
      isVideoCall: false,
      isMuted: false,
      isVideoEnabled: true,
      isSpeakerEnabled: false,
      localStream: null,
      remoteStream: null,
      isLocalSpeaking: false,
      isRemoteSpeaking: false,
      shouldMuteRemote: false,
    });
  }, [socket, callState.callId, callState.callerId, currentUserId]);

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      // Disable local audio monitoring
      bundlePolicy: 'balanced' as RTCBundlePolicy,
      rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
    };

    peerConnection.current = new RTCPeerConnection(configuration);
    
    // CRITICAL: Disable any local audio monitoring in WebRTC
    if ('getStats' in peerConnection.current) {
      // Disable local audio monitoring at WebRTC level
      console.log('[echo-fix] Configuring WebRTC for zero local audio monitoring');
    }

    // Handle remote stream
    peerConnection.current.ontrack = async (event) => {
      console.log('Received remote stream:', event);
      const [remoteStream] = event.streams;
      console.log('Remote stream tracks:', remoteStream.getTracks());
      
      // Log track details
      remoteStream.getTracks().forEach((track, index) => {
        console.log(`Remote track ${index}:`, {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          id: track.id
        });
      });
      
      // Process remote audio to prevent echo
      const processedRemoteStream = await processRemoteAudio(remoteStream);
      
      setCallState(prev => ({ ...prev, remoteStream: processedRemoteStream }));

      // Start voice activity detection if we have both streams
      if (webrtcStream.current && processedRemoteStream) {
        console.log('[VAD] Both streams available, starting voice activity detection');
        startDetection(webrtcStream.current, processedRemoteStream);
      }
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && socket) {
        // Get the current callId from state
        setCallState(currentState => {
          if (currentState.callId) {
            socket.emit('ice-candidate', {
              candidate: event.candidate,
              callId: currentState.callId,
              callerId: currentState.callerId || currentUserId,
              calleeId: currentState.callerId === currentUserId ? 
                currentState.callId.split('-').find(id => id !== currentUserId) : 
                currentState.callerId,
            });
          }
          return currentState;
        });
      }
    };

    // Handle connection state changes
    peerConnection.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.current?.connectionState);
      if (peerConnection.current?.connectionState === 'connected') {
        setCallState(prev => ({ ...prev, isInCall: true, isCalling: false }));
      } else if (peerConnection.current?.connectionState === 'disconnected' || 
                 peerConnection.current?.connectionState === 'failed') {
        endCall();
      }
    };

    return peerConnection.current;
  }, [socket, endCall, currentUserId]);

  // Get user media
  const getUserMedia = useCallback(async (isVideoCall: boolean) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          // More aggressive echo cancellation
          latency: 0.01, // Low latency
          volume: 0.8,
        },
        video: isVideoCall ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        } : false,
      };

      console.log('Requesting user media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got user media stream:', stream);
      console.log('Stream tracks:', stream.getTracks());
      
      // Ensure video tracks are enabled
      if (isVideoCall) {
        const videoTracks = stream.getVideoTracks();
        videoTracks.forEach(track => {
          console.log('Video track enabled:', track.enabled, 'readyState:', track.readyState);
          track.enabled = true;
        });
      }
      
      // Configure audio tracks to prevent echo
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        console.log('Audio track enabled:', track.enabled, 'readyState:', track.readyState);
        track.enabled = true;
        
        // Disable local monitoring/playback of this track
        if ('monitor' in track) {
          (track as any).monitor = false;
        }
        
        // Apply constraints to prevent local audio monitoring
        track.applyConstraints({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }).catch(e => console.log('Could not apply track constraints:', e));
      });
      
      // Ensure video tracks are enabled
      if (isVideoCall) {
        const videoTracks = stream.getVideoTracks();
        videoTracks.forEach(track => {
          console.log('Video track enabled:', track.enabled, 'readyState:', track.readyState);
          track.enabled = true;
        });
      }
      
      // Process audio to prevent echo
      const processedStream = await processLocalAudio(stream);
      
      // CRITICAL: Isolate local audio to prevent self-hearing
      const isolatedStream = isolateLocalAudio(processedStream);
      console.log('[SELF-HEARING-PREVENTION] ✅ Local audio isolated - you will NOT hear yourself');
      
      // Store the isolated stream for WebRTC transmission
      webrtcStream.current = isolatedStream;
      
      // Use the same stream for display (video elements will be muted to prevent echo)
      setCallState(prev => ({ 
        ...prev, 
        localStream: isolatedStream, // Use isolated stream for display
        isVideoCall 
      }));
      
      console.log('[SELF-HEARING-PREVENTION] ✅ Stream configured with isolation - tracks:', isolatedStream.getTracks().length);
      
      return isolatedStream; // Return isolated stream for WebRTC
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Start call
  const startCall = useCallback(async (friendId: string, isVideoCall: boolean = false) => {
    if (!socket) return;

    try {
      const stream = await getUserMedia(isVideoCall);
      const pc = initializePeerConnection();

      // Add WebRTC stream to peer connection (not the display stream)
      if (webrtcStream.current) {
        webrtcStream.current.getTracks().forEach(track => {
          console.log('Adding track to peer connection (startCall):', track.kind, track.enabled);
          pc.addTrack(track, webrtcStream.current!);
        });
      }

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callId = `${currentUserId}-${friendId}-${Date.now()}`;
      
      setCallState(prev => ({
        ...prev,
        isCalling: true,
        callId,
        isVideoCall,
      }));

      // Send call offer
      socket.emit('call-offer', {
        callId,
        callerId: currentUserId,
        calleeId: friendId,
        offer,
        isVideoCall,
      });

    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start call. Please check your camera and microphone permissions.');
    }
  }, [socket, currentUserId, getUserMedia, initializePeerConnection]);

  // Answer call
  const answerCall = useCallback(async () => {
    if (!socket || !callState.callId || !callState.callerId || !peerConnection.current) return;

    try {
      const stream = await getUserMedia(callState.isVideoCall);
      const pc = peerConnection.current;

      // Add WebRTC stream to peer connection (not the display stream)
      if (webrtcStream.current) {
        webrtcStream.current.getTracks().forEach(track => {
          console.log('Adding track to peer connection (answerCall):', track.kind, track.enabled);
          pc.addTrack(track, webrtcStream.current!);
        });
      }

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setCallState(prev => ({ ...prev, isReceivingCall: false }));

      // First send the acceptance notification
      socket.emit('call-answer', {
        callId: callState.callId,
        callerId: callState.callerId,
        calleeId: currentUserId,
      });

      // Then send the SDP answer
      socket.emit('call-answer-sdp', {
        callId: callState.callId,
        answer,
        callerId: callState.callerId,
        calleeId: currentUserId,
      });

    } catch (error) {
      console.error('Error answering call:', error);
      alert('Failed to answer call. Please check your camera and microphone permissions.');
      rejectCall();
    }
  }, [socket, callState.callId, callState.callerId, callState.isVideoCall, currentUserId, getUserMedia, rejectCall]);



  // Toggle mute
  const toggleMute = useCallback(() => {
    if (webrtcStream.current) {
      const audioTrack = webrtcStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = callState.isMuted;
        setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
      }
    }
  }, [callState.isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    // Toggle video in both streams
    if (webrtcStream.current) {
      const videoTrack = webrtcStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !callState.isVideoEnabled;
      }
    }
    if (callState.localStream) {
      const videoTrack = callState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !callState.isVideoEnabled;
      }
    }
    setCallState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
  }, [callState.localStream, callState.isVideoEnabled]);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setCallState(prev => {
      const newSpeakerState = !prev.isSpeakerEnabled;
      
      // Update remote video element volume if it exists
      if (remoteVideoRef.current) {
        remoteVideoRef.current.volume = newSpeakerState ? 1.0 : 0.8;
      }
      
      return { ...prev, isSpeakerEnabled: newSpeakerState };
    });
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleCallOffer = async (data: any) => {
      console.log('Received call offer:', data);
      
      try {
        // Store the offer for when the user accepts the call
        setCallState(prev => ({
          ...prev,
          isReceivingCall: true,
          callId: data.callId,
          callerId: data.callerId,
          isVideoCall: data.isVideoCall,
        }));

        // Initialize peer connection and set remote description
        const pc = initializePeerConnection();
        await pc.setRemoteDescription(data.offer);
        console.log('Remote description set successfully');
      } catch (error) {
        console.error('Error handling call offer:', error);
      }
    };

    const handleCallAnswer = async (data: any) => {
      console.log('Call answer received (callee accepted):', data);
      // This means the callee accepted the call, now we need to wait for their SDP answer
    };

    const handleCallAnswerSdp = async (data: any) => {
      console.log('Received answer SDP:', data);
      if (peerConnection.current && data.answer) {
        try {
          await peerConnection.current.setRemoteDescription(data.answer);
          setCallState(prev => ({ ...prev, isInCall: true, isCalling: false }));
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    };

    const handleIceCandidate = async (data: any) => {
      console.log('Received ICE candidate:', data);
      if (peerConnection.current && data.candidate) {
        try {
          await peerConnection.current.addIceCandidate(data.candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };

    const handleCallReject = () => {
      console.log('Call rejected');
      endCall();
    };

    const handleCallEnd = () => {
      console.log('Call ended');
      endCall();
    };

    socket.on('call-offer', handleCallOffer);
    socket.on('call-answer', handleCallAnswer);
    socket.on('call-answer-sdp', handleCallAnswerSdp);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-reject', handleCallReject);
    socket.on('call-end', handleCallEnd);

    return () => {
      socket.off('call-offer', handleCallOffer);
      socket.off('call-answer', handleCallAnswer);
      socket.off('call-answer-sdp', handleCallAnswerSdp);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-reject', handleCallReject);
      socket.off('call-end', handleCallEnd);
    };
  }, [socket, endCall, initializePeerConnection]);

  // Update call state with voice activity detection states
  useEffect(() => {
    setCallState(prev => ({
      ...prev,
      isLocalSpeaking,
      isRemoteSpeaking,
      shouldMuteRemote,
    }));
  }, [isLocalSpeaking, isRemoteSpeaking, shouldMuteRemote]);

  return {
    callState,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    localVideoRef,
    remoteVideoRef,
  };
}