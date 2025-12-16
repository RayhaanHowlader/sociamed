'use client';

import { useRef, useState, useCallback } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const initializeCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Initialize MediaRecorder with fallback mimeTypes
      let mediaRecorder;
      
      // Try different mimeTypes for better browser compatibility
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];

      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          mediaRecorder = new MediaRecorder(stream, { mimeType });
          console.log('Using mimeType:', mimeType);
          break;
        }
      }

      if (!mediaRecorder) {
        // Fallback without specifying mimeType
        mediaRecorder = new MediaRecorder(stream);
        console.log('Using default MediaRecorder mimeType');
      }

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      return { stream, mediaRecorder };

    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setHasPermission(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access to record videos.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera to record videos.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
      
      throw err;
    }
  }, [facingMode]);

  const cleanup = useCallback(() => {
    // Stop recording if in progress
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Reset state
    setHasPermission(null);
    setError(null);
  }, [isRecording]);

  const startRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      // Clear any existing chunks
      chunksRef.current = [];
      
      // Start recording with timeslice to ensure data is captured
      mediaRecorderRef.current.start(1000); // Request data every 1 second
      setIsRecording(true);
      console.log('Recording started');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  return {
    videoRef,
    mediaRecorderRef,
    chunksRef,
    isRecording,
    hasPermission,
    error,
    facingMode,
    initializeCamera,
    cleanup,
    startRecording,
    stopRecording,
    switchCamera,
  };
}