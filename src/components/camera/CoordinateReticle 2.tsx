import React, { useEffect, useRef } from 'react';

interface CoordinateReticleProps {
  targetCoordinate?: string; // e.g. "C7"
  width?: number;
  height?: number;
}

export const CoordinateReticle: React.FC<CoordinateReticleProps> = ({
  targetCoordinate = 'C7',
  width = 640,
  height = 480,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      angle += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // 96-well plate grid simulation layout
      // A1 is top-left, H12 is bottom-right
      const cols = 12;
      const rows = 8;
      const startX = w * 0.15;
      const startY = h * 0.15;
      const gridW = w * 0.7;
      const gridH = h * 0.7;
      const cellW = gridW / cols;
      const cellH = gridH / rows;

      // Parse target coordinate (e.g. C7 -> row 2, col 6)
      const targetRowLetter = targetCoordinate.charAt(0).toUpperCase();
      const targetColNum = parseInt(targetCoordinate.slice(1), 10) || 1;
      const rowIndex = Math.max(0, targetRowLetter.charCodeAt(0) - 65);
      const colIndex = Math.max(0, targetColNum - 1);

      const targetCenterX = startX + colIndex * cellW + cellW / 2;
      const targetCenterY = startY + rowIndex * cellH + cellH / 2;

      // Draw faint brass plate outline
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, startY, gridW, gridH);

      // Draw subtle coordinate lines
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.15)';
      for (let c = 1; c < cols; c++) {
        ctx.beginPath();
        ctx.moveTo(startX + c * cellW, startY);
        ctx.lineTo(startX + c * cellW, startY + gridH);
        ctx.stroke();
      }
      for (let r = 1; r < rows; r++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + r * cellH);
        ctx.lineTo(startX + gridW, startY + r * cellH);
        ctx.stroke();
      }

      // Draw Steampunk Brass Targeting Reticle on target coordinate
      const radius = 22 + Math.sin(angle * 3) * 2;

      // Outer rotating notched ring
      ctx.save();
      ctx.translate(targetCenterX, targetCenterY);
      ctx.rotate(angle);

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4 Cross ticks
      for (let t = 0; t < 4; t++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, radius - 4);
        ctx.lineTo(0, radius + 8);
        ctx.stroke();
      }
      ctx.restore();

      // Center crosshair and pulse circle
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(targetCenterX - 14, targetCenterY);
      ctx.lineTo(targetCenterX + 14, targetCenterY);
      ctx.moveTo(targetCenterX, targetCenterY - 14);
      ctx.lineTo(targetCenterX, targetCenterY + 14);
      ctx.stroke();

      // Pulsing inner dot
      ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.beginPath();
      ctx.arc(targetCenterX, targetCenterY, 3 + Math.sin(angle * 4), 0, Math.PI * 2);
      ctx.fill();

      // Coordinate Label Badge
      ctx.fillStyle = 'rgba(28, 25, 23, 0.85)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      const labelText = `PLATE 4 · WELL ${targetCoordinate}`;
      ctx.font = 'bold 11px monospace';
      const textWidth = ctx.measureText(labelText).width;

      const badgeX = targetCenterX - textWidth / 2 - 8;
      const badgeY = targetCenterY + radius + 10;
      ctx.fillRect(badgeX, badgeY, textWidth + 16, 20);
      ctx.strokeRect(badgeX, badgeY, textWidth + 16, 20);

      ctx.fillStyle = '#fef3c7';
      ctx.fillText(labelText, targetCenterX - textWidth / 2, badgeY + 14);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [targetCoordinate, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};
