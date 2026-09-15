/**
 * src/server/db/repositories.ts
 *
 * Type-safe database repository functions for Project K.O.C.H.
 *
 * Design principles enforced here:
 *  1. All functions use the globally-cached prisma singleton — no raw DB
 *     connections are opened inside repository functions.
 *  2. TelemetryEvent functions are STRICTLY APPEND-ONLY.
 *     No update or delete helpers are exposed for this model, per spec.
 *  3. Every input/output is fully typed from the generated Prisma types —
 *     no `any` at integration boundaries.
 *  4. Explicit `include` / `select` clauses are used on deep fetches to
 *     minimise edge memory footprint (spec §8 – granular payload projection).
 */

import {
  type Experiment,
  type Plate,
  type Well,
  type TelemetryEvent,
  type ColonyDetection,
  type ElnReport,
  type Prisma,
} from '@prisma/client';

import prisma from '../../lib/prisma';

// ─── Enums with explicit literal typing for rock-solid TS resolution ────────
export const ExperimentStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ABORTED: 'ABORTED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ExperimentStatus = (typeof ExperimentStatus)[keyof typeof ExperimentStatus];

export const EventType = {
  VOICE_UTTERANCE: 'VOICE_UTTERANCE',
  INTENT: 'INTENT',
  FRAME_MARK: 'FRAME_MARK',
  STATE_CHANGE: 'STATE_CHANGE',
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const ReportFormat = {
  PDF: 'PDF',
  MARKDOWN: 'MARKDOWN',
  ISA_TAB: 'ISA_TAB',
  JSON: 'JSON',
} as const;
export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

// ─── Convenience type: a fully-hydrated Experiment ──────────────────────────
export type ExperimentWithRelations = Experiment & {
  plates: (Plate & {
    wells: (Well & {
      events: TelemetryEvent[];
      detections: ColonyDetection[];
    })[];
  })[];
  events: TelemetryEvent[];
  elnReports: ElnReport[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPERIMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new Experiment record with status = ACTIVE.
 *
 * @param name  Human-readable experiment name (e.g. "Plate Run 2026-09-12")
 * @returns     The newly created Experiment row
 */
export async function createExperiment(name: string): Promise<Experiment> {
  return prisma.experiment.create({
    data: {
      name,
      status: ExperimentStatus.ACTIVE,
    },
  });
}

/**
 * Fetches an Experiment with all related plates, wells, telemetry events,
 * and ELN reports included (full hydration for report compilation and
 * active-state snapshots).
 *
 * @param id  CUID of the experiment
 * @returns   Fully-hydrated ExperimentWithRelations, or null if not found
 */
export async function getExperimentById(
  id: string,
): Promise<ExperimentWithRelations | null> {
  return prisma.experiment.findUnique({
    where: { id },
    include: {
      plates: {
        include: {
          wells: {
            include: {
              events: true,
              detections: true,
            },
          },
        },
      },
      events: true,
      elnReports: true,
    },
  });
}

/**
 * Updates the lifecycle status of an Experiment.
 * Valid transitions: ACTIVE → COMPLETED | ABORTED | ARCHIVED
 *
 * @param id      CUID of the experiment
 * @param status  New ExperimentStatus value
 * @returns       The updated Experiment row
 */
export async function updateExperimentStatus(
  id: string,
  status: ExperimentStatus,
): Promise<Experiment> {
  return prisma.experiment.update({
    where: { id },
    data: { status },
  });
}

/**
 * Soft-archives an experiment by updating its status to ARCHIVED.
 *
 * @param id  CUID of the experiment
 * @returns   The updated Experiment row
 */
export async function archiveExperiment(id: string): Promise<Experiment> {
  return updateExperimentStatus(id, ExperimentStatus.ARCHIVED);
}

export interface ListExperimentsOptions {
  page?: number;
  limit?: number;
  status?: ExperimentStatus;
  search?: string;
}

export interface ListExperimentsResult {
  experiments: Experiment[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Paginated, status-filtered, and searchable query of experiment records.
 */
export async function listExperiments(
  options: ListExperimentsOptions = {},
): Promise<ListExperimentsResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, Math.min(100, options.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.ExperimentWhereInput = {};
  if (options.status) {
    where.status = options.status;
  }
  if (options.search) {
    where.name = {
      contains: options.search,
      mode: 'insensitive',
    };
  }

  const [experiments, total] = await Promise.all([
    prisma.experiment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startedAt: 'desc' },
    }),
    prisma.experiment.count({ where }),
  ]);

  return {
    experiments,
    total,
    page,
    limit,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLATES & WELLS
// ═══════════════════════════════════════════════════════════════════════════════

/** Shape returned by createPlateWithWells */
export type PlateWithWells = Plate & { wells: Well[] };

/**
 * Creates a Plate and atomically batch-creates all associated Well records
 * in a single transaction.
 *
 * @param experimentId    CUID of the parent Experiment
 * @param label           Human-readable plate label (e.g. "Plate 4")
 * @param wellCoordinates Array of well coordinate strings (e.g. ["A1","C7"])
 * @returns               The created Plate with its wells included
 */
export async function createPlateWithWells(
  experimentId: string,
  label: string,
  wellCoordinates: string[],
): Promise<PlateWithWells> {
  return prisma.plate.create({
    data: {
      experimentId,
      label,
      wells: {
        createMany: {
          data: wellCoordinates.map((coordinate) => ({ coordinate })),
        },
      },
    },
    include: {
      wells: true,
    },
  });
}

/**
 * Fetches a plate by ID including its wells.
 *
 * @param id  CUID of the Plate
 * @returns   Plate with wells, or null if not found
 */
export async function getPlateWithWells(id: string): Promise<PlateWithWells | null> {
  return prisma.plate.findUnique({
    where: { id },
    include: {
      wells: true,
    },
  });
}

/**
 * Fetches a specific Well by its plate and grid coordinate.
 * Used to resolve voice commands like "Mark plate 4 well C7" to a DB row.
 *
 * @param plateId     CUID of the parent Plate
 * @param coordinate  Well coordinate string (e.g. "C7")
 * @returns           The matching Well row, or null if not found
 */
export async function getWellByCoordinate(
  plateId: string,
  coordinate: string,
): Promise<Well | null> {
  return prisma.well.findFirst({
    where: { plateId, coordinate },
  });
}

/**
 * Fetches a well by ID.
 *
 * @param id  CUID of the Well
 * @returns   Well row or null
 */
export async function getWellById(id: string): Promise<Well | null> {
  return prisma.well.findUnique({
    where: { id },
  });
}

/**
 * Fetches chronological history of mutations, telemetry events, and
 * colony detections for an individual well.
 */
export async function getWellHistory(wellId: string): Promise<{
  well: Well | null;
  events: TelemetryEvent[];
  detections: ColonyDetection[];
}> {
  const well = await prisma.well.findUnique({
    where: { id: wellId },
    include: {
      events: {
        orderBy: { createdAt: 'asc' },
      },
      detections: {
        orderBy: { detectedAt: 'asc' },
      },
    },
  });

  if (!well) {
    return { well: null, events: [], detections: [] };
  }

  return {
    well,
    events: well.events,
    detections: well.detections,
  };
}

/**
 * Fetches chronological history for an individual well identified by plate ID and coordinate.
 */
export async function getWellHistoryByCoordinate(
  plateId: string,
  coordinate: string,
): Promise<{
  well: Well | null;
  events: TelemetryEvent[];
  detections: ColonyDetection[];
}> {
  const well = await getWellByCoordinate(plateId, coordinate);
  if (!well) {
    return { well: null, events: [], detections: [] };
  }
  return getWellHistory(well.id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TELEMETRY EVENTS — STRICTLY APPEND-ONLY
//
// CONSTRAINT: No update or delete helper functions exist for TelemetryEvent.
// This table is an immutable audit log. Corrections are written as new
// compensating events, never as mutations to historical rows.
// ═══════════════════════════════════════════════════════════════════════════════

/** Input shape for logTelemetryEvent */
export interface LogTelemetryEventInput {
  experimentId: string;
  wellId?: string;
  type: EventType;
  /** Arbitrary JSON payload — transcript text, intent object, or state diff */
  rawPayload: Prisma.InputJsonValue;
  frameTimestamp?: Date;
  createdAt?: Date;
}

/**
 * Appends a new TelemetryEvent row to the immutable event log.
 * This is the only mutation path for TelemetryEvent — no updates or deletes.
 *
 * @param data  Structured event data per LogTelemetryEventInput
 * @returns     The newly created TelemetryEvent row
 */
export async function logTelemetryEvent(
  data: LogTelemetryEventInput,
): Promise<TelemetryEvent> {
  return prisma.telemetryEvent.create({
    data: {
      experimentId: data.experimentId,
      wellId: data.wellId,
      type: data.type,
      rawPayload: data.rawPayload as Prisma.InputJsonValue,
      frameTimestamp: data.frameTimestamp,
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
    },
  });
}

/**
 * Bulk-inserts queued events into the TelemetryEvent log.
 * Used for offline buffer flushes after network reconnection.
 */
export async function batchCreateTelemetryEvents(
  events: LogTelemetryEventInput[],
): Promise<{ count: number }> {
  return prisma.telemetryEvent.createMany({
    data: events.map((e) => ({
      experimentId: e.experimentId,
      wellId: e.wellId,
      type: e.type,
      rawPayload: e.rawPayload as Prisma.InputJsonValue,
      frameTimestamp: e.frameTimestamp,
      ...(e.createdAt ? { createdAt: e.createdAt } : {}),
    })),
  });
}

export interface GetTelemetryEventsOptions {
  type?: EventType;
  limit?: number;
  offset?: number;
}

/**
 * Queries chronologically ordered TelemetryEvent records for an experiment.
 */
export async function getTelemetryEventsByExperiment(
  experimentId: string,
  options: GetTelemetryEventsOptions = {},
): Promise<TelemetryEvent[]> {
  const where: Prisma.TelemetryEventWhereInput = {
    experimentId,
  };

  if (options.type) {
    where.type = options.type;
  }

  return prisma.telemetryEvent.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: options.limit ? Math.min(1000, options.limit) : undefined,
    skip: options.offset,
  });
}

/**
 * Queries voice command history for an experiment (VOICE_UTTERANCE and INTENT events).
 */
export async function getVoiceAuditEvents(
  experimentId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<TelemetryEvent[]> {
  return prisma.telemetryEvent.findMany({
    where: {
      experimentId,
      type: { in: [EventType.VOICE_UTTERANCE, EventType.INTENT] },
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit ? Math.min(500, options.limit) : 50,
    skip: options.offset,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLONY DETECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Input shape for createColonyDetection */
export interface CreateColonyDetectionInput {
  wellId: string;
  /** Detection confidence score from the cloud CV provider (0.0 – 1.0) */
  confidence: number;
  /** Optional growth velocity measurement (μm²/hr or equivalent) */
  growthVelocity?: number;
  /** Identifier for the cloud CV endpoint that produced this detection */
  cvProvider: string;
}

/**
 * Persists a micro-colony detection result received from a cloud CV endpoint.
 *
 * @param data  Structured detection data per CreateColonyDetectionInput
 * @returns     The newly created ColonyDetection row
 */
export async function createColonyDetection(
  data: CreateColonyDetectionInput,
): Promise<ColonyDetection> {
  return prisma.colonyDetection.create({
    data: {
      wellId: data.wellId,
      confidence: data.confidence,
      growthVelocity: data.growthVelocity,
      cvProvider: data.cvProvider,
    },
  });
}

/**
 * Retrieves all ColonyDetection records for a well, ordered oldest-first.
 * Used by the perception service to compute growth velocity trends from
 * historical CV detections before generating recipe recommendations.
 *
 * @param wellId  CUID of the well
 * @returns       Array of ColonyDetection rows (may be empty)
 */
export async function getColonyDetectionsByWell(
  wellId: string,
): Promise<ColonyDetection[]> {
  return prisma.colonyDetection.findMany({
    where: { wellId },
    orderBy: { detectedAt: 'asc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELN REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Input shape for saveElnReport */
export interface SaveElnReportInput {
  experimentId: string;
  /** Output format: PDF | MARKDOWN | ISA_TAB | JSON */
  format: ReportFormat;
  /** Storage URL where the compiled report artifact is persisted */
  storageUrl: string;
}

/**
 * Persists a generated ELN report record after the report compiler has
 * written the artifact to storage.
 *
 * @param data  Report metadata per SaveElnReportInput
 * @returns     The newly created ElnReport row
 */
export async function saveElnReport(
  data: SaveElnReportInput,
): Promise<ElnReport> {
  return prisma.elnReport.create({
    data: {
      experimentId: data.experimentId,
      format: data.format,
      storageUrl: data.storageUrl,
    },
  });
}
