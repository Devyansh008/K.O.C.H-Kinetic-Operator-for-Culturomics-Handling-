/**
 * src/routes/index.tsx
 *
 * Main Testing Dashboard View:
 * Left: WebcamFeed + WellPlateGrid
 * Right: TelemetryStream + summary metrics strip
 */

import { createFileRoute } from '@tanstack/react-router';
import { WebcamFeed } from '../components/lab/WebcamFeed';
import { WellPlateGrid } from '../components/lab/WellPlateGrid';
import { TelemetryStream } from '../components/lab/TelemetryStream';
import { useKoch } from '../lib/mockState';
import { BarChart3, Microscope, Activity, Layers } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: DashboardView,
});

function MetricCard({
  label,
  value,
  icon: Icon,
  color = 'text-lab-accent',
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-lab-card border border-lab-border rounded-xl px-4 py-3 flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
      <div>
        <div className={`font-mono font-bold text-xl tabular-nums ${color}`}>{value}</div>
        <div className="metric-label">{label}</div>
      </div>
    </div>
  );
}

function DashboardView() {
  const { state } = useKoch();
  const { events, wells, experiment } = state;

  const colonyCount = wells.filter((w) => w.state === 'colony_positive').length;
  const inoculatedCount = wells.filter((w) => w.state === 'inoculated').length;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Summary metrics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Total Events"
          value={events.length}
          icon={Activity}
          color="text-lab-accent"
        />
        <MetricCard
          label="Active Wells"
          value={inoculatedCount}
          icon={Layers}
          color="text-lab-accent2"
        />
        <MetricCard
          label="Colony Positive"
          value={colonyCount}
          icon={Microscope}
          color="text-lab-success"
        />
        <MetricCard
          label="Session Status"
          value={experiment?.status ?? 'IDLE'}
          icon={BarChart3}
          color={
            experiment?.status === 'ACTIVE'
              ? 'text-lab-accent'
              : experiment?.status === 'COMPLETED'
              ? 'text-lab-success'
              : experiment?.status === 'ABORTED'
              ? 'text-lab-danger'
              : 'text-lab-muted'
          }
        />
      </div>

      {/* Main content: 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left column: camera + plate */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="flex-shrink-0">
            <WebcamFeed />
          </div>
          <div className="flex-shrink-0">
            <WellPlateGrid />
          </div>
        </div>

        {/* Right column: telemetry stream */}
        <div className="min-h-0 flex flex-col">
          <TelemetryStream />
        </div>
      </div>
    </div>
  );
}
