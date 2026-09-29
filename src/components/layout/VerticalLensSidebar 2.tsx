import React from 'react';
import { Link } from '@tanstack/react-router';
import { AudioWaveform, Crosshair, Terminal } from 'lucide-react';

interface VerticalLensSidebarProps {
  activeLens: 'sts' | 'webcam' | 'logs';
}

const LENS_ITEMS = [
  {
    id: 'sts' as const,
    label: 'STS Voice Agent',
    description: 'Speech-to-Speech (<500ms RTT)',
    icon: AudioWaveform,
  },
  {
    id: 'webcam' as const,
    label: 'Optics & Reticle',
    description: 'Camera & Coordinate Targeting',
    icon: Crosshair,
  },
  {
    id: 'logs' as const,
    label: 'Slide Logs & Telemetry',
    description: 'Audit Stream & OD600 Curves',
    icon: Terminal,
  },
] as const;

export const VerticalLensSidebar: React.FC<VerticalLensSidebarProps> = ({ activeLens }) => {
  return (
    <nav
      aria-label="Lens Navigation"
      className="absolute left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 p-2 bg-amber-950/40 backdrop-blur-md border border-amber-500/30 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(245,158,11,0.08)] font-mono select-none"
    >
      {/* Top Steampunk Brass Accent Rivet */}
      <div className="w-1.5 h-1.5 rounded-full bg-amber-600/60 shadow-[0_0_4px_#f59e0b] my-0.5" />

      {LENS_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeLens === item.id;

        return (
          <Link
            key={item.id}
            to="/experiment"
            search={{ lens: item.id }}
            title={`${item.label} — ${item.description}`}
            className={`relative group flex items-center justify-center w-12 h-12 rounded-xl border transition-all duration-300 cursor-pointer ${
              isActive
                ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.5),inset_0_0_10px_rgba(245,158,11,0.2)] scale-105'
                : 'bg-stone-950/60 border-amber-900/30 text-stone-400 hover:text-amber-300 hover:border-amber-500/50 hover:bg-amber-950/30'
            }`}
          >
            {/* Active Indicator Pin on the Left Rim */}
            {isActive && (
              <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-r bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            )}

            <Icon
              className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? 'text-amber-300 animate-pulse' : 'text-stone-400 group-hover:text-amber-300'
              }`}
            />

            {/* Steampunk Tooltip */}
            <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-stone-950/95 border border-amber-500/40 text-amber-200 shadow-[0_5px_20px_rgba(0,0,0,0.9)] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 flex flex-col">
              <span className="font-bold text-xs uppercase tracking-wider text-amber-300">
                {item.label}
              </span>
              <span className="text-[10px] text-stone-400">{item.description}</span>
            </div>
          </Link>
        );
      })}

      {/* Bottom Steampunk Brass Accent Rivet */}
      <div className="w-1.5 h-1.5 rounded-full bg-amber-600/60 shadow-[0_0_4px_#f59e0b] my-0.5" />
    </nav>
  );
};
