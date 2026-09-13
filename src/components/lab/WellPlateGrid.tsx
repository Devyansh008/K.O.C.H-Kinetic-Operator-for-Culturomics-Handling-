/**
 * src/components/lab/WellPlateGrid.tsx
 *
 * Interactive 96-well microplate grid (A1–H12).
 * Visual states: uninoculated / inoculated / colony_positive.
 * Clicking a well dispatches SELECT_WELL + STATE_CHANGE events.
 */

import { useState } from 'react';
import { Grid3x3, Info, Microscope } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import type { WellState } from '../../types';

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

type Row = (typeof ROWS)[number];

function wellClass(wellState: WellState, selected: boolean): string {
  const base = selected ? 'ring-2 ring-lab-accent2 ring-offset-1 ring-offset-lab-card ' : '';
  if (wellState === 'colony_positive') return base + 'well-cell-detected cursor-pointer';
  if (wellState === 'inoculated') return base + 'well-cell-active cursor-pointer';
  return base + 'well-cell-inactive cursor-pointer hover:border-lab-accent/40 hover:text-lab-subtext';
}

export function WellPlateGrid() {
  const { state, selectWell, markWell } = useKoch();
  const { wells, selectedWell } = state;
  const [tooltip, setTooltip] = useState<{ coord: string; x: number; y: number } | null>(null);
  const [markMode, setMarkMode] = useState<WellState>('colony_positive');

  const wellMap = new Map(wells.map((w) => [w.coordinate, w]));

  const handleClick = (coord: string) => {
    selectWell(coord);
  };

  const handleRightClick = (e: React.MouseEvent, coord: string) => {
    e.preventDefault();
    markWell(coord, markMode);
  };

  const handleMouseEnter = (e: React.MouseEvent, coord: string) => {
    const w = wellMap.get(coord);
    if (w?.state !== 'uninoculated') {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({ coord, x: rect.left, y: rect.top });
    }
  };

  // Count stats
  const colonyCount = wells.filter((w) => w.state === 'colony_positive').length;
  const inoculatedCount = wells.filter((w) => w.state === 'inoculated').length;

  return (
    <div className="card flex flex-col gap-3">
      {/* Header */}
      <div className="card-header">
        <Grid3x3 className="w-4 h-4" />
        Plate 4 — 96-Well Microplate
        <div className="ml-auto flex items-center gap-2">
          <span className="badge-neutral">{colonyCount} colonies</span>
          <span className="badge-active">{inoculatedCount} inoculated</span>
        </div>
      </div>

      {/* Mark mode selector */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-lab-subtext text-[10px]">RIGHT-CLICK TO MARK:</span>
        {(['uninoculated', 'inoculated', 'colony_positive'] as WellState[]).map((s) => (
          <button
            key={s}
            onClick={() => setMarkMode(s)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              markMode === s
                ? s === 'colony_positive'
                  ? 'border-lab-success text-lab-success bg-lab-success/10'
                  : s === 'inoculated'
                  ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                  : 'border-lab-border text-lab-subtext bg-lab-surface'
                : 'border-lab-border/50 text-lab-muted/50 bg-transparent'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex gap-1 mb-1 ml-7">
            {COLS.map((col) => (
              <div key={col} className="w-8 text-center text-[9px] font-mono text-lab-muted">
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {ROWS.map((row: Row) => (
            <div key={row} className="flex items-center gap-1 mb-1">
              {/* Row label */}
              <div className="w-6 text-[9px] font-mono text-lab-muted text-right pr-1">{row}</div>

              {/* Wells */}
              {COLS.map((col) => {
                const coord = `${row}${col}`;
                const well = wellMap.get(coord);
                const wState: WellState = well?.state ?? 'uninoculated';
                const isSelected = selectedWell === coord;

                return (
                  <div
                    key={coord}
                    className={wellClass(wState, isSelected)}
                    onClick={() => handleClick(coord)}
                    onContextMenu={(e) => handleRightClick(e, coord)}
                    onMouseEnter={(e) => handleMouseEnter(e, coord)}
                    onMouseLeave={() => setTooltip(null)}
                    title={coord}
                  >
                    {wState === 'colony_positive' ? (
                      <span className="text-[8px]">●</span>
                    ) : wState === 'inoculated' ? (
                      <span className="text-[8px]">◉</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected well info */}
      {selectedWell && (
        <div className="border border-lab-accent/30 bg-lab-accent/5 rounded-lg px-3 py-2 flex items-center gap-3">
          <Microscope className="w-4 h-4 text-lab-accent flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-lab-accent">Well {selectedWell}</span>
              {(() => {
                const w = wellMap.get(selectedWell);
                return w?.state === 'colony_positive' ? (
                  <span className="badge-done">Colony Positive</span>
                ) : w?.state === 'inoculated' ? (
                  <span className="badge-active">Inoculated</span>
                ) : (
                  <span className="badge-neutral">Uninoculated</span>
                );
              })()}
            </div>
            {wellMap.get(selectedWell)?.od600 !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-mono text-lab-subtext">OD</span>
                <span className="text-[10px] font-mono text-lab-subtext">₆₀₀</span>
                <span className="font-mono text-sm text-lab-success font-bold">
                  {wellMap.get(selectedWell)?.od600?.toFixed(3)}
                </span>
                <Info className="w-3 h-3 text-lab-subtext ml-1" />
                <span className="text-[9px] font-mono text-lab-subtext">Akkermansia muciniphila detected</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] font-mono text-lab-subtext">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-lab-border bg-lab-surface" />
          Uninoculated
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-lab-accent bg-lab-accent/20" />
          Inoculated
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-lab-success bg-lab-success/15" />
          Colony Positive
        </div>
        <div className="ml-auto text-lab-muted/60">Left-click: select · Right-click: mark</div>
      </div>
    </div>
  );
}
