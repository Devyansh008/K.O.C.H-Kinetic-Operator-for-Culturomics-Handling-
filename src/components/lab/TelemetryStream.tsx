/**
 * src/components/lab/TelemetryStream.tsx
 *
 * Append-only, auto-scrolling live telemetry event ticker.
 * Auto-generates sensor events every 3s when experiment is ACTIVE.
 * Filter controls by EventType.
 */

import { useEffect, useRef, useState } from 'react';
import { Activity, Filter } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import { createTelemetryEvent } from '../../lib/telemetryLogger';
import type { EventType } from '../../types';

const TYPE_FILTERS: Array<{ label: string; value: EventType | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Voice', value: 'VOICE_UTTERANCE' },
  { label: 'Intent', value: 'INTENT' },
  { label: 'Frame', value: 'FRAME_MARK' },
  { label: 'State', value: 'STATE_CHANGE' },
];

const TYPE_COLOR: Record<EventType, string> = {
  VOICE_UTTERANCE: 'text-lab-warn border-lab-warn/40 bg-lab-warn/5',
  INTENT: 'text-lab-accent2 border-lab-accent2/40 bg-lab-accent2/5',
  FRAME_MARK: 'text-lab-accent border-lab-accent/40 bg-lab-accent/5',
  STATE_CHANGE: 'text-lab-subtext border-lab-border bg-lab-surface',
};

export function TelemetryStream() {
  const { state, dispatch } = useKoch();
  const { events, experiment } = state;
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');
  const [paused, setPaused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-generate sensor events every 3 seconds when experiment is ACTIVE
  useEffect(() => {
    if (experiment?.status !== 'ACTIVE') {
      if (tickerRef.current) clearInterval(tickerRef.current);
      return;
    }
    tickerRef.current = setInterval(() => {
      const types: EventType[] = ['FRAME_MARK', 'STATE_CHANGE'];
      const t = types[Math.floor(Math.random() * types.length)];
      const evt = createTelemetryEvent(experiment.id, t, {
        auto: true,
        source: 'sensor-daemon',
        plate: 'Plate 4',
      });
      dispatch({ type: 'APPEND_EVENT', payload: evt });
    }, 3000);
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [experiment?.status, experiment?.id, dispatch]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events.length, paused]);

  const filtered = filter === 'ALL' ? events : events.filter((e) => e.type === filter);

  return (
    <div className="card flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="card-header">
        <Activity className="w-4 h-4" />
        Telemetry Stream
        <span className="ml-1 text-lab-subtext font-normal">({events.length} events)</span>
        <div className="ml-auto flex items-center gap-2">
          {experiment?.status === 'ACTIVE' && (
            <span className="badge-active">
              <span className="status-dot-active" />
              LIVE
            </span>
          )}
          <button
            onClick={() => setPaused((p) => !p)}
            className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
              paused
                ? 'border-lab-warn text-lab-warn bg-lab-warn/10'
                : 'border-lab-border text-lab-subtext hover:border-lab-accent hover:text-lab-accent'
            }`}
          >
            {paused ? 'PAUSED' : 'SCROLL'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5">
        <Filter className="w-3 h-3 text-lab-muted" />
        {TYPE_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
              filter === value
                ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                : 'border-lab-border text-lab-muted hover:border-lab-subtext hover:text-lab-subtext'
            }`}
          >
            {label}
          </button>
        ))}
        {events.length > 0 && (
          <span className="ml-auto text-[9px] font-mono text-lab-subtext">
            {filtered.length}/{events.length}
          </span>
        )}
      </div>

      {/* Event feed */}
      <div
        className="flex-1 overflow-y-auto space-y-1 min-h-0"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <Activity className="w-6 h-6 text-lab-muted/30" />
            <p className="text-[10px] font-mono text-lab-muted/50">
              {experiment ? 'Waiting for events…' : 'Start an experiment to begin streaming'}
            </p>
          </div>
        ) : (
          filtered.map((evt) => (
            <div key={evt.id} className="group">
              <div
                className={`font-mono text-[9px] border rounded px-2 py-1.5 transition-all group-hover:brightness-110 ${TYPE_COLOR[evt.type]}`}
              >
                {/* Top row: timestamp + type */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lab-subtext">{evt.createdAt.toISOString()}</span>
                  <span className="font-bold uppercase">{evt.type.replace('_', ' ')}</span>
                  {evt.wellId && (
                    <span className="text-lab-muted">well:{evt.wellId.slice(-6)}</span>
                  )}
                </div>
                {/* Payload preview */}
                <div className="text-[8px] text-lab-subtext/80 font-mono truncate">
                  {JSON.stringify({
                    ...evt.rawPayload,
                    ...(evt.telemetry
                      ? {
                          telemetry: {
                            OD600: evt.telemetry.OD600,
                            temp: evt.telemetry.temp_celsius,
                            CO2: evt.telemetry.CO2_pct,
                          },
                        }
                      : {}),
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
