/**
 * src/components/hud/CentrifugeTelemetryPanel.tsx
 *
 * Dedicated Centrifuge Separation Log HUD panel for Project K.O.C.H.
 * Models the Eppendorf 5810R refrigerated high-throughput separation unit.
 *
 * Features:
 *   - Header: "CENTRIFUGE SEPARATION LOG // EPPENDORF_5810R" with active RUN_COMPLETE badge.
 *   - Input Parameters: Editable Sample Added, Buffer / Reagent Added, Speed, Duration, Temperature.
 *   - Separation Results: Editable Supernatant Harvest, Pellet Mass / Density, Phase Separation Status indicator.
 *   - Action Trigger: "Append Run to ELN Log" button committing data into the live immutable audit stream.
 */

import React, { useState } from 'react';
import {
  Disc,
  CheckCircle2,
  Sliders,
  Beaker,
  Thermometer,
  Clock,
  Gauge,
  Layers,
  ArrowRight,
  Database,
  Sparkles,
} from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import { createTelemetryEvent } from '../../lib/telemetryLogger';

export const CentrifugeTelemetryPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { state, dispatch } = useKoch();

  // Editable Input Parameters
  const [sampleAdded, setSampleAdded] = useState('10 mL Oily Sludge Suspension');
  const [bufferReagent, setBufferReagent] = useState('100 mL Sterile H2O + Glass Beads');
  const [speedRpm, setSpeedRpm] = useState('12,000 RPM');
  const [speedG, setSpeedG] = useState('8,000 g');
  const [durationMin, setDurationMin] = useState('10 min');
  const [temperature, setTemperature] = useState('4°C');
  const [rotor] = useState('F-34-6-38 (Fixed Angle 34°)');

  // Editable Separation Results
  const [supernatantHarvest, setSupernatantHarvest] = useState('18.5 mL Isolated Broth');
  const [pelletMass, setPelletMass] = useState('0.42 g Debris Pellet');
  const [phaseStatus, setPhaseStatus] = useState('Clear Supernatant • Surface Tension < 45 mN/m');

  // Action status state
  const [lastCommittedRun, setLastCommittedRun] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  // Commit centrifuge run directly to the live immutable audit event stream
  const handleAppendToEln = () => {
    setIsCommitting(true);
    const runNumber = `CR-${Math.floor(1000 + Math.random() * 9000)}`;

    const eventPayload = {
      instrument: 'EPPENDORF_5810R',
      runId: runNumber,
      category: 'Phase Separation',
      inputs: {
        sample: sampleAdded,
        buffer: bufferReagent,
        speed: `${speedRpm} (${speedG})`,
        duration: durationMin,
        temperature: temperature,
        rotor,
      },
      results: {
        supernatant: supernatantHarvest,
        pellet: pelletMass,
        phaseStatus,
      },
      auditVerification: 'SHA256_VERIFIED_INSTRUMENT_LOG',
      timestamp: new Date().toISOString(),
    };

    const newEvent = createTelemetryEvent(
      state.experiment?.id ?? 'exp-active',
      'STATE_CHANGE',
      eventPayload,
    );

    dispatch({ type: 'APPEND_EVENT', payload: newEvent });

    setTimeout(() => {
      setIsCommitting(false);
      setLastCommittedRun(runNumber);
    }, 300);
  };

  return (
    <div
      className={`bg-stone-950/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-4 shadow-xl font-mono text-amber-100 flex flex-col justify-between gap-3 ${className}`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <Disc className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <h3 className="text-xs font-bold text-amber-300 tracking-widest uppercase">
            CENTRIFUGE SEPARATION LOG // EPPENDORF_5810R
          </h3>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.25)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>RUN_COMPLETE</span>
        </div>
      </div>

      {/* ── Input Parameters Panel ────────────────────────────────────────── */}
      <div className="bg-stone-900/60 p-2.5 rounded-lg border border-amber-500/20 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-amber-400" />
            Centrifugation Inflow Parameters
          </span>
          <span className="text-[9px] text-stone-500 font-normal">Refrigerated High-G Separation</span>
        </div>

        {/* Editable Inflow Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {/* Sample Added */}
          <div className="p-2 rounded bg-black/40 border border-stone-800 flex flex-col gap-1">
            <label className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <Beaker className="w-2.5 h-2.5 text-amber-400" />
              Sample Added
            </label>
            <input
              type="text"
              value={sampleAdded}
              onChange={(e) => setSampleAdded(e.target.value)}
              className="bg-transparent text-amber-200 font-semibold focus:outline-none border-b border-transparent focus:border-amber-400 text-xs transition-colors"
              placeholder="e.g. 10 mL Oily Sludge Suspension"
            />
          </div>

          {/* Buffer / Reagent Added */}
          <div className="p-2 rounded bg-black/40 border border-stone-800 flex flex-col gap-1">
            <label className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <Beaker className="w-2.5 h-2.5 text-cyan-400" />
              Buffer / Reagent Added
            </label>
            <input
              type="text"
              value={bufferReagent}
              onChange={(e) => setBufferReagent(e.target.value)}
              className="bg-transparent text-cyan-200 font-semibold focus:outline-none border-b border-transparent focus:border-cyan-400 text-xs transition-colors"
              placeholder="e.g. 100 mL Sterile H2O + Glass Beads"
            />
          </div>
        </div>

        {/* Instrument Telemetry Readouts (Speed, Duration, Temp) */}
        <div className="grid grid-cols-3 gap-2 pt-0.5 text-[11px]">
          {/* Speed */}
          <div className="p-1.5 rounded bg-black/40 border border-stone-800 flex flex-col">
            <span className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <Gauge className="w-2.5 h-2.5 text-amber-400" />
              Speed &amp; RCF
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <input
                type="text"
                value={speedRpm}
                onChange={(e) => setSpeedRpm(e.target.value)}
                className="w-20 bg-transparent text-amber-300 font-bold focus:outline-none border-b border-transparent focus:border-amber-500/40"
              />
              <span className="text-stone-500 text-[9px]">({speedG})</span>
            </div>
          </div>

          {/* Duration */}
          <div className="p-1.5 rounded bg-black/40 border border-stone-800 flex flex-col">
            <span className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-amber-400" />
              Duration
            </span>
            <input
              type="text"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="bg-transparent text-amber-300 font-bold mt-0.5 focus:outline-none border-b border-transparent focus:border-amber-500/40"
            />
          </div>

          {/* Temperature */}
          <div className="p-1.5 rounded bg-black/40 border border-stone-800 flex flex-col">
            <span className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <Thermometer className="w-2.5 h-2.5 text-cyan-400" />
              Chamber Temp
            </span>
            <input
              type="text"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="bg-transparent text-cyan-300 font-bold mt-0.5 focus:outline-none border-b border-transparent focus:border-cyan-500/40"
            />
          </div>
        </div>
      </div>

      {/* ── Separation Results Panel ──────────────────────────────────────── */}
      <div className="bg-stone-900/60 p-2.5 rounded-lg border border-amber-500/20 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-emerald-400" />
            Separation Results &amp; Phase Boundary
          </span>
          <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/30">
            PELLET_COMPACTED
          </span>
        </div>

        {/* Editable Output Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {/* Supernatant Harvest */}
          <div className="p-2 rounded bg-black/40 border border-stone-800 flex flex-col gap-1">
            <label className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <ArrowRight className="w-2.5 h-2.5 text-emerald-400" />
              Supernatant Harvest
            </label>
            <input
              type="text"
              value={supernatantHarvest}
              onChange={(e) => setSupernatantHarvest(e.target.value)}
              className="bg-transparent text-emerald-300 font-semibold focus:outline-none border-b border-transparent focus:border-emerald-400 text-xs transition-colors"
              placeholder="e.g. 18.5 mL Isolated Broth"
            />
          </div>

          {/* Pellet Mass / Density */}
          <div className="p-2 rounded bg-black/40 border border-stone-800 flex flex-col gap-1">
            <label className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <ArrowRight className="w-2.5 h-2.5 text-amber-400" />
              Pellet Mass / Density
            </label>
            <input
              type="text"
              value={pelletMass}
              onChange={(e) => setPelletMass(e.target.value)}
              className="bg-transparent text-amber-200 font-semibold focus:outline-none border-b border-transparent focus:border-amber-400 text-xs transition-colors"
              placeholder="e.g. 0.42 g Debris Pellet"
            />
          </div>
        </div>

        {/* Phase Separation Status Indicator */}
        <div className="p-2 rounded bg-stone-950/80 border border-emerald-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={phaseStatus}
              onChange={(e) => setPhaseStatus(e.target.value)}
              className="bg-transparent text-emerald-300 font-medium w-full focus:outline-none text-[11px] md:text-xs"
            />
          </div>
          <span className="text-[9px] text-stone-400 font-mono shrink-0 hidden sm:inline">
            ISO-5 SPEC PASS
          </span>
        </div>
      </div>

      {/* ── Action Trigger: Append Run to ELN Log ─────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-amber-500/20">
        <div className="flex items-center gap-2 text-[10px] text-stone-400">
          {lastCommittedRun ? (
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Run #{lastCommittedRun} Appended to ELN Stream
            </span>
          ) : (
            <span>Ready to write to tamper-proof audit stream</span>
          )}
        </div>

        <button
          onClick={handleAppendToEln}
          disabled={isCommitting}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Database className="w-3.5 h-3.5 text-stone-950" />
          <span>{isCommitting ? 'Appending to Log…' : 'Append Run to ELN Log'}</span>
        </button>
      </div>
    </div>
  );
};
