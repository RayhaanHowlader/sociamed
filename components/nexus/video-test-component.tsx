'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface VideoTestComponentProps {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
}

export function VideoTestComponent({ stream, label, muted = false }: VideoTestComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`Setting up ${label} video with stream:`, stream);
      
      // Clear existing source
      videoRef.current.srcObject = null;
      
      // Set new stream
      videoRef.current.srcObject = stream;
      videoRef.current.muted = muted;
      videoRef.current.playsInline = true;
      videoRef.current.autoplay = true;
      
      // Try to play
      const playVideo = async () => {
        try {
          await videoRef.current?.play();
          console.log(`${label} video playing successfully`);
        } catch (e) {
          console.error(`${label} video play failed:`, e);
        }
      };
      
      // Wait for metadata
      videoRef.current.addEventListener('loadedmetadata', playVideo, { once: true });
      
      // Fallback
      setTimeout(playVideo, 100);
    }
  }, [stream, label, muted]);

  const handleManualPlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
        console.log(`${label} video manually started`);
      } catch (e) {
        console.error(`${label} manual play failed:`, e);
      }
    }
  };

  return (
    <div className="border border-gray-300 p-2 m-2">
      <div className="text-sm font-medium mb-2">{label}</div>
      <video
        ref={videoRef}
        className="w-32 h-24 bg-black border"
        controls={false}
        muted={muted}
        playsInline
        autoPlay
        onPlay={() => console.log(`${label} video started playing`)}
        onPause={() => console.log(`${label} video paused`)}
        onError={(e) => console.error(`${label} video error:`, e)}
        onLoadedMetadata={() => console.log(`${label} video metadata loaded`)}
      />
      <div className="mt-1">
        <Button size="sm" onClick={handleManualPlay}>
          Play {label}
        </Button>
      </div>
      <div className="text-xs text-gray-600 mt-1">
        Stream: {stream ? 'Available' : 'None'}
        {stream && (
          <>
            <br />Tracks: {stream.getTracks().length}
            <br />Video: {stream.getVideoTracks().length}
            <br />Audio: {stream.getAudioTracks().length}
          </>
        )}
      </div>
    </div>
  );
}