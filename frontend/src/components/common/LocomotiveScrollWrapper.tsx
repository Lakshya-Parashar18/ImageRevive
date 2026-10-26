import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import LocomotiveScroll from 'locomotive-scroll';

interface LocomotiveScrollWrapperProps {
  children: React.ReactNode;
}

export const LocomotiveScrollWrapper: React.FC<LocomotiveScrollWrapperProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const scrollInstanceRef = useRef<LocomotiveScroll | null>(null);

  useEffect(() => {
    // Respect user's reduced-motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    try {
      // Initialize Locomotive Scroll v5 cleanly
      scrollInstanceRef.current = new LocomotiveScroll({
        lenisOptions: {
          wrapper: window,
          content: document.documentElement,
          lerp: 0.1,
          duration: 1.2,
          smoothWheel: true,
        },
      });
    } catch (e) {
      console.warn('LocomotiveScroll init notice:', e);
    }

    return () => {
      if (scrollInstanceRef.current) {
        try {
          scrollInstanceRef.current.destroy();
        } catch {
          // ignore
        }
        scrollInstanceRef.current = null;
      }
    };
  }, []);

  // Reset scroll position on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
    if (scrollInstanceRef.current && (scrollInstanceRef.current as any).scrollTo) {
      try {
        (scrollInstanceRef.current as any).scrollTo(0, { immediate: true });
      } catch {
        // ignore
      }
    }
  }, [location.pathname]);

  return (
    <div ref={containerRef} className="w-full min-h-screen">
      {children}
    </div>
  );
};
