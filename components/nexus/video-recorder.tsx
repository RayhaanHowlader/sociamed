'use client';

import { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Square, RotateCcw, Check, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCamera } from './use-camera';

interface VideoRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoRecorded: (videoBlob: Blob, videoUrl: string) => void;
}

export function VideoRecorder({ open, onOpenChange, onVideoRecorded }: VideoRecorderProps) {
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
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
  } = useCamera();

  // Initialize camera when modal opens
  useEffect(() => {
    if (open) {
      initializeCameraWithRecorder();
    } else {
      // Clean up when closing
      cleanup();
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
      setRecordedVideoUrl(null);
      setRecordingTime(0);
      chunksRef.current = [];
    }

    return () => {
      cleanup();
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [open, facingMode]);

  const initializeCameraWithRecorder = async () => {
    try {
      await initializeCamera();
      
      // Set up MediaRecorder event handlers
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = (event) => {
          console.log('Data available:', event.data.size);
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          console.log('Recording stopped, chunks:', chunksRef.current.length);
          if (chunksRef.current.length > 0) {
            // Use the same mimeType as the MediaRecorder
            const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
            const blob = new Blob(chunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob);
            setRecordedVideoUrl(url);
            console.log('Video blob created on stop:', { 
              size: blob.size, 
              chunks: chunksRef.current.length, 
              mimeType,
              url: url.substring(0, 50) + '...'
            });
            
            // Test if the blob URL is valid
            const testVideo = document.createElement('video');
            testVideo.src = url;
            testVideo.onloadeddata = () => {
              console.log('Video URL is valid and loadable');
            };
            testVideo.onerror = (e) => {
              console.error('Video URL test failed:', e);
            };
          } else {
            console.error('No chunks available when recording stopped');
          }
        };

        mediaRecorderRef.current.onerror = (event) => {
          console.error('MediaRecorder error:', event);
        };
      }
    } catch (err) {
      console.error('Failed to initialize camera:', err);
    }
  };

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    startRecording();
    setRecordingTime(0);
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const retakeVideo = () => {
    // Clean up previous recording
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    
    setRecordedVideoUrl(null);
    setRecordingTime(0);
    chunksRef.current = [];
    
    // Reinitialize camera
    initializeCameraWithRecorder();
  };

  const confirmVideo = () => {
    if (recordedVideoUrl && chunksRef.current.length > 0) {
      // Create blob from recorded chunks using the MediaRecorder's mimeType
      const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      console.log('Confirming video:', { size: blob.size, type: blob.type, chunks: chunksRef.current.length });
      
      if (blob.size === 0) {
        console.error('Created blob is empty');
        alert('Recording failed - no video data captured. Please try again.');
        return;
      }
      
      // Create a new URL for the story modal (don't reuse the existing one)
      const newVideoUrl = URL.createObjectURL(blob);
      console.log('Created new video URL for story modal:', newVideoUrl.substring(0, 50) + '...');
      
      onVideoRecorded(blob, newVideoUrl);
      onOpenChange(false);
    } else {
      console.error('No video data available:', { 
        hasUrl: !!recordedVideoUrl, 
        chunksLength: chunksRef.current.length 
      });
      alert('No video data recorded. Please try recording again.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Record Video Story
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '9/16', height: '400px' }}>
            {hasPermission === null && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600">Initializing camera...</p>
                </div>
              </div>
            )}

            {hasPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                <div className="text-center p-4">
                  <VideoOff className="w-12 h-12 mx-auto mb-2 text-red-500" />
                  <p className="text-sm text-slate-600 mb-2">{error}</p>
                  <Button onClick={initializeCamera} size="sm">
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {hasPermission && !recordedVideoUrl && (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                
                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                  </div>
                )}

                {/* Camera switch button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
                  onClick={switchCamera}
                  disabled={isRecording}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </>
            )}

            {recordedVideoUrl && (
              <video
                src={recordedVideoUrl}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            )}
          </div>

          {/* Controls */}
          {hasPermission && (
            <div className="flex items-center justify-center gap-4">
              {!recordedVideoUrl ? (
                <>
                  {!isRecording ? (
                    <Button
                      onClick={handleStartRecording}
                      className="bg-red-600 hover:bg-red-700 rounded-full w-16 h-16"
                      size="icon"
                    >
                      <div className="w-6 h-6 bg-white rounded-full" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopRecording}
                      className="bg-red-600 hover:bg-red-700 rounded-full w-16 h-16"
                      size="icon"
                    >
                      <Square className="w-6 h-6 text-white fill-white" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={retakeVideo}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retake
                  </Button>
                  <Button
                    onClick={confirmVideo}
                    className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Use Video
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Recording tips */}
          {hasPermission && !isRecording && !recordedVideoUrl && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Tips:</strong> Tap the red button to start recording. Keep your story under 30 seconds for best engagement!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}