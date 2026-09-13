/**
 * src/routes/logs.tsx
 *
 * Full Experiment Audit Logs & ISA-Tab / RO-Crate viewer.
 * Full-width ExperimentLogs component with export controls.
 */

import { createFileRoute } from '@tanstack/react-router';
import { ExperimentLogs } from '../components/lab/ExperimentLogs';
import { useKoch } from '../lib/mockState';
import { BookOpen, Clock, FileText } from 'lucide-react';

export const Route = createFileRoute('/logs')({
  component: LogsView,
});

function LogsView() {
  const { state } = useKoch();
  const { experiment, events } = state;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Session summary header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-lab-card border border-lab-border rounded-xl px-4 py-3 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-lab-accent flex-shrink-0" />
          <div>
            <div className="font-mono font-bold text-base text-lab-accent">
              {experiment?.name ?? '—'}
            </div>
            <div className="metric-label">Active Experiment</div>
          </div>
        </div>
        <div className="bg-lab-card border border-lab-border rounded-xl px-4 py-3 flex items-center gap-3">
          <FileText className="w-5 h-5 text-lab-accent2 flex-shrink-0" />
          <div>
            <div className="font-mono font-bold text-xl text-lab-accent2 tabular-nums">
              {events.length}
            </div>
            <div className="metric-label">Total Log Entries</div>
          </div>
        </div>
        <div className="bg-lab-card border border-lab-border rounded-xl px-4 py-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-lab-success flex-shrink-0" />
          <div>
            <div className="font-mono font-bold text-base text-lab-success">
              {experiment?.startedAt
                ? experiment.startedAt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
                : '—'}
            </div>
            <div className="metric-label">Session Start</div>
          </div>
        </div>
      </div>

      {/* Audit log viewer (fills remaining height) */}
      <div className="flex-1 min-h-0">
        <ExperimentLogs />
      </div>
    </div>
  );
}
