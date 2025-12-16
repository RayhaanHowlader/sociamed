'use client';

import { useState } from 'react';

interface ProfilePhotoData {
  photoUrl?: string;
  userName: string;
  userUsername: string;
  fallbackText: string;
}

export function useProfilePhotoViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [photoData, setPhotoData] = useState<ProfilePhotoData | null>(null);

  const openPhotoViewer = (data: ProfilePhotoData) => {
    setPhotoData(data);
    setIsOpen(true);
  };

  const closePhotoViewer = () => {
    setIsOpen(false);
    // Clear data after animation completes
    setTimeout(() => setPhotoData(null), 300);
  };

  return {
    isOpen,
    photoData,
    openPhotoViewer,
    closePhotoViewer,
    setIsOpen,
  };
}