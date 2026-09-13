// ─── Enums (mirrors Prisma schema) ──────────────────────────────────────────

export type ExperimentStatus = 'ACTIVE' | 'COMPLETED' | 'ABORTED';

export type EventType =
  | 'VOICE_UTTERANCE'
  | 'INTENT'
  | 'FRAME_MARK'
  | 'STATE_CHANGE';

export type ReportFormat = 'PDF' | 'MARKDOWN' | 'ISA_TAB' | 'JSON';

// ─── Data Models (mirrors Prisma schema) ────────────────────────────────────

export interface Experiment {
  id: string;
  name: string;
  startedAt: Date;
  endedAt?: Date;
  status: ExperimentStatus;
}

export interface Plate {
  id: string;
  experimentId: string;
  label: string; // e.g. "Plate 4"
}

export interface Well {
  id: string;
  plateId: string;
  coordinate: string; // e.g. "C7"
  state: WellState;
  od600?: number;
}

export interface TelemetryEvent {
  id: string;
  experimentId: string;
  wellId?: string;
  type: EventType;
  rawPayload: Record<string, unknown>;
  frameTimestamp?: string;
  createdAt: Date;
  telemetry?: SensorReadout;
  category?: EventCategory;
  severity?: LogSeverity;
}

export interface ColonyDetection {
  id: string;
  wellId: string;
  detectedAt: Date;
  confidence: number;       // 0.0 – 1.0
  growthVelocity?: number;  // OD600/hr
  cvProvider: string;       // e.g. "mock-cv-v1"
}

export interface ElnReport {
  id: string;
  experimentId: string;
  format: ReportFormat;
  storageUrl: string;
  generatedAt: Date;
}

// ─── UI-only extensions ──────────────────────────────────────────────────────

/** Visual state of a single well in the 96-well grid */
export type WellState = 'uninoculated' | 'inoculated' | 'colony_positive';

/** STT pipeline status */
export type SttStatus = 'LISTENING' | 'PROCESSING' | 'MUTED';

/** Single item in the TTS audio queue */
export interface TtsQueueItem {
  id: string;
  text: string;
  status: 'queued' | 'playing' | 'done' | 'cancelled';
  durationMs?: number;
}

/** Sensor readout attached to telemetry events */
export interface SensorReadout {
  OD600: number;
  temp_celsius: number;
  CO2_pct: number;
  gas_mix_pct?: number;
}

/** Log categorisation for the audit table */
export type EventCategory = 'Voice' | 'Vision' | 'Sensor' | 'System';

/** Log severity */
export type LogSeverity = 'INFO' | 'WARN' | 'ERROR';

/** A microphone transcription entry in the STT queue */
export interface TranscriptEntry {
  id: string;
  text: string;
  confidence: number;
  species?: string;
  timestamp: Date;
}
