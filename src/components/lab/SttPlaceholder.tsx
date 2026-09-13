/**
 * src/components/lab/SttPlaceholder.tsx
 *
 * Mock Speech-to-Text pipeline UI:
 * - Mic status indicator (LISTENING / PROCESSING / MUTED)
 * - LMS noise suppression status
 * - Animated audio waveform bars
 * - Microbiology grammar lexicon confidence display
 * - Quick-trigger voice phrase buttons
 */

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Cpu, ChevronRight } from 'lucide-react';
import { useKoch } from '../../lib/mockState';

const QUICK_PHRASES = [
  { label: 'Mark C7 positive', phrase: 'Mark plate 4 well C7 positive' },
  { label: 'Log OD600', phrase: 'Log OD600 0.145' },
  { label: 'Set temp 37°C', phrase: 'Set incubator temperature to 37 degrees' },
  { label: 'Start protocol', phrase: 'Begin standard culturomics protocol' },
  { label: 'Note contamination', phrase: 'Flag well D4 as contaminated' },
  { label: 'End session', phrase: 'End experiment and generate ELN report' },
] as const;

const LEXICON_MATCHES = [
  { term: 'Akkermansia muciniphila', confidence: 98.4 },
  { term: 'Bacteroides fragilis', confidence: 97.1 },
  { term: 'Faecalibacterium prausnitzii', confidence: 95.8 },
  { term: 'Bifidobacterium longum', confidence: 94.2 },
  { term: 'OD600', confidence: 99.9 },
  { term: 'CFU/mL', confidence: 99.7 },
] as const;

const NUM_BARS = 24;

export function SttPlaceholder() {
  const { state, dispatch, emitVoiceUtterance } = useKoch();
  const { sttStatus, transcripts } = state;
  const [bars, setBars] = useState<number[]>(Array(NUM_BARS).fill(4));
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate waveform when LISTENING or PROCESSING
  useEffect(() => {
    if (sttStatus === 'MUTED') {
      setBars(Array(NUM_BARS).fill(4));
      if (animRef.current) clearInterval(animRef.current);
      return;
    }
    animRef.current = setInterval(() => {
      setBars(
        Array.from({ length: NUM_BARS }, (_, i) => {
          const base = sttStatus === 'PROCESSING' ? 8 : 3;
          const amp = sttStatus === 'LISTENING' ? 20 : 32;
          return base + Math.abs(Math.sin(Date.now() / 200 + i * 0.7)) * amp * Math.random();
        }),
      );
    }, 80);
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [sttStatus]);

  const handlePhrase = (phrase: string) => {
    dispatch({ type: 'SET_STT_STATUS', payload: 'PROCESSING' });
    setTimeout(() => {
      emitVoiceUtterance(phrase);
      dispatch({ type: 'SET_STT_STATUS', payload: 'LISTENING' });
    }, 600);
  };

  const cycleStatus = () => {
    const next: Record<typeof sttStatus, typeof sttStatus> = {
      MUTED: 'LISTENING',
      LISTENING: 'PROCESSING',
      PROCESSING: 'MUTED',
    };
    dispatch({ type: 'SET_STT_STATUS', payload: next[sttStatus] });
  };

  const statusColor = {
    LISTENING: 'text-lab-success',
    PROCESSING: 'text-lab-warn',
    MUTED: 'text-lab-danger',
  }[sttStatus];

  const statusBg = {
    LISTENING: 'bg-lab-success/10 border-lab-success/30',
    PROCESSING: 'bg-lab-warn/10 border-lab-warn/30',
    MUTED: 'bg-lab-danger/10 border-lab-danger/30',
  }[sttStatus];

  return (
    <div className="card flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="card-header">
        <Mic className="w-4 h-4" />
        STT Pipeline
        <div className="ml-auto">
          <button
            onClick={cycleStatus}
            className={`badge border ${statusBg} ${statusColor} cursor-pointer hover:brightness-125 transition-all`}
          >
            {sttStatus === 'LISTENING' && <span className="status-dot-active" />}
            {sttStatus === 'PROCESSING' && <span className="w-2 h-2 rounded-full bg-lab-warn animate-pulse" />}
            {sttStatus === 'MUTED' && <MicOff className="w-3 h-3" />}
            {sttStatus}
          </button>
        </div>
      </div>

      {/* LMS Noise filter status */}
      <div className="flex items-center gap-2 bg-lab-surface rounded-lg px-3 py-2 border border-lab-border">
        <Radio className="w-3.5 h-3.5 text-lab-accent2 flex-shrink-0" />
        <div>
          <div className="text-[9px] font-mono text-lab-subtext uppercase tracking-widest">LMS Noise Filter</div>
          <div className="text-xs font-mono text-lab-text">
            {sttStatus === 'MUTED' ? (
              <span className="text-lab-danger">Disabled</span>
            ) : (
              <>
                <span className="text-lab-accent">Active</span>
                <span className="text-lab-subtext"> · -72dB Hood Fan Suppression</span>
              </>
            )}
          </div>
        </div>
        <Cpu className="w-3 h-3 text-lab-muted ml-auto" />
        <span className="text-[9px] font-mono text-lab-muted">LMS-512</span>
      </div>

      {/* Waveform visualizer */}
      <div className="bg-black/40 rounded-lg border border-lab-border p-2">
        <div className="text-[9px] font-mono text-lab-subtext mb-1 uppercase tracking-widest">Audio RMS Level</div>
        <div className="flex items-end gap-[2px] h-12">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-75"
              style={{
                height: `${Math.max(3, Math.min(h, 48))}px`,
                backgroundColor:
                  sttStatus === 'MUTED'
                    ? '#1a1a1a'
                    : sttStatus === 'PROCESSING'
                    ? `rgb(${160 + Math.round(h * 0.8)}, ${160 + Math.round(h * 0.8)}, ${160 + Math.round(h * 0.8)})`
                    : `rgb(${90 + Math.round(h * 1.2)}, ${90 + Math.round(h * 1.2)}, ${90 + Math.round(h * 1.2)})`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] font-mono text-lab-muted">0 Hz</span>
          <span className="text-[8px] font-mono text-lab-muted">8 kHz</span>
        </div>
      </div>

      {/* Lexicon confidence table */}
      <div>
        <div className="text-[9px] font-mono text-lab-subtext uppercase tracking-widest mb-1">
          Microbiology Grammar Lexicon
        </div>
        <div className="space-y-1">
          {LEXICON_MATCHES.map(({ term, confidence }) => (
            <div key={term} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-lab-text flex-1 truncate">{term}</span>
              <div className="w-20 bg-lab-border rounded-full h-1.5 flex-shrink-0">
                <div
                  className="h-1.5 rounded-full bg-lab-accent"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-lab-accent w-10 text-right">{confidence}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick-trigger phrases */}
      <div>
        <div className="text-[9px] font-mono text-lab-subtext uppercase tracking-widest mb-1.5">
          Quick-Trigger Phrases
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_PHRASES.map(({ label, phrase }) => (
            <button
              key={phrase}
              onClick={() => handlePhrase(phrase)}
              disabled={sttStatus === 'MUTED' || !state.experiment}
              className="btn-ghost text-[10px] justify-start gap-1 px-2 py-1.5 disabled:opacity-30"
              title={phrase}
            >
              <ChevronRight className="w-3 h-3 text-lab-accent flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
        {!state.experiment && (
          <p className="text-[9px] font-mono text-lab-muted mt-1">Start an experiment to enable triggers</p>
        )}
      </div>

      {/* Transcript queue */}
      <div className="flex-1 overflow-hidden">
        <div className="text-[9px] font-mono text-lab-subtext uppercase tracking-widest mb-1">
          Transcript Queue ({transcripts.length})
        </div>
        <div className="space-y-1 overflow-y-auto max-h-28">
          {transcripts.slice(0, 8).map((t) => (
            <div key={t.id} className="log-entry log-entry-utterance">
              <div className="text-[9px] text-lab-subtext">{t.timestamp.toISOString()}</div>
              <div className="text-[10px] text-lab-text truncate">{t.text}</div>
              <div className="text-[9px] text-lab-accent">{(t.confidence * 100).toFixed(1)}% conf.</div>
            </div>
          ))}
          {transcripts.length === 0 && (
            <p className="text-[9px] font-mono text-lab-muted/50 italic">No transcripts yet…</p>
          )}
        </div>
      </div>
    </div>
  );
}
