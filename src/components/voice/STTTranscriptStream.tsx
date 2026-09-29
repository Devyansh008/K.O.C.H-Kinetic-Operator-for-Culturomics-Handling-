import React, { useState } from 'react';
import { MessageSquare, Zap, Cpu, CheckCircle2, ChevronRight } from 'lucide-react';
import { useKoch } from '../../lib/mockState';

const SAMPLE_COMMANDS = [
  { text: 'Mark plate 4 well C7', intent: { action: 'MARK_WELL', plate: 'Plate 4', coordinate: 'C7' } },
  { text: 'Log OD600 0.145 on well C7', intent: { action: 'RECORD_OD600', coordinate: 'C7', OD600: 0.145 } },
  { text: 'Set anaerobic chamber to 37 degrees', intent: { action: 'SET_ENVIRONMENT', targetTemp: 37 } },
  { text: 'Inoculate gut isolate Akkermansia', intent: { action: 'ADD_CULTURE', culture: 'Akkermansia muciniphila' } },
  { text: 'Start 45 minute growth timer', intent: { action: 'START_TIMER', durationMinutes: 45 } },
];

export const STTTranscriptStream: React.FC = () => {
  const { state, emitVoiceUtterance, markWell } = useKoch();
  const { transcripts, events } = state;
  const [selectedTab, setSelectedTab] = useState<'stream' | 'intents'>('stream');

  const intentEvents = events
    .filter((e) => e.type === 'INTENT' || e.type === 'VOICE_UTTERANCE')
    .slice()
    .reverse();

  const handleSimulateCommand = (cmd: typeof SAMPLE_COMMANDS[0]) => {
    emitVoiceUtterance(cmd.text);
    if (cmd.intent.action === 'MARK_WELL' && 'coordinate' in cmd.intent && cmd.intent.coordinate) {
      markWell(cmd.intent.coordinate, 'colony_positive');
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between font-mono text-xs">
      {/* Header Tabs */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 mb-3">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold">
              Speech-to-Text
            </h2>
          </div>
          <span className="text-[10px] text-amber-500/70 font-semibold">AssemblyAI Engine</span>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-stone-900 rounded-lg mb-3 border border-stone-800">
          <button
            onClick={() => setSelectedTab('stream')}
            className={`py-1 text-[11px] font-semibold rounded transition-colors ${
              selectedTab === 'stream'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Live Transcripts ({transcripts.length})
          </button>
          <button
            onClick={() => setSelectedTab('intents')}
            className={`py-1 text-[11px] font-semibold rounded transition-colors ${
              selectedTab === 'intents'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Parsed Intents ({intentEvents.length})
          </button>
        </div>
      </div>

      {/* Main Stream Content */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 my-2">
        {selectedTab === 'stream' ? (
          transcripts.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-stone-500">
              <Zap className="w-6 h-6 mb-2 text-stone-600 animate-pulse" />
              <span>Awaiting operator vocal input...</span>
              <span className="text-[10px] text-stone-600 mt-1">Speak hands-free or test phrase below</span>
            </div>
          ) : (
            transcripts.map((t) => (
              <div
                key={t.id}
                className="bg-stone-900/60 border border-amber-900/40 hover:border-amber-500/30 p-2.5 rounded-lg transition-colors shadow"
              >
                <div className="flex items-center justify-between text-[10px] text-amber-500/60 mb-1">
                  <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                  <span className="text-emerald-400 font-bold">
                    {(t.confidence * 100).toFixed(1)}% conf.
                  </span>
                </div>
                <div className="text-amber-100 font-medium">"{t.text}"</div>
              </div>
            ))
          )
        ) : intentEvents.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-stone-500">
            <Cpu className="w-6 h-6 mb-2 text-stone-600" />
            <span>No parsed domain intents yet.</span>
          </div>
        ) : (
          intentEvents.map((e) => (
            <div
              key={e.id}
              className="bg-stone-900/60 border border-amber-500/20 p-2.5 rounded-lg font-mono text-[11px]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-amber-400 font-bold uppercase">{e.type}</span>
                <span className="text-[10px] text-stone-400">
                  {new Date(e.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-[10px] text-amber-200/90 whitespace-pre-wrap bg-stone-950/70 p-1.5 rounded border border-stone-800">
                {JSON.stringify(e.rawPayload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* Quick Spoken Simulator Prompts */}
      <div className="pt-2 border-t border-amber-500/20">
        <span className="text-[10px] text-amber-500/80 uppercase tracking-widest block mb-1.5 font-bold">
          Quick Utterance Simulator
        </span>
        <div className="space-y-1">
          {SAMPLE_COMMANDS.slice(0, 3).map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => handleSimulateCommand(cmd)}
              className="w-full flex items-center justify-between text-left p-1.5 bg-stone-900/80 hover:bg-amber-950/40 border border-stone-800 hover:border-amber-500/40 rounded text-[11px] text-stone-300 hover:text-amber-200 transition-all group"
            >
              <span className="truncate">"{cmd.text}"</span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
