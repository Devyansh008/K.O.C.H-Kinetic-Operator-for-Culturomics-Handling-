import React, { useEffect, useRef } from 'react';
import { Dna, Sparkles, Activity, ShieldAlert } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import { JarvisBox } from './JarvisBox';

export const SpecimenMonitorBox: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useKoch();
  const { selectedWell, wells } = state;

  const currentWell = wells.find((w) => w.coordinate === (selectedWell ?? 'C7'));
  const isPositive = currentWell?.state === 'colony_positive';

  // Render rotating 3D cellular particle constellation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const particles = Array.from({ length: 36 }, (_, i) => ({
      u: (i / 36) * Math.PI * 2,
      v: (Math.random() - 0.5) * Math.PI,
      radius: 40 + Math.random() * 15,
      size: 1.5 + Math.random() * 2,
      speed: 0.008 + Math.random() * 0.008,
    }));

    const render = () => {
      t += 0.02;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Bioluminescent radial backlight
      const bgGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 70);
      if (isPositive) {
        bgGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        bgGrad.addColorStop(0.7, 'rgba(5, 150, 105, 0.08)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
        bgGrad.addColorStop(0.7, 'rgba(217, 119, 6, 0.06)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.fill();

      // Rotating orbital ring
      ctx.strokeStyle = isPositive ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 55, 22, t * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      // Draw cellular nodes
      for (const p of particles) {
        const angle = p.u + t * p.speed * 20;
        const x = cx + Math.cos(angle) * p.radius;
        const y = cy + Math.sin(angle) * (p.radius * 0.55);

        ctx.fillStyle = isPositive ? '#34d399' : '#fbbf24';
        ctx.shadowColor = isPositive ? '#10b981' : '#f59e0b';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPositive]);

  return (
    <JarvisBox
      title="Specimen Monitor"
      statusBadge={isPositive ? 'Colony Positive' : 'Inoculated'}
      icon={<Dna className="w-3.5 h-3.5" />}
      className={className}
    >
      <div className="flex flex-col h-full gap-2">
        {/* Top 3D Canvas Visualizer & Well Badge */}
        <div className="relative w-full h-28 bg-stone-950/70 border border-amber-500/20 rounded-lg overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={240}
            height={112}
            className="w-full h-full object-contain"
          />

          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-900/80 border border-amber-500/30 text-[9px] text-amber-300">
            <span className="font-bold">Target: Well {selectedWell || 'C7'}</span>
          </div>

          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-stone-900/80 border border-amber-500/30 text-[8px] text-stone-300">
            <Activity className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            <span>Viability: 94.8%</span>
          </div>
        </div>

        {/* Specimen Clinical Metadata */}
        <div className="p-2 rounded-lg bg-stone-900/50 border border-amber-500/15 flex flex-col gap-1 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Taxon:</span>
            <span className="text-amber-200 font-bold italic">Akkermansia muciniphila</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Morphology:</span>
            <span className="text-stone-300">Gram-negative strict anaerobe</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Growth Medium:</span>
            <span className="text-stone-300">Wilkins-Chalgren + Mucin</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-amber-500/10">
            <span className="text-stone-400">Culture Age:</span>
            <span className="text-emerald-400 font-bold">14h 22m (Log Phase)</span>
          </div>
        </div>
      </div>
    </JarvisBox>
  );
};
