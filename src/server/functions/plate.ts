/**
 * src/server/functions/plate.ts
 *
 * Module 2: Plate Layout & Well Tracking Server Functions
 *
 * Implements:
 *   - configurePlateLayout (#7): Dynamic 24, 48, 96, or 384 multi-well plate generation.
 *   - getPlateLayout (#8): Multi-well plate coordinates and well-state snapshot.
 *   - updateWellState (#9): Updates well state, appends STATE_CHANGE telemetry event, and updates active state.
 *   - batchUpdateWells (#10): High-throughput batch state updates.
 *   - getWellHistory (#11): Chronological state mutation history for a specific well.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

import {
  createPlateWithWells,
  getPlateWithWells,
  getWellByCoordinate,
  getWellById,
  getWellHistory as dbGetWellHistory,
  logTelemetryEvent,
  batchCreateTelemetryEvents,
  EventType,
  type PlateWithWells,
} from '../db/repositories';

import {
  updateActiveState,
  getActiveStateSnapshot,
  type ActiveCoordinate,
} from '../services/state';

// ─── Coordinate Generators ───────────────────────────────────────────────────

export function generateWellCoordinates(wellCount: 24 | 48 | 96 | 384): string[] {
  let rows: string[] = [];
  let cols = 0;

  switch (wellCount) {
    case 24:
      rows = ['A', 'B', 'C', 'D'];
      cols = 6;
      break;
    case 48:
      rows = ['A', 'B', 'C', 'D', 'E', 'F'];
      cols = 8;
      break;
    case 96:
      rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      cols = 12;
      break;
    case 384:
      rows = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
        'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
      ];
      cols = 24;
      break;
  }

  const coords: string[] = [];
  for (const r of rows) {
    for (let c = 1; c <= cols; c++) {
      coords.push(`${r}${c}`);
    }
  }
  return coords;
}

// ─── configurePlateLayout (#7) ───────────────────────────────────────────────

const ConfigurePlateLayoutSchema = z.object({
  experimentId: z.string().min(1),
  label: z.string().min(1).default('Plate 1'),
  wellCount: z.union([
    z.literal(24),
    z.literal(48),
    z.literal(96),
    z.literal(384),
  ]).default(96),
  media: z.string().optional(),
  customCoordinates: z.array(z.string()).optional(),
});

type ConfigurePlateLayoutInput = z.infer<typeof ConfigurePlateLayoutSchema>;

/**
 * Pre-defines multi-well plate labels (24–384 wells), grid dimensions, and initial media.
 *
 * Module 2 (#7): `configurePlateLayout` → `{ experimentId, label, wellCount, media }` → `PlateWithWells`
 */
export const configurePlateLayout = createServerFn({ method: 'POST' })
  .validator((data: unknown) => ConfigurePlateLayoutSchema.parse(data))
  .handler(async ({ data }: { data: ConfigurePlateLayoutInput }): Promise<PlateWithWells> => {
    const coordinates = data.customCoordinates && data.customCoordinates.length > 0
      ? data.customCoordinates
      : generateWellCoordinates(data.wellCount);

    const plate = await createPlateWithWells(data.experimentId, data.label, coordinates);

    // If media was specified, log an initial STATE_CHANGE event for the plate configuration
    if (data.media) {
      await logTelemetryEvent({
        experimentId: data.experimentId,
        type: EventType.STATE_CHANGE,
        rawPayload: {
          action: 'CONFIGURE_PLATE_MEDIA',
          plateId: plate.id,
          plateLabel: plate.label,
          wellCount: coordinates.length,
          media: data.media,
        } as Prisma.InputJsonValue,
      });
    }

    return plate;
  });

// ─── getPlateLayout (#8) ────────────────────────────────────────────────────

const GetPlateLayoutSchema = z.object({
  plateId: z.string().min(1),
});

type GetPlateLayoutInput = z.infer<typeof GetPlateLayoutSchema>;

/**
 * Fetches active multi-well plate coordinates and well-state snapshots.
 *
 * Module 2 (#8): `getPlateLayout` → `{ plateId }` → `PlateWithWells | null`
 */
export const getPlateLayout = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetPlateLayoutSchema.parse(data))
  .handler(async ({ data }: { data: GetPlateLayoutInput }): Promise<PlateWithWells | null> => {
    return getPlateWithWells(data.plateId);
  });

// ─── updateWellState (#9) ───────────────────────────────────────────────────

const UpdateWellStateSchema = z.object({
  experimentId: z.string().min(1),
  plateId: z.string().min(1),
  coordinate: z.string().min(1),
  state: z.record(z.unknown()).default({}),
  media: z.string().optional(),
  note: z.string().optional(),
});

type UpdateWellStateInput = z.infer<typeof UpdateWellStateSchema>;

/**
 * Updates state and contents for specific plate coordinates (e.g., well C7).
 * Strictly preserves immutability by recording changes as append-only STATE_CHANGE events.
 *
 * Module 2 (#9): `updateWellState` → `{ experimentId, plateId, coordinate, state }` → result
 */
export const updateWellState = createServerFn({ method: 'POST' })
  .validator((data: unknown) => UpdateWellStateSchema.parse(data))
  .handler(async ({ data }: { data: UpdateWellStateInput }) => {
    const well = await getWellByCoordinate(data.plateId, data.coordinate);
    if (!well) {
      throw new Error(`Well "${data.coordinate}" not found in plate "${data.plateId}"`);
    }

    const event = await logTelemetryEvent({
      experimentId: data.experimentId,
      wellId: well.id,
      type: EventType.STATE_CHANGE,
      rawPayload: {
        action: 'UPDATE_WELL_STATE',
        coordinate: data.coordinate,
        plateId: data.plateId,
        wellId: well.id,
        state: data.state,
        media: data.media,
        note: data.note,
      } as Prisma.InputJsonValue,
    });

    // Update in-memory active coordinate
    try {
      const coord: ActiveCoordinate = {
        plateLabel: `Plate ${data.plateId}`,
        plateId: data.plateId,
        wellCoordinate: data.coordinate,
        wellId: well.id,
      };
      updateActiveState(data.experimentId, { activeCoordinate: coord });
    } catch {
      // If state is not active, it's safe to continue
    }

    return {
      success: true,
      wellId: well.id,
      coordinate: data.coordinate,
      eventId: event.id,
    };
  });

// ─── batchUpdateWells (#10) ─────────────────────────────────────────────────

const BatchUpdateWellsSchema = z.object({
  experimentId: z.string().optional(),
  plateId: z.string().optional(),
  updates: z.array(
    z.object({
      plateId: z.string().optional(),
      coordinate: z.string().min(1),
      state: z.record(z.unknown()).optional(),
      contents: z.string().optional(),
      status: z.string().optional(),
      media: z.string().optional(),
    })
  ).min(1, 'At least one well update required'),
  capturedAt: z.coerce.date().optional(),
});

type BatchUpdateWellsInput = z.infer<typeof BatchUpdateWellsSchema>;

/**
 * High-throughput batch state updates across multiple wells simultaneously.
 * Supports multi-well array updates across 24, 48, 96, or 384 well plates in a single call.
 *
 * Module 2 (#10): `batchUpdateWells` → `{ plateId, updates, capturedAt }` → `{ updatedCount, success }`
 */
export const batchUpdateWells = createServerFn({ method: 'POST' })
  .validator((data: unknown) => BatchUpdateWellsSchema.parse(data))
  .handler(async ({ data }: { data: BatchUpdateWellsInput }) => {
    const createdAt = data.capturedAt ?? new Date();
    const defaultExpId = data.experimentId ?? 'exp_batch_update';

    const eventInputs = data.updates.map((u) => ({
      experimentId: defaultExpId,
      type: EventType.STATE_CHANGE,
      rawPayload: {
        action: 'BATCH_UPDATE_WELL',
        plateId: u.plateId ?? data.plateId,
        coordinate: u.coordinate,
        contents: u.contents,
        status: u.status,
        state: u.state ?? {},
        media: u.media,
        capturedAt: createdAt.toISOString(),
      } as Prisma.InputJsonValue,
      createdAt,
    }));

    const result = await batchCreateTelemetryEvents(eventInputs);

    return {
      success: true,
      updatedCount: result.count,
    };
  });

// ─── getWellHistory (#11) ───────────────────────────────────────────────────

const GetWellHistorySchema = z.object({
  wellId: z.string().optional(),
  plateId: z.string().optional(),
  coordinate: z.string().optional(),
}).refine((data) => data.wellId || (data.plateId && data.coordinate), {
  message: 'Either wellId or both plateId and coordinate must be provided',
});

type GetWellHistoryInput = z.infer<typeof GetWellHistorySchema>;

/**
 * Retrieves chronological state mutation history and CV detections for an individual well.
 * Supports querying by wellId or by plateId + coordinate.
 *
 * Module 2 (#11): `getWellHistory` → `{ plateId, coordinate }` / `{ wellId }` → `{ well, events, detections }`
 */
export const getWellHistory = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetWellHistorySchema.parse(data))
  .handler(async ({ data }: { data: GetWellHistoryInput }) => {
    const { getWellHistoryByCoordinate } = await import('../db/repositories');

    if (data.plateId && data.coordinate) {
      return getWellHistoryByCoordinate(data.plateId, data.coordinate);
    }

    if (data.wellId) {
      return dbGetWellHistory(data.wellId);
    }

    return { well: null, events: [], detections: [] };
  });

