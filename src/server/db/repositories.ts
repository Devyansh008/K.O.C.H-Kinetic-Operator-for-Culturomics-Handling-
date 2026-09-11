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
  ExperimentStatus,
  EventType,
  ReportFormat,
  Prisma,
} from '@prisma/client';

import prisma from '../../lib/prisma';

// ─── Re-export enums so callers import from a single location ────────────────
export { ExperimentStatus, EventType, ReportFormat };

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
 * Valid transitions: ACTIVE → COMPLETED | ABORTED
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
    },
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
