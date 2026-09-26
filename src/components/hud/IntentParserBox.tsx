import React, { useMemo } from 'react';
import { Cpu, CheckCircle2, ShieldCheck, Gauge } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import { JarvisBox } from './JarvisBox';

export const IntentParserBox: React.FC<{ className?: string }> = ({ className }) => {
  const { state } = useKoch();
  const { transcripts, events, selectedWell } = state;

  const latestTranscript = transcripts[transcripts.length - 1];

  // Derive structured intent from latest transcript or fallback to current well telemetry
  const parsedIntent = useMemo(() => {
    const text = latestTranscript?.text?.toLowerCase() || '';

    if (text.includes('od600') || text.includes('0.145') || text.includes('log')) {
      return {
        action: 'RECORD_OD600',
        target: 'SPECTROPHOTOMETER_IN_SITU',
        coordinate: selectedWell || 'C7',
        value: 0.145,
        unit: 'OD_600_AU',
        confidence: 0.988,
        immutableHash: '0x8f2d...c34a',
      };
    }

    if (text.includes('plate') || text.includes('mark') || text.includes('well')) {
      return {
        action: 'MARK_WELL_STATE',
        target: 'COLONY_ISOLATION_PLATE',
        coordinate: selectedWell || 'C7',
        state: 'COLONY_POSITIVE',
        confidence: 0.992,
        immutableHash: '0x3a7e...e910',
      };
    }

    if (text.includes('anaerobic') || text.includes('chamber') || text.includes('temp')) {
      return {
        action: 'CALIBRATE_ATMOSPHERE',
        target: 'GLOVEBOX_N2_CHAMBER',
        targetTemp: '37.0°C',
        o2Threshold: '< 2.0 ppm',
        confidence: 0.976,
        immutableHash: '0x6e1b...94b2',
      };
    }

    if (text.includes('akkermansia') || text.includes('culture') || text.includes('inoculate')) {
      return {
        action: 'INOCULATE_ISOLATE',
        organism: 'Akkermansia muciniphila',
        gramStain: 'NEGATIVE_STRICT_ANAEROBE',
        passage: 'P3_G4',
        confidence: 0.984,
        immutableHash: '0x1c8f...47f0',
      };
    }

    // Default baseline intent
    return {
      action: 'SYSTEM_STANDBY_MONITOR',
      target: 'OPTICAL_CENTRAL_RETICLE',
      activeWell: selectedWell || 'C7',
      pipelineStatus: 'READY_FOR_VOICE_TRIGGER',
      confidence: 0.995,
      immutableHash: '0x99a2...7b31',
    };
  }, [latestTranscript, selectedWell]);

  const confidencePct = (parsedIntent.confidence * 100).toFixed(1);

  return (
    <JarvisBox
      title="Intent Parser"
      statusBadge="NLU Engine // 98%"
      icon={<Cpu className="w-3.5 h-3.5" />}
      className={className}
    >
      <div className="flex flex-col h-full gap-2.5">
        {/* Confidence Gauge Header */}
        <div className="p-2 rounded-lg bg-stone-900/60 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-stone-300 uppercase font-semibold">Intent Match:</span>
            <span className="text-[10px] text-emerald-400 font-bold">{confidencePct}%</span>
          </div>

          {/* Mini gauge progress bar */}
          <div className="w-24 h-1.5 bg-stone-950 rounded-full overflow-hidden border border-amber-500/30">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full shadow-[0_0_8px_#10b981]"
              style={{ width: `${confidencePct}%` }}
            />
          </div>

          <div className="flex items-center gap-1 text-[9px] text-stone-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>RTT: 34ms</span>
          </div>
        </div>

        {/* Structured JSON Payload Display */}
        <div className="flex-1 p-2 rounded-lg bg-stone-950/80 border border-amber-500/25 overflow-y-auto font-mono text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-amber-600/30">
          <div className="text-stone-400 mb-1 flex items-center justify-between pb-1 border-b border-amber-500/15">
            <span className="text-amber-400/90 font-bold uppercase text-[9px]">
              // PARSED INTENT PAYLOAD
            </span>
            <span className="text-[8px] text-stone-400">SCHEMA: RFC-8259</span>
          </div>

          <pre className="text-amber-200">
            {JSON.stringify(parsedIntent, null, 2)
              .split('\n')
              .map((line, i) => {
                const isKey = line.includes('":');
                return (
                  <div key={i} className="hover:bg-amber-500/10 px-1 rounded transition-colors">
                    {isKey ? (
                      <span>
                        <span className="text-amber-400 font-semibold">
                          {line.split('":')[0]}":
                        </span>
                        <span className="text-emerald-300">
                          {line.split('":')[1]}
                        </span>
                      </span>
                    ) : (
                      <span className="text-amber-200/90">{line}</span>
                    )}
                  </div>
                );
              })}
          </pre>
        </div>

        {/* Immutability Verification Tag */}
        <div className="flex items-center justify-between text-[9px] text-stone-400 px-1">
          <div className="flex items-center gap-1 text-amber-300/80">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>ELN Hash: {parsedIntent.immutableHash}</span>
          </div>
          <span className="text-emerald-400 font-semibold">VERIFIED HASH</span>
        </div>
      </div>
    </JarvisBox>
  );
};
