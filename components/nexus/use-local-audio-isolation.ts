'use client';

import { useRef, useCallback, useEffect } from 'react';

interface LocalAudioIsolationOptions {
  enabled?: boolean;
  debugLogging?: boolean;
}

interface LocalAudioIsolation {
  isolateLocalAudio: (stream: MediaStream) => MediaStream;
  ensureLocalMuting: (videoElement: HTMLVideoElement | HTMLAudioElement) => void;
  cleanup: () => void;
}

export function useLocalAudioIsolation(options: LocalAudioIsolationOptions = {}): LocalAudioIsolation {
  const {
    enabled = true,
    debugLogging = true,
  } = options;

  const audioContext = useRef<AudioContext | null>(null);
  const localGainNode = useRef<GainNode | null>(null);
  const isolatedElements = useRef<Set<HTMLVideoElement | HTMLAudioElement>>(new Set());

  const log = useCallback((message: string, ...args: any[]) => {
    if (debugLogging) {
      console.log(`[LOCAL-ISOLATION] ${message}`, ...args);
    }
  }, [debugLogging]);

  // Isolate local audio to prevent self-hearing
  const isolateLocalAudio = useCallback((stream: MediaStream): MediaStream => {
    if (!enabled) {
      log('❌ Local audio isolation disabled');
      return stream;
    }

    try {
      log('🔇 Starting local audio isolation process');
      log('📊 Input stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id })));

      // Create audio context if needed
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        log('🎵 Audio context created');
      }

      const audioTracks = stream.getAudioTracks();
      log(`🎤 Found ${audioTracks.length} audio tracks to isolate`);

      if (audioTracks.length > 0) {
        // Create source from local stream
        const source = audioContext.current.createMediaStreamSource(stream);
        log('🔌 Audio source created from local stream');

        // Create gain node for complete local muting
        if (!localGainNode.current) {
          localGainNode.current = audioContext.current.createGain();
          localGainNode.current.gain.value = 0; // COMPLETE SILENCE for local playback
          log('🔇 Local gain node created with gain = 0 (complete silence)');
        }

        // Connect source to gain node (but NOT to destination)
        source.connect(localGainNode.current);
        log('🔗 Local audio connected to gain node (isolated from speakers)');

        // CRITICAL: Do NOT connect to audioContext.destination
        log('⚠️ CRITICAL: Local audio NOT connected to speakers (prevents self-hearing)');

        // Apply additional constraints to audio tracks
        audioTracks.forEach((track, index) => {
          log(`🎛️ Configuring audio track ${index + 1}/${audioTracks.length}:`);
          log(`   - Track ID: ${track.id}`);
          log(`   - Track enabled: ${track.enabled}`);
          log(`   - Track muted: ${track.muted}`);
          log(`   - Track readyState: ${track.readyState}`);

          // Apply constraints to prevent local monitoring
          track.applyConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }).then(() => {
            log(`✅ Audio constraints applied to track ${index + 1}`);
          }).catch(e => {
            log(`❌ Failed to apply constraints to track ${index + 1}:`, e);
          });

          // Disable any local monitoring properties
          if ('monitor' in track) {
            (track as any).monitor = false;
            log(`🔇 Local monitoring disabled for track ${index + 1}`);
          }
        });
      }

      log('✅ Local audio isolation completed');
      return stream; // Return original stream for WebRTC transmission

    } catch (error) {
      log('❌ Local audio isolation failed:', error);
      return stream;
    }
  }, [enabled, log]);

  // Ensure video/audio elements never play local audio
  const ensureLocalMuting = useCallback((element: HTMLVideoElement | HTMLAudioElement) => {
    if (!enabled || !element) return;

    log('🔇 Ensuring local element muting');
    log('📺 Element type:', element.tagName);
    log('🔊 Element current state:', {
      muted: element.muted,
      volume: element.volume,
      src: element.src ? 'has src' : 'no src',
      srcObject: element.srcObject ? 'has srcObject' : 'no srcObject'
    });

    // CRITICAL: Always mute local elements
    element.muted = true;
    element.volume = 0;
    log('🔇 Element muted = true, volume = 0');

    // Add to tracked elements
    isolatedElements.current.add(element);
    log('📝 Element added to isolation tracking');

    // Add event listeners to prevent unmuting
    const preventUnmute = (e: Event) => {
      if (!element.muted || element.volume > 0) {
        log('⚠️ PREVENTING LOCAL UNMUTE - Element tried to unmute itself!');
        element.muted = true;
        element.volume = 0;
        log('🔇 Forced element back to muted state');
      }
    };

    element.addEventListener('volumechange', preventUnmute);
    element.addEventListener('play', () => {
      log('▶️ Local element started playing (muted)');
      if (!element.muted) {
        log('⚠️ WARNING: Local element playing unmuted - fixing!');
        element.muted = true;
        element.volume = 0;
      }
    });

    element.addEventListener('pause', () => {
      log('⏸️ Local element paused');
    });

    log('✅ Local element muting enforced with event listeners');

  }, [enabled, log]);

  // Cleanup function
  const cleanup = useCallback(() => {
    log('🧹 Starting local audio isolation cleanup');

    // Clean up audio context
    if (audioContext.current) {
      audioContext.current.close().then(() => {
        log('🎵 Audio context closed');
      }).catch(e => {
        log('❌ Audio context close error:', e);
      });
      audioContext.current = null;
    }

    // Clean up gain node
    if (localGainNode.current) {
      localGainNode.current.disconnect();
      localGainNode.current = null;
      log('🔌 Local gain node disconnected');
    }

    // Clean up tracked elements
    isolatedElements.current.forEach(element => {
      element.muted = true;
      element.volume = 0;
    });
    isolatedElements.current.clear();
    log('📺 All tracked elements cleaned up');

    log('✅ Local audio isolation cleanup completed');
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isolateLocalAudio,
    ensureLocalMuting,
    cleanup,
  };
}