import React from 'react';
import { TrendingUp, Activity, Clock, Zap } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import { JarvisBox } from './JarvisBox';

export const GrowthKineticsBox: React.FC<{ className?: string }> = ({ className }) => {
  const { state } = useKoch();
  const { selectedWell, wells } = state;

  const currentWell = wells.find((w) => w.coordinate === (selectedWell ?? 'C7'));
  const od600 = currentWell?.od600 ?? 0.145;

  return (
    <JarvisBox
      title="Growth Kinetics"
      statusBadge="Log Phase // G4"
      icon={<TrendingUp className="w-3.5 h-3.5" />}
      className={className}
    >
      <div className="flex flex-col h-full gap-2 text-[10px]">
        {/* OD600 Primary Hero Display */}
        <div className="p-2 rounded-lg bg-stone-900/60 border border-amber-500/20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[9px] text-stone-400 font-bold uppercase">
              <Activity className="w-3 h-3 text-amber-400" />
              <span>In-Situ OD₆₀₀ Absorbance</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-amber-300 drop-shadow-[0_0_10px_#f59e0b]">
                {od600.toFixed(3)}
              </span>
              <span className="text-[10px] text-amber-500/80 font-bold">AU (600nm)</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
              +0.038 / hr
            </span>
            <div className="text-[8px] text-stone-400 mt-1">McFarland ~0.50</div>
          </div>
        </div>

        {/* Growth Curve SVG Sparkline */}
        <div className="relative w-full h-14 bg-stone-950/80 rounded-lg border border-amber-500/20 p-1 flex items-center justify-center overflow-hidden">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 200 45"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* Grid baseline */}
            <line x1="0" y1="40" x2="200" y2="40" stroke="rgba(245,158,11,0.15)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="20" x2="200" y2="20" stroke="rgba(245,158,11,0.15)" strokeWidth="1" strokeDasharray="3 3" />

            {/* Sigmoid / Exponential Curve */}
            <path
              d="M 5,38 Q 40,37 70,35 T 120,22 T 165,10 T 195,6"
              fill="none"
              stroke="url(#growthGrad)"
              strokeWidth="2.5"
            />

            {/* Active Marker Dot */}
            <circle cx="165" cy="10" r="3.5" fill="#10b981" className="animate-ping" />
            <circle cx="165" cy="10" r="2.5" fill="#34d399" />
          </svg>

          <span className="absolute bottom-1 right-2 text-[8px] text-emerald-400/90 font-mono font-bold">
            t = 14.5h [ACTIVE]
          </span>
        </div>

        {/* Kinetic Coefficients Grid */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <div className="p-1 rounded bg-stone-900/50 border border-amber-500/15 flex items-center justify-between">
            <span className="text-stone-400">Doubling Time (t_d):</span>
            <span className="text-amber-300 font-bold">42.5 min</span>
          </div>

          <div className="p-1 rounded bg-stone-900/50 border border-amber-500/15 flex items-center justify-between">
            <span className="text-stone-400">Growth Rate (μ):</span>
            <span className="text-emerald-400 font-bold">0.98 h⁻¹</span>
          </div>
        </div>
      </div>
    </JarvisBox>
  );
};
