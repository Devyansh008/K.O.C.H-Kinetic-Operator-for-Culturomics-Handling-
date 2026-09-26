import React, { useState } from 'react';
import { ScrollText, Activity, Filter, Download, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import { GrowthVelocityChart } from './GrowthVelocityChart';
import type { EventType } from '../../types';

export const SystemEventLogs: React.FC = () => {
  const { state } = useKoch();
  const { events, experiment } = state;
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === 'ALL' ? events : events.filter((e) => e.type === filter);

  return (
    <div className="w-full h-full flex flex-col justify-between font-mono text-xs relative overflow-hidden">
      {/* Optical Slide Microscopic Warm Vignette Background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.12)_0%,_rgba(120,53,15,0.05)_50%,_rgba(0,0,0,0.8)_100%)] animate-flicker" />

      {/* Top Header */}
      <div className="relative z-10">
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 mb-2">
          <div className="flex items-center gap-1.5">
            <ScrollText className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs uppercase tracking-widest text-amber-300 font-bold">
              LENS 3: Magnified Specimen Slide &amp; ELN
            </h2>
          </div>
          <span className="text-[10px] text-amber-500 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
            Immutable Append-Only Audit Stream
          </span>
        </div>

        {/* Growth Velocity chart on top */}
        <div className="mb-3">
          <GrowthVelocityChart />
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
          <Filter className="w-3 h-3 text-amber-400" />
          {(['ALL', 'VOICE_UTTERANCE', 'INTENT', 'FRAME_MARK', 'STATE_CHANGE'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                filter === t
                  ? 'border-amber-400 text-amber-200 bg-amber-500/20 shadow-[0_0_8px_#f59e0b]'
                  : 'border-stone-800 text-stone-400 hover:text-stone-300'
              }`}
            >
              {t === 'ALL' ? 'All Logs' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Event Stream List */}
      <div className="relative z-10 flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
        {filtered.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-stone-500">
            <Activity className="w-6 h-6 mb-1 text-stone-600 animate-pulse" />
            <span>No events matching criteria</span>
          </div>
        ) : (
          filtered.slice().reverse().map((evt) => {
            const isExpanded = expandedId === evt.id;
            return (
              <div
                key={evt.id}
                className="bg-stone-900/70 border border-amber-900/30 hover:border-amber-500/30 rounded-lg p-2 transition-all cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : evt.id)}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-amber-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-stone-500" />
                    )}
                    <span className="text-amber-400 font-bold uppercase">{evt.type}</span>
                    {evt.wellId && (
                      <span className="text-emerald-400 font-semibold">[{evt.wellId}]</span>
                    )}
                  </div>
                  <span className="text-stone-500">{new Date(evt.createdAt).toLocaleTimeString()}</span>
                </div>

                <div className="text-[11px] text-stone-300 truncate mt-1">
                  {JSON.stringify(evt.rawPayload)}
                </div>

                {isExpanded && (
                  <pre className="text-[10px] text-amber-200/90 whitespace-pre-wrap bg-stone-950/80 p-2 rounded border border-amber-500/20 mt-2 max-h-36 overflow-y-auto">
                    {JSON.stringify(evt, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Atmospheric Telemetry Footer */}
      <div className="relative z-10 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-stone-400">
        <span>Gas mixture: Anaerobic Standard (85% N₂, 10% CO₂, 5% H₂)</span>
        <span className="text-amber-400">λ: 600nm · 37.0°C</span>
      </div>
    </div>
  );
};
