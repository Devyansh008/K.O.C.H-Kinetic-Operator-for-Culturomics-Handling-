/**
 * src/components/hud/MultiSlideGrowthMatrix.tsx
 *
 * Interactive Multi-Slide Microplate Growth Matrix for Project K.O.C.H.
 * Features:
 *   - Slide Navigation Tabs (switch between plates, add new plates).
 *   - Editable Plate Header (rename slide, inspect medium, strain, incubation, positive yield).
 *   - Interactive Microplate Grid (24-well / 96-well grid with coordinate, status & OD600).
 *   - Operator Log Notes per slide with real-time text updates.
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Edit3,
  CheckCircle2,
  Circle,
  FlaskConical,
  Clock,
  Dna,
  FileText,
  Trash2,
  Maximize2,
  Grid,
} from 'lucide-react';

export type WellColonyState = 'uninoculated' | 'inoculated' | 'colony_positive';

export interface SlideWell {
  coord: string;
  state: WellColonyState;
  od600: number;
}

export interface SlideData {
  id: string;
  name: string;
  medium: string;
  strain: string;
  incubationHours: number;
  notes: string;
  layout: '24' | '96';
  wells: SlideWell[];
}

const ROWS_24 = ['A', 'B', 'C', 'D'];
const COLS_24 = [1, 2, 3, 4, 5, 6];

function generate24Wells(): SlideWell[] {
  const wells: SlideWell[] = [];
  for (const r of ROWS_24) {
    for (const c of COLS_24) {
      const coord = `${r}${c}`;
      let state: WellColonyState = 'uninoculated';
      let od600 = 0.025;

      // Seed realistic culturomics growth patterns
      if (['A2', 'B3', 'B4', 'C1', 'C4', 'C5', 'D2', 'D6'].includes(coord)) {
        state = 'colony_positive';
        od600 = parseFloat((0.42 + Math.random() * 0.45).toFixed(3));
      } else if (['A1', 'A3', 'B1', 'C2', 'D1', 'D4'].includes(coord)) {
        state = 'inoculated';
        od600 = parseFloat((0.08 + Math.random() * 0.12).toFixed(3));
      }

      wells.push({ coord, state, od600 });
    }
  }
  return wells;
}

const INITIAL_SLIDES: SlideData[] = [
  {
    id: 'slide-1',
    name: 'Plate 1: Anaerobic Reservoir',
    medium: 'Wilkins-Chalgren Anaerobe Broth (WCAB)',
    strain: 'B. thetaiotaomicron VPI-5482',
    incubationHours: 48.5,
    notes: 'Sub-surface gas production observed in wells B3-B4 and C4-C5. Distinct translucent mucoid colony morphology at 37°C incubation.',
    layout: '24',
    wells: generate24Wells(),
  },
  {
    id: 'slide-2',
    name: 'Plate 2: Mucin Agar',
    medium: 'Basal Medium + 0.5% Porcine Mucin',
    strain: 'Akkermansia muciniphila ATCC BAA-835',
    incubationHours: 72.0,
    notes: 'Slow-onset obligate anaerobic growth. Mucolytic halo clearing zones visible under 40x phase contrast magnification.',
    layout: '24',
    wells: generate24Wells().map((w, idx) => ({
      ...w,
      state: idx % 3 === 0 ? 'colony_positive' : idx % 2 === 0 ? 'inoculated' : 'uninoculated',
      od600: idx % 3 === 0 ? 0.512 : idx % 2 === 0 ? 0.095 : 0.028,
    })),
  },
  {
    id: 'slide-3',
    name: 'Plate 3: LB Control',
    medium: 'Luria-Bertani (LB) Aerobic Counter-Control',
    strain: 'Escherichia coli K-12 (MG1655)',
    incubationHours: 18.0,
    notes: 'Aerobic containment test slide. Baseline sterility preserved across non-inoculated wells. Verification passed.',
    layout: '24',
    wells: generate24Wells().map((w, idx) => ({
      ...w,
      state: idx < 4 ? 'colony_positive' : 'uninoculated',
      od600: idx < 4 ? 0.745 : 0.015,
    })),
  },
];

export const MultiSlideGrowthMatrix: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [slides, setSlides] = useState<SlideData[]>(INITIAL_SLIDES);
  const [activeSlideId, setActiveSlideId] = useState<string>('slide-1');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const activeSlide = useMemo(() => {
    return slides.find((s) => s.id === activeSlideId) ?? slides[0];
  }, [slides, activeSlideId]);

  // Derived yield statistics
  const stats = useMemo(() => {
    const positive = activeSlide.wells.filter((w) => w.state === 'colony_positive').length;
    const inoculated = activeSlide.wells.filter((w) => w.state === 'inoculated').length;
    const total = activeSlide.wells.length;
    const percentage = total > 0 ? ((positive / total) * 100).toFixed(1) : '0.0';
    const avgOD =
      total > 0
        ? (activeSlide.wells.reduce((acc, curr) => acc + curr.od600, 0) / total).toFixed(3)
        : '0.000';
    return { positive, inoculated, total, percentage, avgOD };
  }, [activeSlide]);

  // Update a single property on the active slide
  const updateActiveSlide = (updater: Partial<SlideData> | ((prev: SlideData) => SlideData)) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== activeSlide.id) return s;
        return typeof updater === 'function' ? updater(s) : { ...s, ...updater };
      }),
    );
  };

  // Toggle state of a well
  const handleToggleWell = (coord: string) => {
    updateActiveSlide((prev) => {
      const updatedWells = prev.wells.map((w) => {
        if (w.coord !== coord) return w;
        let nextState: WellColonyState = 'uninoculated';
        let nextOD = 0.022;

        if (w.state === 'uninoculated') {
          nextState = 'inoculated';
          nextOD = 0.095;
        } else if (w.state === 'inoculated') {
          nextState = 'colony_positive';
          nextOD = 0.548;
        } else {
          nextState = 'uninoculated';
          nextOD = 0.019;
        }

        return { ...w, state: nextState, od600: nextOD };
      });
      return { ...prev, wells: updatedWells };
    });
  };

  // Add a new plate
  const handleAddPlate = () => {
    const newIndex = slides.length + 1;
    const newSlide: SlideData = {
      id: `slide-${Date.now()}`,
      name: `Plate ${newIndex}: Enriched Inoculum`,
      medium: 'Schaedler Anaerobe Agar + Vitamin K1',
      strain: 'Clostridium perfringens isolate',
      incubationHours: 24.0,
      notes: 'Freshly inoculated microplate registered into the culturomics session.',
      layout: '24',
      wells: generate24Wells().map((w) => ({ ...w, state: 'uninoculated', od600: 0.02 })),
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideId(newSlide.id);
  };

  // Remove a plate
  const handleDeletePlate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (slides.length <= 1) return;
    const remaining = slides.filter((s) => s.id !== id);
    setSlides(remaining);
    if (activeSlideId === id) {
      setActiveSlideId(remaining[0].id);
    }
  };

  return (
    <div
      className={`bg-stone-950/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-4 shadow-xl font-mono text-amber-100 flex flex-col gap-3 ${className}`}
    >
      {/* ── Top Bar: Title & Slide Tabs ──────────────────────────────────── */}
      <div className="flex flex-col gap-2 border-b border-amber-500/20 pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-300 tracking-widest uppercase">
              MULTI-SLIDE GROWTH MATRIX // KINETIC OBSERVATION
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
            24-WELL FORMAT · 40×
          </span>
        </div>

        {/* Slide Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
          {slides.map((slide) => {
            const isActive = slide.id === activeSlide.id;
            return (
              <div
                key={slide.id}
                onClick={() => setActiveSlideId(slide.id)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border shrink-0 ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-bold'
                    : 'bg-stone-900/60 text-stone-400 border-stone-800 hover:border-amber-500/30 hover:text-amber-300'
                }`}
              >
                <Grid className="w-3 h-3 text-amber-400/80" />
                <span className="truncate max-w-[140px]">{slide.name}</span>
                {slides.length > 1 && (
                  <button
                    onClick={(e) => handleDeletePlate(e, slide.id)}
                    title="Remove Slide"
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Plate Trigger */}
          <button
            onClick={handleAddPlate}
            title="Add New Microplate Slide"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>+ Add Plate</span>
          </button>
        </div>
      </div>

      {/* ── Editable Plate Header & Metadata Readouts ──────────────────────── */}
      <div className="bg-stone-900/60 p-2.5 rounded-lg border border-amber-500/20 flex flex-col gap-2">
        {/* Editable Plate Title */}
        <div className="flex items-center gap-2">
          <Edit3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <input
            type="text"
            value={activeSlide.name}
            onChange={(e) => updateActiveSlide({ name: e.target.value })}
            className="w-full bg-stone-950/80 border border-amber-500/30 focus:border-amber-400 rounded px-2 py-1 text-xs md:text-sm font-bold text-amber-200 focus:outline-none transition-colors"
            placeholder="Slide Name..."
          />
        </div>

        {/* 4 Metadata Readout Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
          {/* Growth Medium */}
          <div className="p-1.5 rounded bg-black/40 border border-stone-800 flex flex-col justify-between">
            <span className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <FlaskConical className="w-2.5 h-2.5 text-amber-400" />
              Growth Medium
            </span>
            <input
              type="text"
              value={activeSlide.medium}
              onChange={(e) => updateActiveSlide({ medium: e.target.value })}
              className="bg-transparent text-amber-200 font-semibold truncate text-[11px] focus:outline-none border-b border-transparent focus:border-amber-500/40"
            />
          </div>

          {/* Inoculum Strain */}
          <div className="p-1.5 rounded bg-black/40 border border-stone-800 flex flex-col justify-between">
            <span className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <Dna className="w-2.5 h-2.5 text-emerald-400" />
              Inoculum Strain
            </span>
            <input
              type="text"
              value={activeSlide.strain}
              onChange={(e) => updateActiveSlide({ strain: e.target.value })}
              className="bg-transparent text-emerald-300 font-semibold truncate text-[11px] italic focus:outline-none border-b border-transparent focus:border-emerald-500/40"
            />
          </div>

          {/* Incubation Hours */}
          <div className="p-1.5 rounded bg-black/40 border border-stone-800 flex flex-col justify-between">
            <span className="text-[9px] text-stone-400 uppercase font-bold flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-amber-400" />
              Incubation @ 37°C
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.5"
                value={activeSlide.incubationHours}
                onChange={(e) =>
                  updateActiveSlide({ incubationHours: parseFloat(e.target.value) || 0 })
                }
                className="w-16 bg-transparent text-amber-300 font-bold text-[11px] focus:outline-none border-b border-transparent focus:border-amber-500/40"
              />
              <span className="text-stone-400 text-[10px]">hours</span>
            </div>
          </div>

          {/* Positive Yield Count */}
          <div className="p-1.5 rounded bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between">
            <span className="text-[9px] text-emerald-400 uppercase font-bold flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              Positive Yield
            </span>
            <div className="flex items-baseline gap-1 text-emerald-300 font-bold">
              <span className="text-sm">{stats.positive}</span>
              <span className="text-[10px] text-emerald-400/80">/ {stats.total}</span>
              <span className="text-[10px] text-emerald-300 font-mono ml-auto">
                ({stats.percentage}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Microplate Grid (4x6 = 24 Wells) ─────────────────── */}
      <div className="p-2.5 bg-black/40 rounded-lg border border-amber-500/20">
        <div className="flex items-center justify-between text-[10px] text-stone-400 mb-2">
          <span>MICROPLATE MATRIX (CLICK WELL TO TOGGLE COLONY STATE)</span>
          <div className="flex items-center gap-2.5 text-[9px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981]" />
              Colony Positive
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Inoculated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-stone-600" />
              Sterile
            </span>
          </div>
        </div>

        {/* 24-Well Grid */}
        <div className="grid grid-cols-6 gap-1.5">
          {activeSlide.wells.map((well) => {
            const isPos = well.state === 'colony_positive';
            const isInoc = well.state === 'inoculated';

            return (
              <button
                key={well.coord}
                onClick={() => handleToggleWell(well.coord)}
                title={`Well ${well.coord}: ${well.state.toUpperCase()} (OD600: ${well.od600.toFixed(3)})`}
                className={`p-1.5 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer select-none active:scale-95 ${
                  isPos
                    ? 'bg-emerald-950/50 border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : isInoc
                    ? 'bg-amber-950/40 border-amber-500/40 hover:border-amber-400'
                    : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold ${
                      isPos ? 'text-emerald-300' : isInoc ? 'text-amber-300' : 'text-stone-400'
                    }`}
                  >
                    {well.coord}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPos
                        ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                        : isInoc
                        ? 'bg-amber-400'
                        : 'bg-stone-600'
                    }`}
                  />
                </div>

                <div className="mt-1 flex items-baseline justify-between text-[9px] font-mono">
                  <span className="text-stone-500 text-[8px]">OD</span>
                  <span
                    className={`font-semibold ${
                      isPos ? 'text-emerald-300' : isInoc ? 'text-amber-200' : 'text-stone-400'
                    }`}
                  >
                    {well.od600.toFixed(3)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Log Notes ─────────────────────────────────────────────────────── */}
      <div className="p-2.5 bg-stone-900/60 rounded-lg border border-amber-500/20 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-amber-400" />
            Slide Observation Notes
          </span>
          <span className="text-[9px] text-stone-500 font-normal">Auto-saved to active slide</span>
        </div>

        <textarea
          rows={2}
          value={activeSlide.notes}
          onChange={(e) => updateActiveSlide({ notes: e.target.value })}
          placeholder="Operator observations, growth anomalies, colony textures..."
          className="w-full bg-stone-950/80 border border-amber-500/30 focus:border-amber-400 rounded p-2 text-xs text-amber-100 placeholder-stone-600 focus:outline-none resize-none leading-relaxed transition-colors"
        />
      </div>
    </div>
  );
};
