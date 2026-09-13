/**
 * src/components/lab/VoiceSimulator.tsx
 *
 * Parent wrapper that hosts SttPlaceholder and TtsPlaceholder side-by-side.
 * Provides a unified header and global quick-trigger bar.
 */

import { Mic2 } from 'lucide-react';
import { SttPlaceholder } from './SttPlaceholder';
import { TtsPlaceholder } from './TtsPlaceholder';

export function VoiceSimulator() {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Section title */}
      <div className="flex items-center gap-2 px-1">
        <Mic2 className="w-4 h-4 text-lab-accent" />
        <span className="text-xs font-mono font-semibold uppercase tracking-widest text-lab-accent">
          Voice / STT + TTS Pipeline Simulator
        </span>
        <div className="flex-1 border-t border-lab-border ml-2" />
        <span className="text-[9px] font-mono text-lab-subtext">MOCK MODE — no cloud API</span>
      </div>

      {/* Side-by-side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        <SttPlaceholder />
        <TtsPlaceholder />
      </div>
    </div>
  );
}
