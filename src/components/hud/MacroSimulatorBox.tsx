import React, { useState } from 'react';
import { Zap, Play, Send, Sparkles } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import { JarvisBox } from './JarvisBox';

interface MacroCommand {
  label: string;
  utterance: string;
  badge: string;
  action: () => void;
}

export const MacroSimulatorBox: React.FC<{ className?: string }> = ({ className }) => {
  const { emitVoiceUtterance, markWell, selectWell } = useKoch();
  const [customText, setCustomText] = useState('');
  const [activeMacro, setActiveMacro] = useState<string | null>(null);

  const MACRO_PRESETS: MacroCommand[] = [
    {
      label: 'Mark Colony Positive',
      utterance: 'Mark plate 4 well C7 as colony positive',
      badge: 'MARK_WELL',
      action: () => {
        selectWell('C7');
        markWell('C7', 'colony_positive');
      },
    },
    {
      label: 'Log OD600 Reading',
      utterance: 'Log OD600 0.145 on well C7',
      badge: 'LOG_OD600',
      action: () => {
        selectWell('C7');
      },
    },
    {
      label: 'Calibrate Atmosphere',
      utterance: 'Set anaerobic chamber to 37 degrees Celsius',
      badge: 'SET_ENV',
      action: () => {},
    },
    {
      label: 'Inoculate Akkermansia',
      utterance: 'Inoculate gut isolate Akkermansia muciniphila',
      badge: 'INOCULATE',
      action: () => {
        markWell('C7', 'inoculated');
      },
    },
    {
      label: 'Growth Kinetics Timer',
      utterance: 'Start 45 minute exponential growth timer',
      badge: 'START_TIMER',
      action: () => {},
    },
  ];

  const handleTrigger = (macro: MacroCommand) => {
    setActiveMacro(macro.label);
    emitVoiceUtterance(macro.utterance);
    macro.action();
    setTimeout(() => setActiveMacro(null), 600);
  };

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    emitVoiceUtterance(customText.trim());
    setCustomText('');
  };

  return (
    <JarvisBox
      title="Macro Simulator"
      statusBadge="Dev Test Triggers"
      icon={<Zap className="w-3.5 h-3.5" />}
      className={className}
    >
      <div className="flex flex-col h-full gap-2">
        {/* Quick Trigger Buttons */}
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-600/30">
          {MACRO_PRESETS.map((m) => {
            const isFiring = activeMacro === m.label;
            return (
              <button
                key={m.label}
                onClick={() => handleTrigger(m)}
                className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isFiring
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-stone-900/60 border-amber-500/20 text-stone-300 hover:bg-amber-950/40 hover:border-amber-500/40 hover:text-amber-100'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <Play className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="text-[11px] font-bold text-amber-300 truncate">
                      {m.label}
                    </span>
                  </div>
                  <p className="text-[9px] text-stone-400 truncate italic mt-0.5">
                    "{m.utterance}"
                  </p>
                </div>

                <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono font-bold shrink-0">
                  {m.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Utterance Input */}
        <form onSubmit={handleSendCustom} className="flex gap-1.5 pt-1 border-t border-amber-500/20">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Simulate speech: e.g. Record well D5..."
            className="flex-1 bg-stone-900/90 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-100 placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40"
          />
          <button
            type="submit"
            disabled={!customText.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center transition-all"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </JarvisBox>
  );
};
