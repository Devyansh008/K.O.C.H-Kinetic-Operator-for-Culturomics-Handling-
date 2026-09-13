/**
 * src/components/lab/TtsPlaceholder.tsx
 *
 * Mock Text-to-Speech pipeline UI:
 * - Engine label (VoiceChat-TTS / RTX A6000 pipeline)
 * - Real-time ITL + Next-Frame latency counters
 * - Audio queue player (play / cancel per item)
 * - Prediction-Based Barge-In (PBR) toggle
 */

import { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Zap, Radio, Play, X, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import { uid } from '../../lib/telemetryLogger';
import type { TtsQueueItem } from '../../types';

const SAMPLE_RESPONSES = [
  'Well C7 marked as colony positive. OD₆₀₀ logged at 0.145.',
  'Incubator temperature set to 37 degrees Celsius.',
  'OD₆₀₀ reading of 0.145 recorded for Plate 4.',
  'Culturomics protocol initiated. Monitoring wells A1 through H12.',
  'ELN report generation queued. Format: ISA-Tab.',
] as const;

export function TtsPlaceholder() {
  const { state, dispatch } = useKoch();
  const { ttsQueue, ttsItl, ttsNextFrame, pbrEnabled } = state;
  const itlIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate fluctuating latency
  useEffect(() => {
    itlIntervalRef.current = setInterval(() => {
      const itl = 6.8 + Math.random() * 1.2;
      const nextFrame = 8.9 + Math.random() * 1.5;
      dispatch({ type: 'SET_ITL', payload: { itl: +itl.toFixed(2), nextFrame: +nextFrame.toFixed(2) } });
    }, 800);
    return () => {
      if (itlIntervalRef.current) clearInterval(itlIntervalRef.current);
    };
  }, [dispatch]);

  const enqueueResponse = (text: string) => {
    const item: TtsQueueItem = {
      id: uid('tts'),
      text,
      status: 'queued',
      durationMs: 800 + Math.random() * 1600,
    };
    dispatch({ type: 'PUSH_TTS', payload: item });
  };

  const playItem = (id: string) => {
    dispatch({ type: 'UPDATE_TTS_STATUS', payload: { id, status: 'playing' } });
    const item = ttsQueue.find((i) => i.id === id);
    setTimeout(() => {
      dispatch({ type: 'UPDATE_TTS_STATUS', payload: { id, status: 'done' } });
    }, item?.durationMs ?? 1000);
  };

  const cancelItem = (id: string) => {
    dispatch({ type: 'UPDATE_TTS_STATUS', payload: { id, status: 'cancelled' } });
  };

  const handleBargeIn = () => {
    dispatch({ type: 'CLEAR_TTS_QUEUE' });
    if (state.experiment) {
      // Emit barge-in telemetry
      import('../../lib/telemetryLogger').then(({ createTelemetryEvent }) => {
        const evt = createTelemetryEvent(state.experiment!.id, 'STATE_CHANGE', {
          action: 'PBR_BARGE_IN',
          ior_ms: 320,
          iou_pct: 94.2,
        });
        dispatch({ type: 'APPEND_EVENT', payload: evt });
      });
    }
  };

  const activeItems = ttsQueue.filter((i) => i.status !== 'done' && i.status !== 'cancelled');
  const playingItem = ttsQueue.find((i) => i.status === 'playing');

  const statusDotColor = (s: TtsQueueItem['status']) => {
    if (s === 'playing') return 'bg-lab-accent animate-pulse';
    if (s === 'queued') return 'bg-lab-warn';
    if (s === 'done') return 'bg-lab-success';
    return 'bg-lab-danger';
  };

  return (
    <div className="card flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="card-header">
        <Volume2 className="w-4 h-4" />
        TTS Pipeline
        <div className="ml-auto flex items-center gap-2">
          {playingItem ? (
            <span className="badge-active">
              <span className="status-dot-active" />
              SPEAKING
            </span>
          ) : (
            <span className="badge-neutral">IDLE</span>
          )}
        </div>
      </div>

      {/* Engine info */}
      <div className="bg-lab-surface border border-lab-border rounded-lg px-3 py-2 space-y-1">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-lab-accent2" />
          <span className="text-xs font-mono text-lab-text">VoiceChat-TTS</span>
          <span className="text-[10px] font-mono text-lab-subtext">/ RTX A6000 Pipeline</span>
        </div>
        <div className="flex items-center gap-1 pl-5">
          <span className="text-[9px] font-mono text-lab-muted">Model:</span>
          <span className="text-[9px] font-mono text-lab-accent">voicechat-tts-v3-streaming</span>
        </div>
      </div>

      {/* Latency metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-lab-surface border border-lab-border rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3 h-3 text-lab-accent" />
            <span className="text-[9px] font-mono text-lab-subtext uppercase tracking-widest">ITL</span>
          </div>
          <div className="font-mono text-lg font-bold text-lab-accent tabular-nums">
            {ttsItl.toFixed(2)}
            <span className="text-xs font-normal text-lab-subtext ml-1">ms</span>
          </div>
          <div className="text-[9px] font-mono text-lab-muted">Inter-Token Latency</div>
        </div>
        <div className="bg-lab-surface border border-lab-border rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <ChevronRight className="w-3 h-3 text-lab-accent2" />
            <span className="text-[9px] font-mono text-lab-subtext uppercase tracking-widest">NFL</span>
          </div>
          <div className="font-mono text-lg font-bold text-lab-accent2 tabular-nums">
            {ttsNextFrame.toFixed(2)}
            <span className="text-xs font-normal text-lab-subtext ml-1">ms</span>
          </div>
          <div className="text-[9px] font-mono text-lab-muted">Next-Frame Latency</div>
        </div>
      </div>

      {/* PBR toggle */}
      <div className="flex items-center justify-between bg-lab-surface border border-lab-border rounded-lg px-3 py-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-lab-text">Prediction-Based Barge-In</span>
            <span className="badge-neutral text-[9px]">PBR</span>
          </div>
          <div className="text-[9px] font-mono text-lab-subtext mt-0.5">
            IOR@320ms = 94.2% · {pbrEnabled ? 'Active' : 'Inactive'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_PBR' })}
            className={`transition-colors ${pbrEnabled ? 'text-lab-accent' : 'text-lab-muted'}`}
          >
            {pbrEnabled ? (
              <ToggleRight className="w-7 h-7" />
            ) : (
              <ToggleLeft className="w-7 h-7" />
            )}
          </button>
          {pbrEnabled && (
            <button
              onClick={handleBargeIn}
              className="btn bg-lab-danger/20 text-lab-danger border border-lab-danger/30 hover:bg-lab-danger/30 text-[10px] px-2 py-1"
            >
              <VolumeX className="w-3 h-3" />
              Barge-In!
            </button>
          )}
        </div>
      </div>

      {/* Quick-add responses */}
      <div>
        <div className="text-[9px] font-mono text-lab-subtext uppercase tracking-widest mb-1.5">
          Enqueue Sample Response
        </div>
        <div className="space-y-1">
          {SAMPLE_RESPONSES.slice(0, 3).map((text) => (
            <button
              key={text}
              onClick={() => enqueueResponse(text)}
              className="btn-ghost text-[10px] w-full justify-start gap-1 px-2 py-1 truncate"
              title={text}
            >
              <Play className="w-3 h-3 text-lab-accent flex-shrink-0" />
              <span className="truncate">{text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Audio queue */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono text-lab-subtext uppercase tracking-widest">
            Audio Queue ({activeItems.length})
          </span>
          {activeItems.length > 0 && (
            <button
              onClick={() => dispatch({ type: 'CLEAR_TTS_QUEUE' })}
              className="text-[9px] font-mono text-lab-danger hover:text-lab-danger/80 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="space-y-1 overflow-y-auto max-h-32">
          {ttsQueue.slice().reverse().map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded border text-[10px] font-mono transition-colors ${
                item.status === 'playing'
                  ? 'border-lab-accent/40 bg-lab-accent/5'
                  : item.status === 'done'
                  ? 'border-lab-border/30 opacity-40'
                  : item.status === 'cancelled'
                  ? 'border-lab-danger/20 opacity-30 line-through'
                  : 'border-lab-border'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor(item.status)}`} />
              <span className="flex-1 truncate text-lab-text">{item.text}</span>
              {item.status === 'queued' && (
                <>
                  <button
                    onClick={() => playItem(item.id)}
                    className="text-lab-accent hover:text-lab-accent/80 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => cancelItem(item.id)}
                    className="text-lab-danger hover:text-lab-danger/80 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}
              {item.status === 'playing' && (
                <span className="text-lab-accent animate-pulse">▶</span>
              )}
            </div>
          ))}
          {ttsQueue.length === 0 && (
            <p className="text-[9px] font-mono text-lab-muted/50 italic">Queue empty…</p>
          )}
        </div>
      </div>
    </div>
  );
}
