import React, { useEffect, useRef, useState } from 'react';
import { AudioWaveform, Mic, Volume2 } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import { JarvisBox } from './JarvisBox';

export const SttTranscriptBox: React.FC<{ className?: string }> = ({ className }) => {
  const { state } = useKoch();
  const { transcripts } = state;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [decibels, setDecibels] = useState(-24.5);

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Simulated ambient acoustic dB fluctuation (HEPA filtered)
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuates around -26 to -16 dBFS
      const val = -26 + Math.random() * 10;
      setDecibels(parseFloat(val.toFixed(1)));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <JarvisBox
      title="Speech Stream"
      statusBadge="AssemblyAI // Live"
      icon={<AudioWaveform className="w-3.5 h-3.5" />}
      className={className}
    >
      <div className="flex flex-col h-full gap-2.5">
        {/* Decibel & Audio Meter Bar */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-amber-500/20">
          <div className="flex items-center gap-1.5 text-stone-300">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] uppercase font-bold text-amber-300/80">Input Gain:</span>
            <span className="text-[10px] font-bold text-amber-400">{decibels} dBFS</span>
          </div>

          {/* Equalizer Visualizer Bars */}
          <div className="flex items-center gap-1">
            {[65, 80, 45, 90, 70, 50, 85, 60].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-amber-400 rounded-full transition-all duration-200"
                style={{
                  height: `${Math.max(4, (h * (decibels + 35)) / 30)}px`,
                  opacity: 0.4 + (i % 3) * 0.3,
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
            <span className="text-[9px] text-emerald-400 uppercase font-semibold">LMS Noise Cancel</span>
          </div>
        </div>

        {/* Live Transcript Stream */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-amber-600/30"
        >
          {transcripts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-3 text-stone-400 opacity-70">
              <Mic className="w-6 h-6 text-amber-500/50 mb-2 animate-bounce" />
              <p className="text-[10px] uppercase tracking-wider text-amber-300/70">
                Listening for hands-free culturomics protocols...
              </p>
              <span className="text-[9px] text-stone-400 mt-1">Speak command or use Macro Simulator below</span>
            </div>
          ) : (
            transcripts.map((t, idx) => (
              <div
                key={t.id || idx}
                className="p-2 rounded-lg bg-stone-900/70 border border-amber-500/25 flex flex-col gap-1 transition-all"
              >
                <div className="flex items-center justify-between text-[9px] text-stone-400">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_#f59e0b]" />
                    <span className="text-amber-400/90 font-bold uppercase">[OPERATOR]</span>
                  </div>
                  <span>
                    {new Date(t.timestamp).toLocaleTimeString([], {
                      hour12: false,
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-amber-100 text-[11px] leading-relaxed font-semibold">
                  "{t.text}"
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-amber-500/10 text-[9px]">
                  <span className="text-stone-400">Latency: 168ms</span>
                  <span className="text-emerald-400 font-bold">
                    {(t.confidence * 100).toFixed(1)}% Confidence
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </JarvisBox>
  );
};
