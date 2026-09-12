/**
 * src/components/lab/ExperimentLogs.tsx
 *
 * Structured experiment audit log viewer with:
 * - High-density audit table (microsecond timestamps)
 * - Filter bar: Category / Severity / Search
 * - Three export tabs: Raw JSON / ISA-Tab / RO-Crate
 */

import { useState, useMemo } from 'react';
import { ScrollText, Download, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useKoch } from '../../lib/mockState';
import {
  formatISAInvestigation,
  formatISAStudy,
  formatISAAssay,
  generateROCrateMetadata,
} from '../../lib/telemetryLogger';
import type { EventCategory, LogSeverity, TelemetryEvent } from '../../types';

type ExportTab = 'json' | 'isa' | 'rocrate';

const CATEGORIES: Array<EventCategory | 'All'> = ['All', 'Voice', 'Vision', 'Sensor', 'System'];
const SEVERITIES: Array<LogSeverity | 'All'> = ['All', 'INFO', 'WARN', 'ERROR'];

function downloadBlob(content: string, filename: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SeverityBadge({ s }: { s: LogSeverity }) {
  if (s === 'ERROR') return <span className="badge bg-lab-danger/15 text-lab-danger border border-lab-danger/30">{s}</span>;
  if (s === 'WARN') return <span className="badge-warn">{s}</span>;
  return <span className="badge-neutral">{s}</span>;
}

function CategoryBadge({ c }: { c: EventCategory }) {
  const map: Record<EventCategory, string> = {
    Voice: 'text-lab-warn border-lab-warn/30 bg-lab-warn/5',
    Vision: 'text-lab-accent border-lab-accent/30 bg-lab-accent/5',
    Sensor: 'text-lab-success border-lab-success/30 bg-lab-success/5',
    System: 'text-lab-subtext border-lab-border bg-lab-surface',
  };
  return <span className={`badge border ${map[c]}`}>{c}</span>;
}

function ExpandableRow({ evt }: { evt: TelemetryEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="border-b border-lab-border/40 hover:bg-lab-accent/5 cursor-pointer transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="py-1 pl-2 pr-3 w-4">
          {open ? (
            <ChevronDown className="w-3 h-3 text-lab-muted" />
          ) : (
            <ChevronRight className="w-3 h-3 text-lab-muted" />
          )}
        </td>
        <td className="py-1 pr-3 font-mono text-[9px] text-lab-subtext whitespace-nowrap">
          {evt.createdAt.toISOString().replace('T', ' ')}
        </td>
        <td className="py-1 pr-3">
          <CategoryBadge c={evt.category ?? 'System'} />
        </td>
        <td className="py-1 pr-3">
          <SeverityBadge s={evt.severity ?? 'INFO'} />
        </td>
        <td className="py-1 pr-3 font-mono text-[9px] text-lab-text uppercase">
          {evt.type.replace('_', ' ')}
        </td>
        <td className="py-1 pr-3 font-mono text-[9px] text-lab-subtext truncate max-w-[260px]">
          {JSON.stringify(evt.rawPayload)}
        </td>
        {evt.telemetry && (
          <td className="py-1 pr-2 font-mono text-[9px] text-lab-accent whitespace-nowrap">
            OD: {evt.telemetry.OD600} · {evt.telemetry.temp_celsius}°C
          </td>
        )}
      </tr>
      {open && (
        <tr className="border-b border-lab-border/40 bg-lab-surface/50">
          <td colSpan={7} className="py-2 px-6">
            <pre className="text-[9px] font-mono text-lab-text/80 whitespace-pre-wrap overflow-x-auto max-h-32">
              {JSON.stringify(evt, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export function ExperimentLogs() {
  const { state } = useKoch();
  const { events, experiment } = state;

  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'All'>('All');
  const [severityFilter, setSeverityFilter] = useState<LogSeverity | 'All'>('All');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ExportTab>('json');

  const filtered = useMemo(() => {
    let evts = [...events].reverse();
    if (categoryFilter !== 'All') evts = evts.filter((e) => e.category === categoryFilter);
    if (severityFilter !== 'All') evts = evts.filter((e) => e.severity === severityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      evts = evts.filter(
        (e) =>
          e.type.toLowerCase().includes(q) ||
          JSON.stringify(e.rawPayload).toLowerCase().includes(q),
      );
    }
    return evts;
  }, [events, categoryFilter, severityFilter, search]);

  const handleExportJSON = () => {
    downloadBlob(JSON.stringify(events, null, 2), `koch-events-${Date.now()}.json`);
  };

  const handleExportROCrate = () => {
    const json = generateROCrateMetadata(
      experiment?.id ?? 'no-exp',
      experiment?.name ?? 'Untitled',
      events,
    );
    downloadBlob(json, 'ro-crate-metadata.json');
  };

  const isaInvestigation = useMemo(
    () => formatISAInvestigation(experiment?.id ?? 'DEMO', experiment?.name ?? 'Demo Experiment'),
    [experiment],
  );
  const isaStudy = useMemo(() => formatISAStudy(events), [events]);
  const isaAssay = useMemo(() => formatISAAssay(events), [events]);

  return (
    <div className="card flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="card-header">
        <ScrollText className="w-4 h-4" />
        Experiment Audit Logs
        <span className="ml-1 text-lab-subtext font-normal">({events.length} total)</span>
        <div className="ml-auto flex items-center gap-2">
          {experiment && <span className="badge-neutral text-[9px]">{experiment.id.slice(0, 12)}</span>}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-lab-muted" />
          <input
            className="input pl-7 h-7 text-[10px]"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                categoryFilter === c
                  ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                  : 'border-lab-border text-lab-muted hover:border-lab-subtext hover:text-lab-subtext'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                severityFilter === s
                  ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                  : 'border-lab-border text-lab-muted hover:border-lab-subtext hover:text-lab-subtext'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Export tabs */}
      <div className="flex items-center gap-1 border-b border-lab-border pb-2">
        {(['json', 'isa', 'rocrate'] as ExportTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[10px] font-mono px-3 py-1 rounded-t border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-lab-accent text-lab-accent'
                : 'border-transparent text-lab-muted hover:text-lab-subtext'
            }`}
          >
            {tab === 'json' ? 'Raw JSON' : tab === 'isa' ? 'ISA-Tab' : 'RO-Crate'}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          {activeTab === 'json' && (
            <button onClick={handleExportJSON} className="btn-ghost text-[10px] h-7 px-2 gap-1">
              <Download className="w-3 h-3" />
              Download JSON
            </button>
          )}
          {activeTab === 'rocrate' && (
            <button onClick={handleExportROCrate} className="btn-primary text-[10px] h-7 px-2 gap-1">
              <Download className="w-3 h-3" />
              Download RO-Crate
            </button>
          )}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'json' && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-20">
                <p className="text-[10px] font-mono text-lab-muted/50">No events match current filters</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-lab-card z-10">
                  <tr className="border-b border-lab-border">
                    <th className="w-4 py-1.5" />
                    <th className="py-1.5 pr-3 text-left text-[9px] font-mono uppercase tracking-widest text-lab-subtext">Timestamp</th>
                    <th className="py-1.5 pr-3 text-left text-[9px] font-mono uppercase tracking-widest text-lab-subtext">Category</th>
                    <th className="py-1.5 pr-3 text-left text-[9px] font-mono uppercase tracking-widest text-lab-subtext">Severity</th>
                    <th className="py-1.5 pr-3 text-left text-[9px] font-mono uppercase tracking-widest text-lab-subtext">Type</th>
                    <th className="py-1.5 pr-3 text-left text-[9px] font-mono uppercase tracking-widest text-lab-subtext">Payload</th>
                    <th className="py-1.5 pr-2 text-left text-[9px] font-mono uppercase tracking-widest text-lab-subtext">Telemetry</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((evt) => (
                    <ExpandableRow key={evt.id} evt={evt} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'isa' && (
        <div className="flex-1 overflow-auto min-h-0 space-y-3">
          {/* i_investigation.txt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-lab-accent uppercase tracking-widest">i_investigation.txt</span>
              <button
                onClick={() => downloadBlob(isaInvestigation, 'i_investigation.txt', 'text/plain')}
                className="btn-ghost text-[9px] h-6 px-2 gap-1"
              >
                <Download className="w-2.5 h-2.5" />
                Download
              </button>
            </div>
            <pre className="bg-lab-surface border border-lab-border rounded p-2 text-[9px] font-mono text-lab-text/80 overflow-x-auto max-h-32 whitespace-pre">
              {isaInvestigation}
            </pre>
          </div>

          {/* s_study.txt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-lab-accent2 uppercase tracking-widest">s_study.txt</span>
              <button
                onClick={() => downloadBlob(isaStudy, 's_study.txt', 'text/plain')}
                className="btn-ghost text-[9px] h-6 px-2 gap-1"
              >
                <Download className="w-2.5 h-2.5" />
                Download
              </button>
            </div>
            <pre className="bg-lab-surface border border-lab-border rounded p-2 text-[9px] font-mono text-lab-text/80 overflow-x-auto max-h-28 whitespace-pre">
              {isaStudy || '(No study events yet — start an experiment and emit some voice intents)'}
            </pre>
          </div>

          {/* a_assay.txt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-lab-success uppercase tracking-widest">a_assay.txt</span>
              <button
                onClick={() => downloadBlob(isaAssay, 'a_assay.txt', 'text/plain')}
                className="btn-ghost text-[9px] h-6 px-2 gap-1"
              >
                <Download className="w-2.5 h-2.5" />
                Download
              </button>
            </div>
            <pre className="bg-lab-surface border border-lab-border rounded p-2 text-[9px] font-mono text-lab-text/80 overflow-x-auto max-h-28 whitespace-pre">
              {isaAssay || '(No assay telemetry yet)'}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'rocrate' && (
        <div className="flex-1 overflow-auto min-h-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-mono text-lab-subtext">
              RO-Crate metadata package for FAIR archival. Includes experiment context, event manifests, and provenance.
            </span>
          </div>
          <pre className="bg-lab-surface border border-lab-border rounded p-3 text-[9px] font-mono text-lab-text/80 overflow-auto h-[calc(100%-40px)] whitespace-pre">
            {generateROCrateMetadata(
              experiment?.id ?? 'no-exp',
              experiment?.name ?? 'Untitled Experiment',
              events,
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
