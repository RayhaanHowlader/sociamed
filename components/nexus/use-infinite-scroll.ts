'use client';

import { useEffect, useRef } from 'react';

export function useInfiniteScroll(
  hasMore: boolean,
  loadingMore: boolean,
  loadMore: () => void
) {
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  // Handle scroll to detect when user scrolls near bottom
  useEffect(() => {
    if (!hasMore) return;

    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      // Check if scrolled near the bottom (within 300px for better UX)
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (documentHeight - (scrollTop + windowHeight) < 300) {
        loadMore();
      }
    };

    // Throttle scroll events for better performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [hasMore, loadingMore, loadMore]);

  // Intersection Observer for more reliable lazy loading
  useEffect(() => {
    if (!hasMore || !loadMoreTriggerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loadingMore && hasMore) {
          loadMore();
        }
      },
      {
        rootMargin: '100px', // Trigger 100px before the element comes into view
        threshold: 0.1,
      }
    );

    const currentTrigger = loadMoreTriggerRef.current;
    if (currentTrigger) {
      observer.observe(currentTrigger);
    }

    return () => {
      if (currentTrigger) {
        observer.unobserve(currentTrigger);
      }
    };
  }, [hasMore, loadingMore, loadMore]);

  return { loadMoreTriggerRef };
}