'use client';

import { RefObject } from 'react';

interface CallAudioElementsProps {
  localAudioRef: RefObject<HTMLAudioElement>;
  remoteAudioRef: RefObject<HTMLAudioElement>;
}

export function CallAudioElements({ localAudioRef, remoteAudioRef }: CallAudioElementsProps) {
  return (
    <>
      {/* Hidden audio elements for call audio */}
      <audio 
        ref={localAudioRef} 
        autoPlay 
        muted 
        playsInline
        controls={false}
        style={{ display: 'none', position: 'fixed', top: '-9999px' }}
      />
      <audio 
        ref={remoteAudioRef} 
        autoPlay 
        playsInline
        controls={false}
        style={{ display: 'none', position: 'fixed', top: '-9999px' }}
        onLoadedMetadata={(e) => {
          console.log('Remote audio metadata loaded');
          const audio = e.target as HTMLAudioElement;
          audio.play().catch((err) => console.error('Auto-play failed on metadata:', err));
        }}
        onCanPlay={(e) => {
          console.log('Remote audio can play');
          const audio = e.target as HTMLAudioElement;
          audio.play().catch((err) => console.error('Auto-play failed on canplay:', err));
        }}
      />
    </>
  );
}