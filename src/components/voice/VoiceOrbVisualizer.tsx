import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, ShieldCheck } from 'lucide-react';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';

export const VoiceOrbVisualizer: React.FC = () => {
  const {
    isListening,
    audioRMS,
    latencyMs,
    lmsFilteringEnabled,
    toggleLmsFilter,
    startSession,
    stopSession,
  } = useVoiceAssistant();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animate ChatGPT-style pulsing gold/amber glowing audio orb
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Base radius plus voice energy bounce
      const voiceEnergy = isListening ? audioRMS * 45 : 0;
      const pulse = Math.sin(time * 3) * (isListening ? 8 : 3);
      const baseRadius = 60 + pulse + voiceEnergy;

      // Outer golden aura glow
      const outerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.4,
        centerX,
        centerY,
        baseRadius * 1.8
      );
      outerGlow.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
      outerGlow.addColorStop(0.5, 'rgba(217, 119, 6, 0.15)');
      outerGlow.addColorStop(1, 'rgba(120, 53, 15, 0)');

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Deforming multi-harmonic organic orb rings
      const numRings = 4;
      for (let r = 0; r < numRings; r++) {
        ctx.beginPath();
        const ringRadius = baseRadius - r * 8;
        const numPoints = 64;

        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const harmonic =
            Math.sin(angle * (3 + r) + time * 2) * (isListening ? 6 + voiceEnergy * 0.3 : 2) +
            Math.cos(angle * 5 - time) * 3;
          const dist = ringRadius + harmonic;
          const px = centerX + Math.cos(angle) * dist;
          const py = centerY + Math.sin(angle) * dist;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const strokeAlpha = 0.4 + (r / numRings) * 0.5;
        ctx.strokeStyle = `rgba(251, 191, 36, ${strokeAlpha})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.stroke();
      }

      // Core Solid Glowing Orb
      const coreGradient = ctx.createRadialGradient(
        centerX - 10,
        centerY - 10,
        5,
        centerX,
        centerY,
        baseRadius * 0.7
      );
      coreGradient.addColorStop(0, '#fffbeb');
      coreGradient.addColorStop(0.4, '#fbbf24');
      coreGradient.addColorStop(0.8, '#d97706');
      coreGradient.addColorStop(1, '#78350f');

      ctx.fillStyle = coreGradient;
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isListening, audioRMS]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-4 relative">
      {/* Top Status */}
      <div className="w-full flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isListening ? 'bg-amber-400 animate-ping' : 'bg-stone-600'
            }`}
          />
          <span className="text-amber-300 font-bold uppercase tracking-wider">
            {isListening ? 'STS CHANNEL ACTIVE' : 'STS AGENT STANDBY'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-amber-500/80 bg-stone-900/60 px-2.5 py-1 rounded-full border border-amber-600/20">
          <Volume2 className="w-3 h-3 text-amber-400" />
          <span>RTT: {latencyMs}ms (&lt;500ms SLA)</span>
        </div>
      </div>

      {/* Center Orb Canvas */}
      <div className="relative flex items-center justify-center my-auto">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={isListening ? stopSession : startSession}
        />
        {/* Central Overlay Icon */}
        <div
          onClick={isListening ? stopSession : startSession}
          className="absolute inset-0 m-auto w-12 h-12 rounded-full flex items-center justify-center cursor-pointer pointer-events-auto"
        >
          {isListening ? (
            <Mic className="w-6 h-6 text-stone-950 drop-shadow" />
          ) : (
            <MicOff className="w-6 h-6 text-stone-400" />
          )}
        </div>
      </div>

      {/* Steampunk controls & LMS Filter Badge */}
      <div className="w-full flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={isListening ? stopSession : startSession}
            className={`px-5 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
              isListening
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/40'
            }`}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {isListening ? 'Mute Microphone' : 'Engage Voice Pipeline'}
          </button>

          <button
            onClick={() => toggleLmsFilter(!lmsFilteringEnabled)}
            className={`px-3 py-2 rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              lmsFilteringEnabled
                ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-stone-900 border-stone-800 text-stone-500'
            }`}
            title="LMS Adaptive Filter removes 65-75 dB HEPA Laminar Flow Hood Hum"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>LMS Noise Filter: {lmsFilteringEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <p className="text-[10px] font-mono text-stone-400 text-center">
          Speak hands-free inside laminar hood · Speech-to-Speech round-trip &lt;500ms
        </p>
      </div>
    </div>
  );
};
