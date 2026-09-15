/**
 * src/server/functions/telemetry.ts
 *
 * TanStack Start server functions for telemetry ingestion.
 *
 * PRD §7 — Backend API Surface:
 *   ingestVoiceIntent  → log a VOICE_UTTERANCE + INTENT event pair
 *   ingestFrameMark    → correlate a frame timestamp to a well/coordinate
 *
 * Design constraints enforced:
 *   - TelemetryEvent is strictly append-only (logTelemetryEvent only).
 *   - Both functions also update the in-memory active state so the client
 *     gets a coherent snapshot from getActiveState immediately after.
 *   - Voice confirmation latency budget <500 ms (PRD §9) — these functions
 *     must remain thin. No heavy computation inside the handler.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

import {
  logTelemetryEvent,
  EventType,
} from '../db/repositories';

import { updateActiveState, type ActiveCoordinate } from '../services/state';

// ─── ingestVoiceIntent ────────────────────────────────────────────────────────

/**
 * Structured intent payload resolved from an operator voice utterance.
 * The intent resolver (called upstream by the webhook) produces this shape.
 *
 * Example: "Mark plate 4 well C7" →
 *   { action: "MARK_WELL", plateLabel: "Plate 4", plateId: "...", wellCoordinate: "C7", wellId: "..." }
 */
const ResolvedIntentSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('MARK_WELL'),
    plateLabel: z.string(),
    plateId: z.string(),
    wellCoordinate: z.string(),
    wellId: z.string(),
  }),
  z.object({
    action: z.literal('ADD_TUBE'),
    tubeId: z.string(),
  }),
  z.object({
    action: z.literal('START_TIMER'),
  }),
  z.object({
    action: z.literal('UNKNOWN'),
    raw: z.string(),
  }),
]);

export type ResolvedIntent = z.infer<typeof ResolvedIntentSchema>;

const IngestVoiceIntentSchema = z.object({
  experimentId: z.string().min(1),
  /** Raw transcript text as delivered by AssemblyAI */
  transcript: z.string(),
  /** Structured intent resolved from the transcript */
  intent: ResolvedIntentSchema,
  /** Optional frame timestamp to correlate this utterance to a video frame */
  frameTimestamp: z.coerce.date().optional(),
});

type IngestVoiceIntentInput = z.infer<typeof IngestVoiceIntentSchema>;

/**
 * Ingests a resolved voice intent from the LiveKit/AssemblyAI pipeline.
 *
 * 1. Appends a VOICE_UTTERANCE event (raw transcript).
 * 2. Appends an INTENT event (structured payload).
 * 3. Mutates active state: updates activeCoordinate, activeTubeIds, or
 *    timerMarks depending on the resolved intent action.
 *
 * Returns the INTENT TelemetryEvent row (the last one written).
 *
 * PRD §7: `ingestVoiceIntent` → `{ experimentId, transcript, intent }` → `TelemetryEvent`
 */
export const ingestVoiceIntent = createServerFn({ method: 'POST' })
  .validator((data: unknown) => IngestVoiceIntentSchema.parse(data))
  .handler(async ({ data }: { data: IngestVoiceIntentInput }) => {
    const now = data.frameTimestamp ?? new Date();

    // 1. Log raw utterance
    await logTelemetryEvent({
      experimentId: data.experimentId,
      type: EventType.VOICE_UTTERANCE,
      rawPayload: { transcript: data.transcript } as Prisma.InputJsonValue,
      frameTimestamp: now,
    });

    // 2. Log structured intent
    const intentEvent = await logTelemetryEvent({
      experimentId: data.experimentId,
      type: EventType.INTENT,
      rawPayload: data.intent as Prisma.InputJsonValue,
      frameTimestamp: now,
      wellId: data.intent.action === 'MARK_WELL' ? data.intent.wellId : undefined,
    });

    // 3. Update active state based on resolved intent
    switch (data.intent.action) {
      case 'MARK_WELL': {
        const coord: ActiveCoordinate = {
          plateLabel: data.intent.plateLabel,
          plateId: data.intent.plateId,
          wellCoordinate: data.intent.wellCoordinate,
          wellId: data.intent.wellId,
        };
        updateActiveState(data.experimentId, { activeCoordinate: coord });
        break;
      }
      case 'ADD_TUBE': {
        updateActiveState(data.experimentId, {
          meta: { lastTubeAdded: data.intent.tubeId },
        });
        break;
      }
      case 'START_TIMER': {
        updateActiveState(data.experimentId, {
          timerMarks: [new Date().toISOString()],
        });
        break;
      }
      default:
        break;
    }

    return intentEvent;
  });

// ─── ingestFrameMark ─────────────────────────────────────────────────────────

const IngestFrameMarkSchema = z.object({
  experimentId: z.string().min(1),
  wellId: z.string().min(1),
  /**
   * Monotonic frame timestamp from the client's video stream.
   * Used to correlate "Mark plate 4 well C7" to the exact active frame
   * at the moment the utterance was made (PRD §5.2 — timestamp correlation).
   */
  frameTimestamp: z.coerce.date(),
});

type IngestFrameMarkInput = z.infer<typeof IngestFrameMarkSchema>;

/**
 * Correlates a buffered video frame timestamp with a specific well/coordinate.
 * Appends a FRAME_MARK event to the telemetry log.
 *
 * PRD §7: `ingestFrameMark` → `{ experimentId, wellId, frameTimestamp }` → `TelemetryEvent`
 */
export const ingestFrameMark = createServerFn({ method: 'POST' })
  .validator((data: unknown) => IngestFrameMarkSchema.parse(data))
  .handler(async ({ data }: { data: IngestFrameMarkInput }) => {
    return logTelemetryEvent({
      experimentId: data.experimentId,
      wellId: data.wellId,
      type: EventType.FRAME_MARK,
      rawPayload: { frameTimestamp: data.frameTimestamp.toISOString() } as Prisma.InputJsonValue,
      frameTimestamp: data.frameTimestamp,
    });
  });

// ─── getExperimentEvents (#27) ──────────────────────────────────────────────

const GetExperimentEventsSchema = z.object({
  experimentId: z.string().min(1),
  type: z.enum([
    EventType.VOICE_UTTERANCE,
    EventType.INTENT,
    EventType.FRAME_MARK,
    EventType.STATE_CHANGE,
  ]).optional(),
  limit: z.number().int().positive().max(1000).optional().default(200),
  offset: z.number().int().nonnegative().optional().default(0),
});

type GetExperimentEventsInput = z.infer<typeof GetExperimentEventsSchema>;

/**
 * Streams or queries the append-only immutable TelemetryEvent log for an experiment.
 *
 * Module 8 (#27): `getExperimentEvents` → `{ experimentId, type, limit, offset }` → `TelemetryEvent[]`
 */
export const getExperimentEvents = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetExperimentEventsSchema.parse(data))
  .handler(async ({ data }: { data: GetExperimentEventsInput }) => {
    const { getTelemetryEventsByExperiment } = await import('../db/repositories');
    return getTelemetryEventsByExperiment(data.experimentId, {
      type: data.type,
      limit: data.limit,
      offset: data.offset,
    });
  });

// ─── logCompensatingEvent (#28) ─────────────────────────────────────────────

const LogCompensatingEventSchema = z.object({
  experimentId: z.string().min(1),
  wellId: z.string().optional(),
  reason: z.string().min(1, 'Reason for compensation must be specified'),
  correctedPayload: z.record(z.unknown()),
  originalEventId: z.string().optional(),
});

type LogCompensatingEventInput = z.infer<typeof LogCompensatingEventSchema>;

/**
 * Writes corrective compensating events to rectify user or operator errors
 * without mutating or deleting historical rows (preserving immutable audit trails).
 *
 * Module 8 (#28): `logCompensatingEvent` → `{ experimentId, reason, correctedPayload }` → `TelemetryEvent`
 */
export const logCompensatingEvent = createServerFn({ method: 'POST' })
  .validator((data: unknown) => LogCompensatingEventSchema.parse(data))
  .handler(async ({ data }: { data: LogCompensatingEventInput }) => {
    return logTelemetryEvent({
      experimentId: data.experimentId,
      wellId: data.wellId,
      type: EventType.STATE_CHANGE,
      rawPayload: {
        isCompensatingEvent: true,
        reason: data.reason,
        originalEventId: data.originalEventId,
        correction: data.correctedPayload,
        compensatedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    });
  });

