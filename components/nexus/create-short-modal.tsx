'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, XCircle, Video, Circle, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface CreateShortModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  profile: { name: string; username: string; avatarUrl?: string } | null;
  onShortCreated: () => void;
}

export function CreateShortModal({
  open,
  onOpenChange,
  onClose,
  profile,
  onShortCreated,
}: CreateShortModalProps) {
  const [caption, setCaption] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [recordingMode, setRecordingMode] = useState<'upload' | 'record'>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error('Error playing video:', err);
      });
    }
    return () => {
      if (videoRef.current && !stream) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  const closeModal = () => {
    // Stop recording if active
    if (isRecording && mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    // Stop stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setCaption('');
    setVideoFile(null);
    setVideoPreview('');
    setVideoDuration(0);
    setError('');
    setRecordingMode('upload');
    setIsRecording(false);
    setRecordedBlob(null);
    setRecordingTime(0);
    setMediaRecorder(null);
    chunksRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const handleFileChange = (file: File) => {
    setError('');

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError('Video file is too large. Maximum size is 100MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      const duration = video.duration || 0;

      const maxDuration = recordingMode === 'record' ? 30 : 60;
      if (duration > maxDuration) {
        setError(`Video must be ${maxDuration} seconds or shorter.`);
        setVideoFile(null);
        setVideoPreview('');
        setVideoDuration(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        URL.revokeObjectURL(url);
        return;
      }

      setVideoFile(file);
      setVideoPreview(url);
      setVideoDuration(duration);
    };

    video.onerror = () => {
      setError('Failed to load video. Please select a valid video file.');
      setVideoFile(null);
      setVideoPreview('');
      setVideoDuration(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      URL.revokeObjectURL(url);
    };

    video.src = url;
  };

  const clearSelectedVideo = () => {
    // Stop recording if active
    if (isRecording && mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    // Stop stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setVideoFile(null);
    setVideoPreview('');
    setVideoDuration(0);
    setRecordedBlob(null);
    setIsRecording(false);
    setRecordingTime(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true,
      });
      
      setStream(mediaStream);

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        
        // Create preview URL
        const url = URL.createObjectURL(blob);
        setVideoPreview(url);
        
        // Get duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const duration = video.duration || 0;
          setVideoDuration(duration);
          
          // Validate duration (30 seconds max for recorded videos)
          if (duration > 30) {
            setError('Recorded video must be 30 seconds or shorter.');
            setRecordedBlob(null);
            setVideoPreview('');
            setVideoDuration(0);
            URL.revokeObjectURL(url);
            return;
          }
          
          // Convert blob to File
          const file = new File([blob], `short-${Date.now()}.webm`, { type: 'video/webm' });
          setVideoFile(file);
        };
        video.onerror = () => {
          setError('Failed to process recorded video.');
          setRecordedBlob(null);
          setVideoPreview('');
          setVideoDuration(0);
          URL.revokeObjectURL(url);
        };
        video.src = url;
        
        // Stop all tracks
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 0.1;
          if (newTime >= 30) {
            // Auto-stop at 30 seconds
            stopRecording();
            return 30;
          }
          return newTime;
        });
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleCreateShort = async () => {
    if (!profile) {
      setError('Complete your profile before creating shorts.');
      return;
    }

    if (!videoFile) {
      setError('Select a short video to upload.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('file', videoFile);

      const uploadRes = await fetch('/api/shorts/upload', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });

      let uploadData;
      try {
        uploadData = await uploadRes.json();
      } catch (parseError) {
        console.error('Failed to parse upload response:', parseError);
        setError('Failed to upload video. Please try again.');
        setUploading(false);
        return;
      }

      if (!uploadRes.ok) {
        const errorMessage = uploadData.details || uploadData.error || 'Failed to upload video.';
        setError(errorMessage);
        setUploading(false);
        return;
      }

      if (!uploadData.url || !uploadData.publicId) {
        setError('Invalid response from server. Please try again.');
        setUploading(false);
        return;
      }

      const res = await fetch('/api/shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          caption,
          videoUrl: uploadData.url,
          videoPublicId: uploadData.publicId,
          duration: videoDuration,
        }),
      });

      let data: { short?: unknown; error?: string };
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('Failed to parse create short response:', parseError);
        setError('Failed to create short. Please try again.');
        setUploading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Unable to create short.');
        setUploading(false);
        return;
      }

      if (!data.short) {
        setError('Invalid response from server. Please try again.');
        setUploading(false);
        return;
      }

      onShortCreated();
      closeModal();
    } catch (err) {
      console.error(err);
      setError('Unable to create short. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => (open ? onOpenChange(true) : closeModal())}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Upload a short</DialogTitle>
          <DialogDescription>
            {recordingMode === 'record' 
              ? 'Record a quick video update up to 30 seconds long.' 
              : 'Share a quick video update up to 60 seconds long.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto min-h-0">
          {/* Mode Toggle */}
          <div className="flex gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => {
                setRecordingMode('upload');
                if (isRecording) stopRecording();
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                recordingMode === 'upload'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Upload Video
            </button>
            <button
              type="button"
              onClick={() => {
                setRecordingMode('record');
                setVideoFile(null);
                setVideoPreview('');
                setVideoDuration(0);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                recordingMode === 'record'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Record Video
            </button>
          </div>

          {recordingMode === 'upload' ? (
            <div>
              <label className="text-sm font-medium text-slate-600">Video file</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="mt-2 block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
              />
              <p className="text-xs text-slate-500 mt-1">MP4 / MOV up to 60 seconds.</p>
              {videoPreview && (
                <div className="mt-3 max-h-[50vh] rounded-lg overflow-hidden border border-slate-200 relative">
                  <video src={videoPreview} controls className="w-full h-full object-contain bg-black max-h-[50vh]" />
                  <button
                    type="button"
                    onClick={clearSelectedVideo}
                    className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white text-red-600 shadow p-0.5"
                    aria-label="Remove selected video"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-600">Record video</label>
              <div className="mt-2 space-y-3">
                {/* Video Preview */}
                <div className="relative bg-black rounded-lg overflow-hidden aspect-[9/16] max-h-[50vh] flex items-center justify-center">
                  {/* Always render video element for live preview */}
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${stream ? 'block' : 'hidden'}`}
                  />
                  {videoPreview && !stream && (
                    <video
                      src={videoPreview}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                  {!stream && !videoPreview && (
                    <div className="text-white/50 text-center p-8 absolute inset-0 flex flex-col items-center justify-center">
                      <Video className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">Camera preview will appear here</p>
                      <p className="text-xs mt-2 text-white/30">Click "Start Recording" to begin</p>
                    </div>
                  )}
                  {isRecording && stream && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full z-10">
                      <Circle className="w-3 h-3 fill-white animate-pulse" />
                      <span className="text-sm font-semibold">
                        {Math.floor(recordingTime)}s / 30s
                      </span>
                    </div>
                  )}
                </div>

                {/* Recording Controls */}
                <div className="flex items-center justify-center gap-3">
                  {!isRecording && !videoPreview && (
                    <Button
                      type="button"
                      onClick={startRecording}
                      className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                    >
                      <Circle className="w-4 h-4 mr-2 fill-white" />
                      Start Recording
                    </Button>
                  )}
                  {isRecording && (
                    <Button
                      type="button"
                      onClick={stopRecording}
                      className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                    >
                      <Square className="w-4 h-4 mr-2 fill-white" />
                      Stop Recording
                    </Button>
                  )}
                  {videoPreview && !isRecording && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setVideoPreview('');
                          setVideoFile(null);
                          setRecordedBlob(null);
                          setVideoDuration(0);
                          if (videoRef.current) {
                            videoRef.current.srcObject = null;
                          }
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                      <Button
                        type="button"
                        onClick={startRecording}
                        variant="outline"
                      >
                        <Circle className="w-4 h-4 mr-2" />
                        Record Again
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500 text-center">
                  {isRecording ? 'Recording... Maximum 30 seconds' : 'Record up to 30 seconds'}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-600">Caption</label>
            <Textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a short description…"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2 flex-shrink-0 border-t border-slate-200 pt-4 mt-4">
          <Button type="button" variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-r from-blue-600 to-cyan-600"
            onClick={handleCreateShort}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share short'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

