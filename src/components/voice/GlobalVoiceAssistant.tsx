import React, { useState } from 'react';
import { Mic, Volume2, Shield, Radio } from 'lucide-react';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { useKoch } from '../../lib/mockState';

export const GlobalVoiceAssistant: React.FC = () => {
  const { isListening, latencyMs, lmsFilteringEnabled, startSession, stopSession } = useVoiceAssistant();
  const { state } = useKoch();
  const [minimized, setMinimized] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 font-mono">
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="p-3 bg-stone-900 border-2 border-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] text-amber-300 hover:scale-105 transition-all flex items-center justify-center"
          title="Restore K.O.C.H. Voice Assistant"
        >
          <Radio className="w-5 h-5 animate-pulse text-amber-400" />
        </button>
      ) : (
        <div className="bg-stone-950/90 border border-amber-500/40 backdrop-blur-md rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={isListening ? stopSession : startSession}
              className={`p-2.5 rounded-full transition-all ${
                isListening
                  ? 'bg-amber-500 text-stone-950 shadow-[0_0_15px_#f59e0b]'
                  : 'bg-stone-900 border border-amber-500/30 text-amber-400 hover:bg-stone-800'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                {isListening ? 'Voice Hot' : 'Voice Standby'}
              </span>
              <span className="text-[10px] text-stone-400">
                {state.experiment ? state.experiment.name : 'No session'}
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-stone-800" />

          <div className="flex items-center gap-3 text-[11px] text-stone-400">
            <div className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{latencyMs}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className={`w-3.5 h-3.5 ${lmsFilteringEnabled ? 'text-emerald-400' : 'text-stone-500'}`} />
              <span>LMS: {lmsFilteringEnabled ? 'ON' : 'OFF'}</span>
            </div>
          </div>

          <button
            onClick={() => setMinimized(true)}
            className="text-stone-500 hover:text-stone-300 text-[10px] pl-1 font-bold"
          >
            —
          </button>
        </div>
      )}
    </div>
  );
};
