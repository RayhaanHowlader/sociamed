'use client';

import { useRef, useCallback, useEffect } from 'react';

interface AudioManagementOptions {
  enableEchoCancellation?: boolean;
  enableNoiseSuppression?: boolean;
  enableAutoGainControl?: boolean;
  localAudioGain?: number;
  remoteAudioGain?: number;
}

export function useAudioManagement(options: AudioManagementOptions = {}) {
  const audioContext = useRef<AudioContext | null>(null);
  const localGainNode = useRef<GainNode | null>(null);
  const remoteGainNode = useRef<GainNode | null>(null);
  const localSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSource = useRef<MediaStreamAudioSourceNode | null>(null);

  const {
    enableEchoCancellation = true,
    enableNoiseSuppression = true,
    enableAutoGainControl = true,
    localAudioGain = 0.7, // Reduce local gain to prevent echo
    remoteAudioGain = 1.0,
  } = options;

  // Initialize audio context
  const initializeAudioContext = useCallback(async () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume context if suspended
        if (audioContext.current.state === 'suspended') {
          await audioContext.current.resume();
        }
      }
      return audioContext.current;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return null;
    }
  }, []);

  // Process local audio stream to prevent echo
  const processLocalAudio = useCallback(async (stream: MediaStream) => {
    const context = await initializeAudioContext();
    if (!context || !stream) return stream;

    try {
      // Clean up existing nodes
      if (localSource.current) {
        localSource.current.disconnect();
      }
      if (localGainNode.current) {
        localGainNode.current.disconnect();
      }

      // Create source from stream
      localSource.current = context.createMediaStreamSource(stream);
      
      // Create gain node for local audio
      localGainNode.current = context.createGain();
      localGainNode.current.gain.value = localAudioGain;

      // Connect nodes
      localSource.current.connect(localGainNode.current);
      
      // Apply audio constraints to tracks
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.applyConstraints({
          echoCancellation: enableEchoCancellation,
          noiseSuppression: enableNoiseSuppression,
          autoGainControl: enableAutoGainControl,
          // Additional constraints to prevent echo
          googEchoCancellation: enableEchoCancellation,
          googAutoGainControl: enableAutoGainControl,
          googNoiseSuppression: enableNoiseSuppression,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
        }).catch(e => console.log('Could not apply audio constraints:', e));
      });

      console.log('Local audio processing initialized with gain:', localAudioGain);
      return stream;
    } catch (error) {
      console.error('Failed to process local audio:', error);
      return stream;
    }
  }, [initializeAudioContext, localAudioGain, enableEchoCancellation, enableNoiseSuppression, enableAutoGainControl]);

  // Process remote audio stream
  const processRemoteAudio = useCallback(async (stream: MediaStream) => {
    const context = await initializeAudioContext();
    if (!context || !stream) return stream;

    try {
      // Clean up existing nodes
      if (remoteSource.current) {
        remoteSource.current.disconnect();
      }
      if (remoteGainNode.current) {
        remoteGainNode.current.disconnect();
      }

      // Create source from stream
      remoteSource.current = context.createMediaStreamSource(stream);
      
      // Create gain node for remote audio
      remoteGainNode.current = context.createGain();
      remoteGainNode.current.gain.value = remoteAudioGain;

      // Connect to destination (speakers)
      remoteSource.current.connect(remoteGainNode.current);
      remoteGainNode.current.connect(context.destination);

      console.log('Remote audio processing initialized with gain:', remoteAudioGain);
      return stream;
    } catch (error) {
      console.error('Failed to process remote audio:', error);
      return stream;
    }
  }, [initializeAudioContext, remoteAudioGain]);

  // Configure audio element to prevent echo
  const configureAudioElement = useCallback((element: HTMLVideoElement | HTMLAudioElement, isLocal: boolean) => {
    if (!element) return;

    // Local elements should always be muted to prevent echo
    element.muted = isLocal;
    
    // Set additional properties
    element.playsInline = true;
    element.autoplay = true;
    
    // Try to set audio output device
    if ('setSinkId' in element && !isLocal) {
      (element as any).setSinkId('default').catch((e: any) => {
        console.log('setSinkId not supported or failed:', e);
      });
    }

    // Add event listeners for debugging
    element.addEventListener('play', () => {
      console.log(`${isLocal ? 'Local' : 'Remote'} audio element started playing`);
    });

    element.addEventListener('pause', () => {
      console.log(`${isLocal ? 'Local' : 'Remote'} audio element paused`);
    });

    element.addEventListener('volumechange', () => {
      console.log(`${isLocal ? 'Local' : 'Remote'} audio volume changed:`, element.volume, 'muted:', element.muted);
    });
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    try {
      if (localSource.current) {
        localSource.current.disconnect();
        localSource.current = null;
      }
      if (remoteSource.current) {
        remoteSource.current.disconnect();
        remoteSource.current = null;
      }
      if (localGainNode.current) {
        localGainNode.current.disconnect();
        localGainNode.current = null;
      }
      if (remoteGainNode.current) {
        remoteGainNode.current.disconnect();
        remoteGainNode.current = null;
      }
      if (audioContext.current) {
        audioContext.current.close().catch(e => console.log('Audio context close error:', e));
        audioContext.current = null;
      }
    } catch (error) {
      console.error('Audio cleanup error:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    processLocalAudio,
    processRemoteAudio,
    configureAudioElement,
    cleanup,
    audioContext: audioContext.current,
  };
}