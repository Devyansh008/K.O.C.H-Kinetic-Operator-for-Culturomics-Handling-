import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useKoch } from '../../lib/mockState';
import { CrtOverlay } from '../ui/CrtOverlay';

export const LoadingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { startExperiment, state } = useKoch();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasNavigatedRef = useRef(false);

  const handleTransitionOut = () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    setIsExiting(true);

    if (!state.experiment) {
      startExperiment('KOCH-' + new Date().toISOString().slice(0, 10));
    }

    // Smooth 700ms cross-fade before revealing /experiment
    setTimeout(() => {
      navigate({ to: '/experiment', search: { lens: 'sts' } });
    }, 700);
  };

  // Attempt autoplay immediately on mount
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch((err) => {
        console.warn('Autoplay interrupted or delayed:', err);
      });
    }
  }, []);

  // Listen for video ended event for single-play navigation
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => {
      handleTransitionOut();
    };

    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 w-full h-full overflow-hidden bg-stone-950 font-mono select-none transition-opacity duration-700 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. Fullscreen Video Hero Canvas (Zero Clutter) */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        loop={false}
        onCanPlayThrough={() => setVideoLoaded(true)}
        onLoadedData={() => setVideoLoaded(true)}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (video && video.duration) {
            const pct = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
            setLoadingProgress(pct);
          }
        }}
        onEnded={handleTransitionOut}
        className={`fixed inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-700 ${
          videoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <source src="/assets/loading1.mp4" type="video/mp4" />
      </video>

      {/* CRT Retro Screen Overlay */}
      <CrtOverlay />

      {/* 2. High-Contrast Glassmorphic UI Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none p-6 md:p-8 flex flex-col justify-between">
        {/* Top-Left System Status Header */}
        <div className="flex items-center">
          <div className="bg-stone-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-500/40 flex items-center gap-2.5 shadow-xl pointer-events-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_#f59e0b]" />
            <span className="text-amber-300 text-xs font-mono font-semibold tracking-widest drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]">
              PROJECT K.O.C.H. // INITIALIZING_SYSTEM
            </span>
          </div>
        </div>

        {/* Bottom Bar: Center Sleek Progress Card & Right Interactive Skip Button */}
        <div className="relative w-full flex items-center justify-between">
          {/* Bottom-Center: High-Contrast Glassmorphic Progress Card */}
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="bg-stone-950/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-amber-500/30 flex flex-col items-center gap-2 shadow-2xl">
              <div className="w-72 sm:w-80 h-2 bg-stone-900/90 rounded-full overflow-hidden border border-amber-500/30">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_12px_#f59e0b] transition-all duration-150"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-amber-300 tracking-wider">
                INITIALIZING... {loadingProgress}%
              </span>
            </div>
          </div>

          {/* Bottom-Right: Interactive High-Contrast SKIP INTRO Button */}
          <div className="ml-auto pointer-events-auto">
            <button
              onClick={handleTransitionOut}
              disabled={isExiting}
              className="pointer-events-auto px-5 py-2.5 bg-stone-950/80 hover:bg-amber-950/90 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-amber-100 text-xs font-mono font-semibold rounded-xl backdrop-blur-md transition-all duration-300 shadow-xl active:scale-95 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2 cursor-pointer"
            >
              <span>SKIP INTRO</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
