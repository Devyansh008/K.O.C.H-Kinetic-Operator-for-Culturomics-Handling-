import React from 'react';

interface SteampunkFrameProps {
  children: React.ReactNode;
}

export const SteampunkFrame: React.FC<SteampunkFrameProps> = ({ children }) => {
  const [videoLoaded, setVideoLoaded] = React.useState(false);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-stone-950 font-mono select-none">
      {/* Background Video: lens.mp4 */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={() => setVideoLoaded(true)}
        onLoadedData={() => setVideoLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover z-0 filter brightness-70 contrast-125 pointer-events-none transition-opacity duration-700 ${
          videoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <source src="/assets/lens.mp4" type="video/mp4" />
      </video>

      {/* Warm optical lens vignette & atmospheric lighting */}
      <div className="absolute inset-0 bg-stone-950/45 mix-blend-multiply z-10 pointer-events-none" />

      {/* Outer dark microscope lens vignette mask */}
      <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_140px_rgba(0,0,0,0.98)] border-[16px] border-amber-950/50 rounded-full scale-105" />

      {/* Optical Eyepiece Metallic Brass Rim Details */}
      <div className="absolute inset-3 pointer-events-none z-20 rounded-full border border-amber-600/25 shadow-[0_0_50px_rgba(180,83,9,0.2)]" />
      <div className="absolute inset-6 pointer-events-none z-20 rounded-full border border-amber-500/15" />

      {/* Subtle flickering warm-yellow light background (#f59e0b) */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-amber-500/5 mix-blend-soft-light animate-flicker" />

      {/* Crosshair / Reticle Eyepiece Marks */}
      <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center opacity-30">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="h-full w-[1px] absolute bg-gradient-to-b from-transparent via-amber-500/30 to-transparent" />
        <div className="w-48 h-48 rounded-full border border-dashed border-amber-500/20 absolute" />
      </div>

      {/* Active Lens Content */}
      <main className="relative w-full h-full z-30 flex items-center justify-center p-2 md:p-3 pl-20 md:pl-24">
        {children}
      </main>
    </div>
  );
};
