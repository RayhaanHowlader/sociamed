'use client';

import { useState } from 'react';

interface BannerImageData {
  imageUrl: string;
  userName: string;
  userUsername: string;
}

export function useBannerImageViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [bannerData, setBannerData] = useState<BannerImageData | null>(null);

  const openBannerViewer = (data: BannerImageData) => {
    setBannerData(data);
    setIsOpen(true);
  };

  const closeBannerViewer = () => {
    setIsOpen(false);
    setBannerData(null);
  };

  return {
    isOpen,
    bannerData,
    openBannerViewer,
    closeBannerViewer,
  };
}