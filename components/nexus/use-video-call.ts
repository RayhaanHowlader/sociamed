'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';

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
  });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

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

    // Clean up streams
    if (callState.localStream) {
      callState.localStream.getTracks().forEach(track => track.stop());
    }

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
    });
  }, [socket, callState.callId, callState.callerId, currentUserId]);

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    peerConnection.current = new RTCPeerConnection(configuration);

    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
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
      
      setCallState(prev => ({ ...prev, remoteStream }));
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
      
      // Ensure audio tracks are enabled
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        console.log('Audio track enabled:', track.enabled, 'readyState:', track.readyState);
        track.enabled = true;
      });
      
      setCallState(prev => ({ ...prev, localStream: stream, isVideoCall }));
      return stream;
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

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection (startCall):', track);
        pc.addTrack(track, stream);
      });

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

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection (answerCall):', track);
        pc.addTrack(track, stream);
      });

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
    if (callState.localStream) {
      const audioTrack = callState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = callState.isMuted;
        setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
      }
    }
  }, [callState.localStream, callState.isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (callState.localStream) {
      const videoTrack = callState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !callState.isVideoEnabled;
        setCallState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
      }
    }
  }, [callState.localStream, callState.isVideoEnabled]);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setCallState(prev => ({ ...prev, isSpeakerEnabled: !prev.isSpeakerEnabled }));
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