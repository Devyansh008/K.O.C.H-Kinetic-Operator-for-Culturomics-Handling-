import React, { useState, useEffect } from 'react';
import { Wind, Thermometer, Droplets, ShieldCheck, Gauge } from 'lucide-react';
import { JarvisBox } from './JarvisBox';

export const AtmosphereTelemetryBox: React.FC<{ className?: string }> = ({ className }) => {
  const [o2Ppm, setO2Ppm] = useState(1.8);
  const [temp, setTemp] = useState(37.0);

  // Subtle real-time sensor jitter for telemetry realism
  useEffect(() => {
    const interval = setInterval(() => {
      setO2Ppm(parseFloat((1.7 + Math.random() * 0.2).toFixed(2)));
      setTemp(parseFloat((37.0 + (Math.random() - 0.5) * 0.1).toFixed(1)));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <JarvisBox
      title="Atmosphere Telemetry"
      statusBadge="Anaerobic Lock"
      icon={<Wind className="w-3.5 h-3.5" />}
      className={className}
    >
      <div className="flex flex-col h-full gap-2 text-[10px]">
        {/* Anaerobic Gas Mix Grid */}
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-stone-900/60 border border-amber-500/20 text-center">
          <div className="flex flex-col p-1 rounded bg-stone-950/70 border border-amber-500/20">
            <span className="text-[9px] text-stone-400 font-bold">N₂</span>
            <span className="text-amber-300 font-bold text-[11px]">85.0%</span>
            <span className="text-[8px] text-stone-500">Carrier</span>
          </div>

          <div className="flex flex-col p-1 rounded bg-stone-950/70 border border-amber-500/20">
            <span className="text-[9px] text-stone-400 font-bold">CO₂</span>
            <span className="text-amber-300 font-bold text-[11px]">10.0%</span>
            <span className="text-[8px] text-stone-500">Buffer</span>
          </div>

          <div className="flex flex-col p-1 rounded bg-stone-950/70 border border-amber-500/20">
            <span className="text-[9px] text-stone-400 font-bold">H₂</span>
            <span className="text-amber-300 font-bold text-[11px]">5.0%</span>
            <span className="text-[8px] text-stone-500">Catalyst</span>
          </div>

          <div className="flex flex-col p-1 rounded bg-emerald-950/40 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <span className="text-[9px] text-emerald-400 font-bold">O₂</span>
            <span className="text-emerald-300 font-bold text-[11px] animate-pulse">
              &lt;{o2Ppm}
            </span>
            <span className="text-[8px] text-emerald-400/80">PPM SAFE</span>
          </div>
        </div>

        {/* Environmental Parameters */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="p-1.5 rounded-lg bg-stone-900/50 border border-amber-500/15 flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-stone-400 mb-0.5">
              <Thermometer className="w-3 h-3 text-amber-400" />
              <span className="text-[8px] uppercase">Temp</span>
            </div>
            <span className="text-amber-200 font-bold text-[11px]">{temp}°C</span>
          </div>

          <div className="p-1.5 rounded-lg bg-stone-900/50 border border-amber-500/15 flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-stone-400 mb-0.5">
              <Droplets className="w-3 h-3 text-cyan-400" />
              <span className="text-[8px] uppercase">Humidity</span>
            </div>
            <span className="text-cyan-300 font-bold text-[11px]">88.5%</span>
          </div>

          <div className="p-1.5 rounded-lg bg-stone-900/50 border border-amber-500/15 flex flex-col items-center text-center">
            <div className="flex items-center gap-1 text-stone-400 mb-0.5">
              <Gauge className="w-3 h-3 text-amber-400" />
              <span className="text-[8px] uppercase">Pressure</span>
            </div>
            <span className="text-amber-200 font-bold text-[11px]">+18.5 Pa</span>
          </div>
        </div>

        {/* Laminar Flow & Sterile Status */}
        <div className="p-1.5 rounded-lg bg-stone-950/70 border border-amber-500/15 flex items-center justify-between text-[9px]">
          <div className="flex items-center gap-1 text-stone-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>HEPA Laminar Flow: 0.45 m/s</span>
          </div>
          <span className="text-emerald-400 font-bold uppercase">ISO Class 5</span>
        </div>
      </div>
    </JarvisBox>
  );
};
