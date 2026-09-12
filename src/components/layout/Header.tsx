/**
 * src/components/layout/Header.tsx
 *
 * Session control bar: experiment name, status badge, live timer,
 * Start / End / Abort action buttons.
 */

import { useEffect, useRef, useState } from 'react';
import { FlaskConical, Play, Square, X, Wifi, Clock } from 'lucide-react';
import { useKoch } from '../../lib/mockState';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function Header() {
  const { state, startExperiment, endExperiment } = useKoch();
  const { experiment } = state;
  const [elapsed, setElapsed] = useState(0);
  const [expName, setExpName] = useState('KOCH-' + new Date().toISOString().slice(0, 10));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (experiment?.status === 'ACTIVE') {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - experiment.startedAt.getTime());
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!experiment) setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [experiment?.status, experiment?.startedAt]);

  const isActive = experiment?.status === 'ACTIVE';

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-lab-surface border-b border-lab-border flex-shrink-0">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-lab-accent" />
          <span className="font-mono font-bold text-sm text-lab-accent tracking-widest">K.O.C.H.</span>
        </div>
        <span className="text-lab-border text-sm">|</span>
        <span className="text-xs font-mono text-lab-subtext">
          Kinetic Operator for Culturomics &amp; Handling
        </span>
      </div>

      {/* Center: experiment state */}
      <div className="flex items-center gap-4">
        {experiment ? (
          <>
            <span className="text-xs font-mono text-lab-subtext">{experiment.id.slice(0, 16)}</span>
            <span className="font-mono font-semibold text-sm text-lab-text">{experiment.name}</span>
            {experiment.status === 'ACTIVE' && (
              <span className="badge-active">
                <span className="status-dot-active" />
                ACTIVE
              </span>
            )}
            {experiment.status === 'COMPLETED' && (
              <span className="badge-done">COMPLETED</span>
            )}
            {experiment.status === 'ABORTED' && (
              <span className="badge-warn">ABORTED</span>
            )}
          </>
        ) : (
          <span className="badge-neutral">NO ACTIVE SESSION</span>
        )}
      </div>

      {/* Right: timer + controls */}
      <div className="flex items-center gap-3">
        {/* Timer */}
        <div className="flex items-center gap-1.5 bg-lab-card border border-lab-border rounded-lg px-3 py-1.5">
          <Clock className="w-3.5 h-3.5 text-lab-subtext" />
          <span className={`font-mono text-sm tabular-nums ${isActive ? 'text-lab-accent' : 'text-lab-muted'}`}>
            {formatDuration(elapsed)}
          </span>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <Wifi className={`w-4 h-4 ${isActive ? 'text-lab-success' : 'text-lab-muted'}`} />
          <span className="text-[10px] font-mono text-lab-subtext">{isActive ? 'LIVE' : 'IDLE'}</span>
        </div>

        {/* Experiment name input + start button */}
        {!experiment || experiment.status !== 'ACTIVE' ? (
          <div className="flex items-center gap-2">
            <input
              className="input w-44 h-8 text-xs"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              placeholder="Experiment name…"
            />
            <button
              className="btn-primary h-8 text-xs"
              onClick={() => startExperiment(expName || 'Unnamed Experiment')}
            >
              <Play className="w-3.5 h-3.5" />
              Start
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="btn bg-lab-success/20 text-lab-success border border-lab-success/30 hover:bg-lab-success/30 h-8 text-xs"
              onClick={() => endExperiment('COMPLETED')}
            >
              <Square className="w-3.5 h-3.5" />
              End
            </button>
            <button
              className="btn-danger h-8 text-xs"
              onClick={() => endExperiment('ABORTED')}
            >
              <X className="w-3.5 h-3.5" />
              Abort
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
