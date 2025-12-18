'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface VoiceActivityOptions {
  threshold?: number; // Volume threshold for voice detection (0-100)
  silenceDelay?: number; // Delay before unmuting after silence (ms)
  enabled?: boolean;
}

interface VoiceActivityDetection {
  isLocalSpeaking: boolean;
  isRemoteSpeaking: boolean;
  shouldMuteRemote: boolean;
  startDetection: (localStream: MediaStream, remoteStream: MediaStream) => void;
  stopDetection: () => void;
}

export function useVoiceActivityDetection(options: VoiceActivityOptions = {}): VoiceActivityDetection {
  const {
    threshold = 30, // Voice detection threshold (0-100)
    silenceDelay = 500, // 500ms delay before unmuting
    enabled = true,
  } = options;

  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [shouldMuteRemote, setShouldMuteRemote] = useState(false);

  const localAnalyzer = useRef<AnalyserNode | null>(null);
  const remoteAnalyzer = useRef<AnalyserNode | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const animationFrame = useRef<number | null>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);

  // Voice activity detection function
  const detectVoiceActivity = useCallback(() => {
    if (!localAnalyzer.current || !remoteAnalyzer.current || !enabled) return;

    // Analyze local audio (your voice)
    const localDataArray = new Uint8Array(localAnalyzer.current.frequencyBinCount);
    localAnalyzer.current.getByteFrequencyData(localDataArray);
    
    // Calculate local volume level
    const localVolume = localDataArray.reduce((sum, value) => sum + value, 0) / localDataArray.length;
    const localVolumePercent = Math.round((localVolume / 255) * 100);
    
    // Analyze remote audio (other person's voice)
    const remoteDataArray = new Uint8Array(remoteAnalyzer.current.frequencyBinCount);
    remoteAnalyzer.current.getByteFrequencyData(remoteDataArray);
    
    // Calculate remote volume level
    const remoteVolume = remoteDataArray.reduce((sum, value) => sum + value, 0) / remoteDataArray.length;
    const remoteVolumePercent = Math.round((remoteVolume / 255) * 100);

    // Determine if local user is speaking
    const localSpeaking = localVolumePercent > threshold;
    const remoteSpeaking = remoteVolumePercent > threshold;

    // Update speaking states
    if (localSpeaking !== isLocalSpeaking) {
      setIsLocalSpeaking(localSpeaking);
      console.log(`[VAD] Local speaking: ${localSpeaking} (volume: ${localVolumePercent}%)`);
    }

    if (remoteSpeaking !== isRemoteSpeaking) {
      setIsRemoteSpeaking(remoteSpeaking);
      console.log(`[VAD] Remote speaking: ${remoteSpeaking} (volume: ${remoteVolumePercent}%)`);
    }

    // Auto-mute logic: Mute remote when local is speaking
    if (localSpeaking && !shouldMuteRemote) {
      setShouldMuteRemote(true);
      console.log(`[VAD] 🔇 Auto-muting remote microphone (local speaking at ${localVolumePercent}%)`);
      
      // Clear any existing silence timer
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
        silenceTimer.current = null;
      }
    } else if (!localSpeaking && shouldMuteRemote) {
      // Start silence timer to unmute after delay
      if (!silenceTimer.current) {
        console.log(`[VAD] ⏱️ Starting silence timer (${silenceDelay}ms) to unmute remote`);
        silenceTimer.current = setTimeout(() => {
          setShouldMuteRemote(false);
          console.log(`[VAD] 🔊 Auto-unmuting remote microphone (local silent for ${silenceDelay}ms)`);
          silenceTimer.current = null;
        }, silenceDelay);
      }
    }

    // Continue monitoring
    animationFrame.current = requestAnimationFrame(detectVoiceActivity);
  }, [threshold, silenceDelay, enabled, isLocalSpeaking, isRemoteSpeaking, shouldMuteRemote]);

  // Start voice activity detection
  const startDetection = useCallback((localStream: MediaStream, remoteStream: MediaStream) => {
    if (!enabled) {
      console.log('[VAD] Voice activity detection disabled');
      return;
    }

    try {
      console.log('[VAD] 🎤 Starting voice activity detection');
      console.log(`[VAD] Settings - Threshold: ${threshold}%, Silence delay: ${silenceDelay}ms`);

      // Create audio context
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Set up local audio analysis
      const localAudioTracks = localStream.getAudioTracks();
      if (localAudioTracks.length > 0) {
        const localSource = audioContext.current.createMediaStreamSource(localStream);
        localAnalyzer.current = audioContext.current.createAnalyser();
        localAnalyzer.current.fftSize = 256;
        localAnalyzer.current.smoothingTimeConstant = 0.8;
        localSource.connect(localAnalyzer.current);
        console.log('[VAD] ✅ Local audio analyzer connected');
      }

      // Set up remote audio analysis
      const remoteAudioTracks = remoteStream.getAudioTracks();
      if (remoteAudioTracks.length > 0) {
        const remoteSource = audioContext.current.createMediaStreamSource(remoteStream);
        remoteAnalyzer.current = audioContext.current.createAnalyser();
        remoteAnalyzer.current.fftSize = 256;
        remoteAnalyzer.current.smoothingTimeConstant = 0.8;
        remoteSource.connect(remoteAnalyzer.current);
        console.log('[VAD] ✅ Remote audio analyzer connected');
      }

      // Start detection loop
      detectVoiceActivity();
      console.log('[VAD] 🔄 Voice activity detection loop started');

    } catch (error) {
      console.error('[VAD] ❌ Failed to start voice activity detection:', error);
    }
  }, [threshold, silenceDelay, enabled, detectVoiceActivity]);

  // Stop voice activity detection
  const stopDetection = useCallback(() => {
    console.log('[VAD] 🛑 Stopping voice activity detection');

    // Stop animation frame
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }

    // Clear silence timer
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }

    // Clean up audio context
    if (audioContext.current) {
      audioContext.current.close().catch(e => console.log('[VAD] Audio context close error:', e));
      audioContext.current = null;
    }

    // Reset analyzers
    localAnalyzer.current = null;
    remoteAnalyzer.current = null;

    // Reset states
    setIsLocalSpeaking(false);
    setIsRemoteSpeaking(false);
    setShouldMuteRemote(false);

    console.log('[VAD] ✅ Voice activity detection stopped and cleaned up');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return stopDetection;
  }, [stopDetection]);

  return {
    isLocalSpeaking,
    isRemoteSpeaking,
    shouldMuteRemote,
    startDetection,
    stopDetection,
  };
}