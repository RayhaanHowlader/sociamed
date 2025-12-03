'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseVoiceCallProps {
  socket: Socket | null;
  currentUserId: string | null;
  friendId: string | null;
}

interface CallState {
  isCalling: boolean;
  isReceivingCall: boolean;
  isInCall: boolean;
  callId: string | null;
  callerId: string | null;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  isMuted: boolean;
  pendingOffer: RTCSessionDescriptionInit | null;
}

export function useVoiceCall({ socket, currentUserId, friendId }: UseVoiceCallProps) {
  const [callState, setCallState] = useState<CallState>({
    isCalling: false,
    isReceivingCall: false,
    isInCall: false,
    callId: null,
    callerId: null,
    remoteStream: null,
    localStream: null,
    isMuted: false,
    pendingOffer: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Cleanup function - use ref to avoid dependency issues
  const remoteStreamRef = useRef<MediaStream | null>(null);
  
  // Update ref when remote stream changes
  useEffect(() => {
    remoteStreamRef.current = callState.remoteStream;
  }, [callState.remoteStream]);
  
  const cleanup = useCallback(() => {
    console.log('Cleanup called - closing call');
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    setCallState({
      isCalling: false,
      isReceivingCall: false,
      isInCall: false,
      callId: null,
      callerId: null,
      remoteStream: null,
      localStream: null,
      isMuted: false,
      pendingOffer: null,
    });
    callIdRef.current = null;
  }, []); // No dependencies to avoid unnecessary recreations

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && currentUserId && friendId && callIdRef.current) {
        socket.emit('call:ice-candidate', {
          fromUserId: currentUserId,
          toUserId: friendId,
          candidate: event.candidate,
          callId: callIdRef.current,
        });
      }
    };

    // Handle remote stream - listen to all tracks
    let remoteStream: MediaStream | null = null;
    
    pc.ontrack = (event) => {
      console.log('Received remote track (outgoing):', event);
      
      // Get or create remote stream
      if (event.streams && event.streams.length > 0) {
        remoteStream = event.streams[0];
      } else if (event.track) {
        if (!remoteStream) {
          remoteStream = new MediaStream();
        }
        remoteStream.addTrack(event.track);
      }
      
      if (remoteStream) {
        console.log('Remote stream received (outgoing):', remoteStream);
        setCallState((prev) => {
          if (prev.remoteStream) {
            event.track && !prev.remoteStream.getTracks().includes(event.track) && prev.remoteStream.addTrack(event.track);
            // Ensure isInCall stays true even when merging tracks
            return {
              ...prev,
              isInCall: true,
              isCalling: false,
              isReceivingCall: false,
            };
          }
          return {
            ...prev,
            remoteStream: remoteStream!,
            isInCall: true,
            isCalling: false,
            isReceivingCall: false,
          };
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state changed (outgoing):', pc.connectionState);
      // Only cleanup on actual disconnection or failure, not on connecting/connected states
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log('Connection disconnected or failed, cleaning up...');
        cleanup();
      } else if (pc.connectionState === 'connected') {
        console.log('Connection established successfully');
        // Ensure isInCall stays true when connected
        setCallState((prev) => ({
          ...prev,
          isInCall: true,
          isCalling: false,
          isReceivingCall: false,
        }));
      }
    };

    return pc;
  }, [socket, currentUserId, friendId, cleanup]);

  // Initialize call (outgoing)
  const initiateCall = useCallback(async () => {
    if (!socket || !currentUserId || !friendId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const callId = `${Date.now()}-${currentUserId}`;
      callIdRef.current = callId;

      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setCallState((prev) => ({
        ...prev,
        isCalling: true,
        isInCall: false, // Will be set to true when answer is received
        localStream: stream,
        callId,
      }));

      // Send offer
      socket.emit('call:offer', {
        fromUserId: currentUserId,
        toUserId: friendId,
        offer,
        callId,
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      cleanup();
      alert('Failed to start call. Please check your microphone permissions.');
    }
  }, [socket, currentUserId, friendId, createPeerConnection, cleanup]);

  // Answer call (incoming)
  const answerCall = useCallback(async () => {
    if (!socket || !currentUserId || !callState.callId || !callState.callerId || !callState.pendingOffer) {
      console.error('Cannot answer call - missing required data:', {
        socket: !!socket,
        currentUserId: !!currentUserId,
        callId: callState.callId,
        callerId: callState.callerId,
        pendingOffer: !!callState.pendingOffer,
      });
      return;
    }

    try {
      console.log('Answering call...');
      
      // Immediately set isInCall to true and close incoming dialog
      setCallState((prev) => ({
        ...prev,
        isReceivingCall: false,
        isInCall: true,
      }));

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      // Store the caller ID as the friend ID for this call
      const callerId = callState.callerId;
      const callId = callState.callId;
      
      // Create peer connection with caller as friendId
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      
      peerConnectionRef.current = pc;
      callIdRef.current = callId;

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && currentUserId && callerId && callIdRef.current) {
          socket.emit('call:ice-candidate', {
            fromUserId: currentUserId,
            toUserId: callerId,
            candidate: event.candidate,
            callId: callIdRef.current,
          });
        }
      };

      // Handle remote stream - listen to all tracks
      let remoteStream: MediaStream | null = null;
      
      pc.ontrack = (event) => {
        console.log('Received remote track:', event);
        
        // Get or create remote stream
        if (event.streams && event.streams.length > 0) {
          remoteStream = event.streams[0];
        } else if (event.track) {
          // If no stream, check if we already have one or create new
          if (!remoteStream) {
            remoteStream = new MediaStream();
          }
          remoteStream.addTrack(event.track);
        }
        
        if (remoteStream) {
          console.log('Remote stream received:', remoteStream, 'Tracks:', remoteStream.getTracks());
          setCallState((prev) => {
            // Merge tracks if stream already exists
            if (prev.remoteStream) {
              event.track && !prev.remoteStream.getTracks().includes(event.track) && prev.remoteStream.addTrack(event.track);
              // Ensure isInCall stays true even when merging tracks
              return {
                ...prev,
                isInCall: true,
                isCalling: false,
                isReceivingCall: false,
              };
            }
            return {
              ...prev,
              remoteStream: remoteStream!,
              isInCall: true, // Keep isInCall true
              isCalling: false,
              isReceivingCall: false,
            };
          });
        }
      };
      
      // Also listen for addstream (older API, for compatibility)
      pc.addEventListener('addstream', (event: any) => {
        if (event.stream) {
          console.log('Received remote stream (addstream):', event.stream);
          setCallState((prev) => ({
            ...prev,
            remoteStream: event.stream,
            isInCall: true, // Keep isInCall true
            isCalling: false,
            isReceivingCall: false,
          }));
        }
      });

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state changed:', pc.connectionState);
        // Only cleanup on actual disconnection or failure, not on connecting/connected states
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          console.log('Connection disconnected or failed, cleaning up...');
          cleanup();
        } else if (pc.connectionState === 'connected') {
          console.log('Connection established successfully');
          // Ensure isInCall stays true when connected
          setCallState((prev) => ({
            ...prev,
            isInCall: true,
            isCalling: false,
            isReceivingCall: false,
          }));
        }
      };

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Set remote description from the offer
      await pc.setRemoteDescription(new RTCSessionDescription(callState.pendingOffer));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Update state with local stream
      setCallState((prev) => ({
        ...prev,
        localStream: stream,
        isReceivingCall: false,
        isInCall: true,
        pendingOffer: null,
      }));

      // Send answer
      socket.emit('call:answer', {
        fromUserId: currentUserId,
        toUserId: callerId,
        answer,
        callId: callState.callId,
      });
      
      console.log('Call answered, waiting for remote stream...');
      
      // Force audio context to be active (user interaction context)
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().catch((err) => {
          console.log('Initial audio play attempt (will retry):', err);
        });
      }
    } catch (error) {
      console.error('Error answering call:', error);
      cleanup();
      alert('Failed to answer call. Please check your microphone permissions.');
    }
  }, [socket, currentUserId, callState.callId, callState.callerId, callState.pendingOffer, cleanup]);

  // End call
  const endCall = useCallback(() => {
    const targetUserId = callState.callerId || friendId;
    if (socket && currentUserId && targetUserId && callIdRef.current) {
      socket.emit('call:end', {
        fromUserId: currentUserId,
        toUserId: targetUserId,
        callId: callIdRef.current,
      });
    }
    cleanup();
  }, [socket, currentUserId, friendId, callState.callerId, cleanup]);

  // Reject call
  const rejectCall = useCallback(() => {
    if (socket && currentUserId && callState.callId && callState.callerId) {
      socket.emit('call:reject', {
        fromUserId: currentUserId,
        toUserId: callState.callerId,
        callId: callState.callId,
      });
    }
    cleanup();
  }, [socket, currentUserId, callState.callId, callState.callerId, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = callState.isMuted;
      });
      setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, [callState.isMuted]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handleCallOffer = async ({ fromUserId, offer, callId }: any) => {
      // Accept calls from any friend (we'll check if they're a friend in the UI)
      console.log('Received call offer from:', fromUserId);
      
      // Ensure we're in the room for this call
      if (socket && currentUserId) {
        const roomId = [String(currentUserId), String(fromUserId)].sort().join(':');
        socket.emit('chat:join', { userId: currentUserId, friendId: fromUserId });
      }
      
      setCallState((prev) => ({
        ...prev,
        isReceivingCall: true,
        callId,
        callerId: fromUserId,
        pendingOffer: offer,
      }));
    };

    const handleCallAnswer = async ({ answer, callId: answerCallId }: any) => {
      // Only process answer for the current call
      if (peerConnectionRef.current && answer && answerCallId === callIdRef.current) {
        try {
          console.log('Received call answer, setting remote description...');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('Remote description set, call should be connected');
          setCallState((prev) => ({
            ...prev,
            isCalling: false,
            isInCall: true, // Ensure isInCall stays true
            isReceivingCall: false,
          }));
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    };

    const handleIceCandidate = async ({ candidate, callId: candidateCallId }: any) => {
      // Only process ICE candidates for the current call
      if (peerConnectionRef.current && candidate && candidateCallId === callIdRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };

    const handleCallEnd = ({ callId: endedCallId }: any) => {
      // Only cleanup if this is our current call
      if (!endedCallId || endedCallId === callIdRef.current) {
        cleanup();
      }
    };

    const handleCallReject = ({ callId: rejectedCallId }: any) => {
      // Only cleanup if this is our current call
      if (!rejectedCallId || rejectedCallId === callIdRef.current) {
        cleanup();
        setCallState((prev) => ({
          ...prev,
          isCalling: false,
        }));
      }
    };

    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:end', handleCallEnd);
    socket.on('call:reject', handleCallReject);

    return () => {
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:end', handleCallEnd);
      socket.off('call:reject', handleCallReject);
    };
  }, [socket, currentUserId, cleanup]);

  // Audio element refs setup
  useEffect(() => {
    if (callState.localStream && localAudioRef.current) {
      localAudioRef.current.srcObject = callState.localStream;
      localAudioRef.current.volume = 0; // Mute local audio to prevent feedback
      localAudioRef.current.play().catch((err) => console.error('Error playing local audio:', err));
    }
  }, [callState.localStream]);

  useEffect(() => {
    if (callState.remoteStream && remoteAudioRef.current) {
      console.log('Setting up remote audio element with stream:', callState.remoteStream);
      console.log('Stream tracks:', callState.remoteStream.getTracks());
      console.log('Stream active:', callState.remoteStream.active);
      
      const audioElement = remoteAudioRef.current;
      
      // Set up the audio element
      audioElement.srcObject = callState.remoteStream;
      audioElement.volume = 1.0;
      
      // Ensure audio plays - use multiple strategies
      const playAudio = async () => {
        try {
          // First, make sure the stream has active tracks
          const tracks = callState.remoteStream?.getAudioTracks();
          console.log('Audio tracks:', tracks);
          
          if (tracks && tracks.length > 0) {
            console.log('Track enabled:', tracks[0].enabled);
            console.log('Track readyState:', tracks[0].readyState);
          }
          
          // Try to play
          await audioElement.play();
          console.log('Remote audio playing successfully');
        } catch (err: any) {
          console.error('Error playing remote audio:', err);
          console.error('Error name:', err.name);
          console.error('Error message:', err.message);
          
          // If autoplay blocked, try again after a short delay
          setTimeout(async () => {
            try {
              if (audioElement && callState.remoteStream) {
                await audioElement.play();
                console.log('Remote audio playing on retry');
              }
            } catch (retryErr) {
              console.error('Retry play failed:', retryErr);
              // Last attempt after longer delay
              setTimeout(async () => {
                try {
                  if (audioElement && callState.remoteStream) {
                    await audioElement.play();
                    console.log('Remote audio playing on final retry');
                  }
                } catch (finalErr) {
                  console.error('Final retry failed:', finalErr);
                }
              }, 1000);
            }
          }, 300);
        }
      };
      
      // Listen for when stream becomes active
      if (!callState.remoteStream.active) {
        callState.remoteStream.getTracks().forEach((track) => {
          track.onended = () => {
            console.log('Track ended - but not cleaning up, call may still be active');
            // Don't cleanup on track end - the connection might still be active
          };
          track.onmute = () => console.log('Track muted');
          track.onunmute = () => {
            console.log('Track unmuted, trying to play');
            playAudio();
          };
        });
      }
      
      // Also listen to track state changes
      callState.remoteStream.getTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          console.log('Track ended event - readyState:', track.readyState);
          // Don't cleanup - just log
        });
      });
      
      // Wait a bit for the stream to be ready, then try to play
      setTimeout(playAudio, 200);
    }
  }, [callState.remoteStream]);

  // Cleanup on unmount - only when component actually unmounts
  useEffect(() => {
    return () => {
      // Only cleanup on actual unmount, not on re-renders
      console.log('Component unmounting, cleaning up call...');
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on unmount

  return {
    callState,
    initiateCall,
    answerCall,
    endCall,
    rejectCall,
    toggleMute,
    localAudioRef,
    remoteAudioRef,
  };
}
