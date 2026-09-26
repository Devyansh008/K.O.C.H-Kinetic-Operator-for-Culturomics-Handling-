import React, { useEffect, useRef } from 'react';
import { Sparkles, Dna, Activity } from 'lucide-react';
import { useKoch } from '../../lib/mockState';

export const Organism3DView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useKoch();
  const { selectedWell, wells } = state;

  const currentWell = wells.find((w) => w.coordinate === (selectedWell ?? 'C7'));
  const isPositive = currentWell?.state === 'colony_positive';
  const od600 = currentWell?.od600 ?? 0.145;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    // Simulated 3D micro-organism particle constellation with anti-gravity drift
    const particles = Array.from({ length: 48 }, (_, i) => ({
      u: (i / 48) * Math.PI * 2,
      v: (Math.random() - 0.5) * Math.PI,
      radius: 55 + Math.random() * 20,
      size: 2 + Math.random() * 3,
      speed: 0.005 + Math.random() * 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      t += 0.015;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Bioluminescent radial backdrop
      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 130);
      if (isPositive) {
        bgGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)'); // Emerald bioluminescence
        bgGrad.addColorStop(0.6, 'rgba(5, 150, 105, 0.08)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.2)'); // Amber warm backlight
        bgGrad.addColorStop(0.6, 'rgba(217, 119, 6, 0.06)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 130, 0, Math.PI * 2);
      ctx.fill();

      // Draw cellular membrane mesh
      ctx.strokeStyle = isPositive ? 'rgba(52, 211, 153, 0.35)' : 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 1;

      // 3D rotation angles
      const rotX = t * 0.8;
      const rotY = t * 1.1;

      const projectedPoints: { x: number; y: number; z: number; size: number }[] = [];

      particles.forEach((p) => {
        // Floating anti-gravity drift motion
        const currentRadius = p.radius + Math.sin(t * 2 + p.phase) * 6;

        // Spherical coordinate to Cartesian
        let x = currentRadius * Math.cos(p.u + t * p.speed) * Math.cos(p.v);
        let y = currentRadius * Math.sin(p.u + t * p.speed) * Math.cos(p.v);
        let z = currentRadius * Math.sin(p.v);

        // 3D Rotation (around X and Y axes)
        // Rotate around Y
        const x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
        const z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);

        // Rotate around X
        const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

        // Perspective projection
        const fov = 220;
        const scale = fov / (fov + z2 + 80);
        const projX = cx + x1 * scale;
        const projY = cy + y2 * scale;

        projectedPoints.push({ x: projX, y: projY, z: z2, size: p.size * scale });
      });

      // Draw interconnecting filament lines
      for (let i = 0; i < projectedPoints.length; i++) {
        for (let j = i + 1; j < projectedPoints.length; j++) {
          const dx = projectedPoints[i].x - projectedPoints[j].x;
          const dy = projectedPoints[i].y - projectedPoints[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 38) {
            ctx.beginPath();
            ctx.moveTo(projectedPoints[i].x, projectedPoints[i].y);
            ctx.lineTo(projectedPoints[j].x, projectedPoints[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw bioluminescent nodes
      projectedPoints.forEach((pt) => {
        ctx.fillStyle = isPositive ? '#6ee7b7' : '#fde68a';
        ctx.shadowColor = isPositive ? '#10b981' : '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, pt.size), 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isPositive]);

  return (
    <div className="w-full h-full flex flex-col justify-between font-mono text-xs">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 mb-2">
          <div className="flex items-center gap-1.5">
            <Dna className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold">
              3D Micro-Colony Model
            </h2>
          </div>
          <span className="text-[10px] text-amber-400/80 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
            {selectedWell ?? 'C7'}
          </span>
        </div>

        <div className="text-[11px] text-stone-300 flex items-center justify-between">
          <span className="text-stone-400">Specimen:</span>
          <span className="text-amber-200 font-semibold italic">Akkermansia muciniphila</span>
        </div>
      </div>

      {/* 3D Levitating Microbe Viewport */}
      <div className="relative flex-1 flex items-center justify-center my-2">
        <canvas
          ref={canvasRef}
          width={280}
          height={260}
          className="w-full h-full max-h-[260px] cursor-grab active:cursor-grabbing"
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[9px] text-stone-500 bg-stone-900/60 px-2 py-0.5 rounded-full border border-stone-800">
          <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
          <span>Anti-Gravity Drift Active</span>
        </div>
      </div>

      {/* Telemetry Readout Widget */}
      <div className="p-3 bg-stone-900/70 border border-amber-500/20 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-stone-400">Culture State:</span>
          <span
            className={`font-bold uppercase ${
              isPositive ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            {isPositive ? '● Colony Positive' : 'Inoculated'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-stone-400">Optical Density (OD₆₀₀):</span>
          <span className="text-amber-300 font-bold">{od600.toFixed(3)}</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-stone-400">Growth Velocity (μ):</span>
          <span className="text-emerald-400 font-bold">+0.042 hr⁻¹</span>
        </div>

        {/* Small atmospheric telemetry bar */}
        <div className="pt-1.5 border-t border-stone-800 grid grid-cols-4 gap-1 text-[9px] text-center">
          <div className="bg-stone-950 p-1 rounded border border-stone-800/80">
            <span className="text-stone-500 block">O₂</span>
            <span className="text-amber-300 font-bold">&lt;0.1%</span>
          </div>
          <div className="bg-stone-950 p-1 rounded border border-stone-800/80">
            <span className="text-stone-500 block">CO₂</span>
            <span className="text-amber-300 font-bold">5.0%</span>
          </div>
          <div className="bg-stone-950 p-1 rounded border border-stone-800/80">
            <span className="text-stone-500 block">N₂</span>
            <span className="text-amber-300 font-bold">85%</span>
          </div>
          <div className="bg-stone-950 p-1 rounded border border-stone-800/80">
            <span className="text-stone-500 block">Temp</span>
            <span className="text-amber-300 font-bold">37.0°C</span>
          </div>
        </div>
      </div>
    </div>
  );
};
