import React from 'react';

interface HUDOverlayProps {
  leftContent: React.ReactNode;
  centerContent: React.ReactNode;
  rightContent: React.ReactNode;
  title?: string;
  activeLens?: string;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  leftContent,
  centerContent,
  rightContent,
  title = 'K.O.C.H. Optical System',
  activeLens = 'sts',
}) => {
  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col justify-between relative z-10 py-2">
      {/* Top Header Lens Indicator */}
      <div className="flex items-center justify-between px-6 py-2 bg-stone-900/60 backdrop-blur-md border border-amber-900/40 rounded-xl mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-pulse" />
          <h1 className="text-xs md:text-sm font-mono tracking-widest text-amber-300 font-bold uppercase">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-stone-400">
            LENS: <strong className="text-amber-400 uppercase">{activeLens}</strong>
          </span>
          <span className="text-stone-500">|</span>
          <span className="text-amber-500/80">40× Plan-Apochromat</span>
          <span className="text-stone-500">|</span>
          <span className="text-stone-400">λ: 600nm</span>
        </div>
      </div>

      {/* Primary 30% - 40% - 30% Split Layout */}
      <div className="w-full flex-1 grid grid-cols-10 gap-4 min-h-0">
        {/* Left 30%: STT & Intent Log */}
        <aside className="col-span-3 h-full overflow-hidden flex flex-col bg-stone-950/70 backdrop-blur-md border border-amber-500/20 p-4 rounded-xl shadow-2xl relative">
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-500" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-500" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500" />
          {leftContent}
        </aside>

        {/* Center 40%: Active Lens Viewport */}
        <section className="col-span-4 h-full overflow-hidden flex flex-col items-center justify-center relative bg-stone-950/40 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-2 shadow-[inset_0_0_30px_rgba(245,158,11,0.05)]">
          {centerContent}
        </section>

        {/* Right 30%: Floating Organism / Telemetry */}
        <aside className="col-span-3 h-full overflow-hidden flex flex-col bg-stone-950/70 backdrop-blur-md border border-amber-500/20 p-4 rounded-xl shadow-2xl relative">
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-500" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-500" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500" />
          {rightContent}
        </aside>
      </div>
    </div>
  );
};
