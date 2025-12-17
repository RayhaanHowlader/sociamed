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
      console.log('Received remote stream');
      const [remoteStream] = event.streams;
      setCallState(prev => ({ ...prev, remoteStream }));
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          callId: callState.callId,
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
  }, [socket, callState.callId]);

  // Get user media
  const getUserMedia = useCallback(async (isVideoCall: boolean) => {
    try {
      const constraints = {
        audio: true,
        video: isVideoCall ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
    if (!socket || !callState.callId || !callState.callerId) return;

    try {
      const stream = await getUserMedia(callState.isVideoCall);
      const pc = initializePeerConnection();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      setCallState(prev => ({ ...prev, isReceivingCall: false, isInCall: true }));

      // Send answer
      socket.emit('call-answer', {
        callId: callState.callId,
        callerId: callState.callerId,
        calleeId: currentUserId,
      });

    } catch (error) {
      console.error('Error answering call:', error);
      alert('Failed to answer call. Please check your camera and microphone permissions.');
      rejectCall();
    }
  }, [socket, callState.callId, callState.callerId, callState.isVideoCall, currentUserId, getUserMedia, initializePeerConnection]);

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

  // End call
  const endCall = useCallback(() => {
    if (socket && callState.callId) {
      socket.emit('call-end', {
        callId: callState.callId,
        userId: currentUserId,
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
  }, [socket, callState.callId, callState.localStream, currentUserId]);

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
      setCallState(prev => ({
        ...prev,
        isReceivingCall: true,
        callId: data.callId,
        callerId: data.callerId,
        isVideoCall: data.isVideoCall,
      }));
    };

    const handleCallAnswer = async (data: any) => {
      console.log('Call answered:', data);
      if (peerConnection.current) {
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        socket.emit('call-answer-sdp', {
          callId: data.callId,
          answer,
        });
      }
    };

    const handleCallAnswerSdp = async (data: any) => {
      console.log('Received answer SDP:', data);
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(data.answer);
      }
    };

    const handleIceCandidate = async (data: any) => {
      console.log('Received ICE candidate:', data);
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(data.candidate);
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
  }, [socket, endCall]);

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