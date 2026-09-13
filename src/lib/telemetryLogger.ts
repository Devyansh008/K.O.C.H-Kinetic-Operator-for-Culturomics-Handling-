/**
 * src/lib/telemetryLogger.ts
 *
 * Pure utility functions for creating timestamped TelemetryEvent packets,
 * generating mock sensor data, and formatting FAIR export payloads.
 * Zero external deps — works entirely in-memory.
 */

import type {
  EventType,
  TelemetryEvent,
  SensorReadout,
  EventCategory,
  LogSeverity,
} from '../types';

// ─── ID generation ───────────────────────────────────────────────────────────

let _seq = 0;
export function uid(prefix = 'evt'): string {
  return `${prefix}_${Date.now()}_${(++_seq).toString(36)}`;
}

// ─── Sensor mock data ────────────────────────────────────────────────────────

export function generateMockSensorData(): SensorReadout {
  return {
    OD600: parseFloat((Math.random() * 0.3 + 0.05).toFixed(3)),
    temp_celsius: parseFloat((36.8 + Math.random() * 0.6).toFixed(2)),
    CO2_pct: parseFloat((4.9 + Math.random() * 0.2).toFixed(2)),
    gas_mix_pct: parseFloat((79.0 + Math.random() * 0.5).toFixed(2)),
  };
}

// ─── Event category mapping ──────────────────────────────────────────────────

export function categoryForType(type: EventType): EventCategory {
  switch (type) {
    case 'VOICE_UTTERANCE':
    case 'INTENT':
      return 'Voice';
    case 'FRAME_MARK':
      return 'Vision';
    case 'STATE_CHANGE':
      return 'System';
    default:
      return 'Sensor';
  }
}

export function severityForType(type: EventType): LogSeverity {
  if (type === 'INTENT') return 'INFO';
  if (type === 'FRAME_MARK') return 'INFO';
  if (type === 'STATE_CHANGE') return 'WARN';
  return 'INFO';
}

// ─── Event factory ───────────────────────────────────────────────────────────

export function createTelemetryEvent(
  experimentId: string,
  type: EventType,
  rawPayload: Record<string, unknown>,
  wellId?: string,
  severity?: LogSeverity,
): TelemetryEvent {
  const sensor = generateMockSensorData();
  return {
    id: uid('evt'),
    experimentId,
    wellId,
    type,
    rawPayload,
    frameTimestamp:
      type === 'FRAME_MARK' ? new Date().toISOString() : undefined,
    createdAt: new Date(),
    telemetry: sensor,
    category: categoryForType(type),
    severity: severity ?? severityForType(type),
  };
}

// ─── ISA-Tab export helpers ──────────────────────────────────────────────────

export function formatISAInvestigation(expId: string, expName: string): string {
  const now = new Date().toISOString().split('T')[0];
  return [
    'ONTOLOGY SOURCE REFERENCE',
    'Term Source Name\tOBI\tEFO',
    'Term Source File\thttp://purl.obolibrary.org/obo/obi.owl\thttp://www.ebi.ac.uk/efo/efo.owl',
    'Term Source Version\t2024-09-12\t2024-09-12',
    '',
    'INVESTIGATION',
    `Investigation Identifier\t${expId}`,
    `Investigation Title\t${expName}`,
    `Investigation Description\tK.O.C.H. Culturomics Experiment`,
    `Investigation Submission Date\t${now}`,
    `Investigation Public Release Date\t${now}`,
    '',
    'STUDY',
    `Study Identifier\t${expId}`,
    `Study Title\t${expName}`,
    `Study Description\tMicrobiology culturomics hands-free voice-vision experiment`,
    `Study Public Release Date\t${now}`,
    'Study File Name\ts_study.txt',
    '',
    'STUDY ASSAYS',
    'Study Assay Measurement Type\tcolony counting',
    'Study Assay Technology Type\tvisual spectroscopy',
    'Study Assay Technology Platform\tK.O.C.H. vision pipeline v1',
    'Study Assay File Name\ta_assay.txt',
  ].join('\n');
}

export function formatISAStudy(events: TelemetryEvent[]): string {
  const header =
    'Source Name\tSample Name\tCharacteristics[organism]\tCharacteristics[culture medium]\tProtocol REF';
  const rows = events
    .filter((e) => e.type === 'INTENT' || e.type === 'VOICE_UTTERANCE')
    .slice(0, 20)
    .map((e, i) => {
      const well =
        (e.rawPayload['well'] as string) ??
        (e.rawPayload['wellCoordinate'] as string) ??
        'N/A';
      return `Source_${i + 1}\tSample_${well}\tHomo sapiens gut microbiome\tBHI broth\tSterile Plating`;
    });
  return [header, ...rows].join('\n');
}

export function formatISAAssay(events: TelemetryEvent[]): string {
  const header =
    'Sample Name\tProtocol REF\tParameter Value[OD600]\tParameter Value[temp_celsius]\tParameter Value[CO2_pct]\tDate';
  const rows = events
    .filter((e) => e.telemetry)
    .slice(0, 30)
    .map((e) => {
      const t = e.telemetry!;
      const d = e.createdAt.toISOString();
      const well = e.rawPayload['well'] ?? 'N/A';
      return `Sample_${well}\tSpectrophotometry\t${t.OD600}\t${t.temp_celsius}\t${t.CO2_pct}\t${d}`;
    });
  return [header, ...rows].join('\n');
}

// ─── RO-Crate metadata generator ─────────────────────────────────────────────

export function generateROCrateMetadata(
  expId: string,
  expName: string,
  events: TelemetryEvent[],
): string {
  const now = new Date().toISOString();
  const metadata = {
    '@context': 'https://w3id.org/ro/crate/1.1/context',
    '@graph': [
      {
        '@type': 'CreativeWork',
        '@id': 'ro-crate-metadata.json',
        conformsTo: { '@id': 'https://w3id.org/ro/crate/1.1' },
        about: { '@id': './' },
      },
      {
        '@type': 'Dataset',
        '@id': './',
        name: expName,
        description: 'K.O.C.H. Culturomics Experiment RO-Crate Package',
        datePublished: now,
        identifier: expId,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        hasPart: events.slice(0, 5).map((e) => ({
          '@id': `event/${e.id}.json`,
          '@type': 'File',
          name: `Telemetry Event: ${e.type}`,
          encodingFormat: 'application/json',
          dateCreated: e.createdAt.toISOString(),
        })),
      },
    ],
  };
  return JSON.stringify(metadata, null, 2);
}
