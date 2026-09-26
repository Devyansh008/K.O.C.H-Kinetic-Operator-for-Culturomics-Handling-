import React, { useState } from 'react';
import { Menu, X, FileSpreadsheet, FileJson, Clock, Pipette, Flame, Download } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import {
  formatISAInvestigation,
  formatISAStudy,
  formatISAAssay,
  generateROCrateMetadata,
} from '../../lib/telemetryLogger';

interface SideDrawerProps {
  onSelectLens?: (lens: 'sts' | 'webcam' | 'logs') => void;
  activeLens?: string;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ onSelectLens, activeLens }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { state, startExperiment, endExperiment } = useKoch();
  const { experiment, events, wells } = state;

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadISATab = () => {
    const id = experiment?.id ?? 'KOCH-EXP';
    const name = experiment?.name ?? 'Culturomics Run';
    const inv = formatISAInvestigation(id, name);
    const std = formatISAStudy(events);
    const ass = formatISAAssay(events);

    downloadFile(inv, 'i_investigation.txt', 'text/plain');
    downloadFile(std, 's_study.txt', 'text/plain');
    downloadFile(ass, 'a_assay.txt', 'text/plain');
  };

  const handleDownloadROCrate = () => {
    const meta = generateROCrateMetadata(
      experiment?.id ?? 'EXP_KOCH',
      experiment?.name ?? 'Standard Culturomics',
      events
    );
    downloadFile(meta, 'ro-crate-metadata.json', 'application/json');
  };

  const handleDownloadRawJSON = () => {
    downloadFile(JSON.stringify(events, null, 2), `koch-eln-${Date.now()}.json`, 'application/json');
  };

  return (
    <>
      {/* Floating Steampunk Brass Hamburger Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 p-3 rounded-full bg-stone-900 border-2 border-amber-500/60 text-amber-400 hover:text-amber-300 hover:border-amber-400 hover:scale-105 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center group"
        title="Open Laboratory Instruments Drawer"
      >
        <Menu className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-80 md:w-96 z-50 bg-stone-950/95 border-r-2 border-amber-600/40 p-6 flex flex-col justify-between shadow-[15px_0_50px_rgba(0,0,0,0.8)] font-mono transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-amber-600/30 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold tracking-widest text-amber-300 uppercase">
                Apothecary Drawer
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-amber-400 p-1 rounded-lg hover:bg-stone-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lens Switcher */}
          {onSelectLens && (
            <div className="mb-6">
              <span className="text-[10px] text-amber-500 uppercase tracking-widest block mb-2 font-semibold">
                Objective Lens Select
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['sts', 'webcam', 'logs'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      onSelectLens(l);
                      setIsOpen(false);
                    }}
                    className={`py-2 px-1 text-xs rounded border uppercase font-bold transition-all ${
                      activeLens === l
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-[0_0_10px_#f59e0b]'
                        : 'border-stone-800 text-stone-400 hover:border-amber-500/40 hover:text-amber-300'
                    }`}
                  >
                    {l === 'sts' ? 'STS Voice' : l === 'webcam' ? 'Optics' : 'Slide Log'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Session Controls */}
          <div className="mb-6 bg-stone-900/60 border border-amber-600/20 rounded-xl p-3">
            <span className="text-[10px] text-amber-500 uppercase tracking-widest block mb-2 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Experiment Chronometer
            </span>
            <div className="text-xs text-stone-300 mb-2">
              Session: <strong className="text-amber-300">{experiment?.name ?? 'IDLE'}</strong>
            </div>
            {!experiment || experiment.status !== 'ACTIVE' ? (
              <button
                onClick={() => startExperiment('KOCH-' + new Date().toISOString().slice(0, 10))}
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all"
              >
                Ignite New Session
              </button>
            ) : (
              <button
                onClick={() => endExperiment('COMPLETED')}
                className="w-full py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-500/50 text-red-300 font-bold text-xs rounded transition-all"
              >
                Conclude & Seal ELN
              </button>
            )}
          </div>

          {/* Tube Configs & Physical Inoculation */}
          <div className="mb-6 bg-stone-900/60 border border-amber-600/20 rounded-xl p-3">
            <span className="text-[10px] text-amber-500 uppercase tracking-widest block mb-2 font-semibold flex items-center gap-1.5">
              <Pipette className="w-3.5 h-3.5" /> Tube &amp; Plate Coordinates
            </span>
            <div className="text-[11px] text-stone-300 space-y-1">
              <div className="flex justify-between">
                <span>Active Plate:</span>
                <span className="text-amber-400">Plate 4 (96-well)</span>
              </div>
              <div className="flex justify-between">
                <span>Inoculated:</span>
                <span className="text-amber-300">
                  {wells.filter((w) => w.state === 'inoculated').length} wells
                </span>
              </div>
              <div className="flex justify-between">
                <span>Positive Cultures:</span>
                <span className="text-emerald-400 font-bold">
                  {wells.filter((w) => w.state === 'colony_positive').length} wells
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Features: ELN Downloads */}
          <div className="space-y-2">
            <span className="text-[10px] text-amber-500 uppercase tracking-widest block mb-2 font-semibold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> ELN Archival Artifacts
            </span>
            <button
              onClick={handleDownloadISATab}
              className="w-full flex items-center justify-between px-3 py-2 bg-stone-900/80 hover:bg-stone-800 border border-amber-500/20 hover:border-amber-500/50 rounded-lg text-xs text-amber-200 transition-all"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>ISA-Tab Archive (.tsv)</span>
              </div>
              <span className="text-[9px] text-stone-500">i/s/a</span>
            </button>
            <button
              onClick={handleDownloadROCrate}
              className="w-full flex items-center justify-between px-3 py-2 bg-stone-900/80 hover:bg-stone-800 border border-amber-500/20 hover:border-amber-500/50 rounded-lg text-xs text-amber-200 transition-all"
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                <span>RO-Crate FAIR Package</span>
              </div>
              <span className="text-[9px] text-stone-500">JSON-LD</span>
            </button>
            <button
              onClick={handleDownloadRawJSON}
              className="w-full flex items-center justify-between px-3 py-2 bg-stone-900/80 hover:bg-stone-800 border border-amber-500/20 hover:border-amber-500/50 rounded-lg text-xs text-amber-200 transition-all"
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                <span>Raw Telemetry Stream</span>
              </div>
              <span className="text-[9px] text-stone-500">Events ({events.length})</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-amber-600/30 text-[10px] text-stone-500 text-center">
          Project K.O.C.H. · Steampunk Micro-OS v0.2
        </div>
      </div>
    </>
  );
};
