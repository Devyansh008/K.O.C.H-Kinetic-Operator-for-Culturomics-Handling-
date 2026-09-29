import React, { useEffect, useRef } from 'react';
import { TrendingUp, Activity } from 'lucide-react';

export const GrowthVelocityChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Simulated OD600 growth curve (Lag phase -> Exponential phase -> Stationary)
    const points = [
      { t: 0, od: 0.05 },
      { t: 2, od: 0.052 },
      { t: 4, od: 0.061 },
      { t: 6, od: 0.082 },
      { t: 8, od: 0.115 },
      { t: 10, od: 0.145 }, // current point
      { t: 12, od: 0.198 },
      { t: 14, od: 0.26 },
      { t: 16, od: 0.31 },
    ];

    ctx.clearRect(0, 0, w, h);

    const padX = 35;
    const padY = 25;
    const graphW = w - padX * 1.5;
    const graphH = h - padY * 2;

    // Background Grid
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (graphH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + graphW, y);
      ctx.stroke();
    }

    // Axes labels
    ctx.fillStyle = '#78716c';
    ctx.font = '9px monospace';
    ctx.fillText('0.35', 5, padY + 5);
    ctx.fillText('0.15', 5, padY + graphH / 2 + 3);
    ctx.fillText('0.00', 5, padY + graphH + 3);

    // Plot line
    const maxOD = 0.35;
    const maxT = 16;

    ctx.beginPath();
    points.forEach((p, idx) => {
      const x = padX + (p.t / maxT) * graphW;
      const y = padY + graphH - (p.od / maxOD) * graphH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Area fill gradient
    ctx.lineTo(padX + graphW, padY + graphH);
    ctx.lineTo(padX, padY + graphH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padY, 0, padY + graphH);
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Highlight current point (t=10, od=0.145)
    const curX = padX + (10 / maxT) * graphW;
    const curY = padY + graphH - (0.145 / maxOD) * graphH;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(curX, curY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  return (
    <div className="w-full bg-stone-900/80 border border-amber-600/20 rounded-xl p-3 font-mono">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          <span>Kinetic Growth Velocity Curve</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
          LOG PHASE
        </span>
      </div>

      <canvas ref={canvasRef} width={380} height={140} className="w-full h-28" />

      <div className="flex justify-between items-center text-[10px] text-stone-400 mt-2 px-1">
        <span>T = 0h (Inoculation)</span>
        <span className="text-amber-300 font-bold">Current: T = 10.2h (OD₆₀₀ = 0.145)</span>
        <span>T = 16h (Target)</span>
      </div>
    </div>
  );
};
