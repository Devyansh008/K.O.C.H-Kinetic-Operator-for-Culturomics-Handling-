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
  getTelemetryEventsByExperiment,
  getVoiceAuditEvents,
  logTelemetryEvent,
  createVoiceIntentLog,
  EventType,
} from '../db/repositories';

import { updateActiveState, getActiveStateSnapshot, type ActiveCoordinate } from '../services/state';
import { generateConfirmationPhrase } from '../services/tts-pipeline';
import { resetPlaybackState, streamTTSChunks } from './tts-bargein';

// ─── ingestVoiceIntent ────────────────────────────────────────────────        

/**
 * Structured intent payload resolved from an operator voice utterance.
 * The intent resolver (called upstream by the webhook) produces this shape.
 *
 * Example: "Mark plate 4 well C7" →
 *   { action: "MARK_WELL", plateLabel: "Plate 4", plateId: "...", wellCoordinate: "C7", wellId: "..." }
 */
const WellCoordinateSchema = z.string().regex(/^[A-P]([1-9]|1[0-9]|2[0-4])$/i, 'Invalid well coordinate');

const ResolvedIntentSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('MARK_WELL'),
    plateLabel: z.string().optional(),
    plateId: z.string().optional(),
    wellCoordinate: WellCoordinateSchema.optional(),
    wellId: z.string().optional(),
  }),
  z.object({
    action: z.literal('ADD_TUBE'),
    tubeId: z.string(),
  }),
  z.object({
    action: z.literal('START_TIMER'),
  }),
  z.object({
    action: z.literal('RECORD_OD600'),
  }),
  z.object({
    action: z.literal('ADD_CULTURE'),
    culture: z.string(),
  }),
  z.object({
    action: z.literal('SET_ENVIRONMENT'),
    environment: z.string(),
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

    await createVoiceIntentLog({
      experimentId: data.experimentId,
      transcript: data.transcript,
      intent: data.intent as Prisma.InputJsonValue,
    });

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

    const currentState = getActiveStateSnapshot(data.experimentId);
    const timerMark = new Date().toISOString();

    // 3. Update active state based on resolved intent
    switch (data.intent.action) {
      case 'MARK_WELL': {
        const coord: ActiveCoordinate = {
          plateLabel: data.intent.plateLabel ?? '',
          plateId: data.intent.plateId ?? '',
          wellCoordinate: data.intent.wellCoordinate ?? '',
          wellId: data.intent.wellId ?? '',
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
          timerMarks: [...(currentState.timerMarks ?? []), timerMark],
        });
        break;
      }
      case 'UNKNOWN':
      default:
        // No state mutation
        break;
    }

    // 4. Trigger TTS Confirmation Pipeline
    const confirmationPhrase = generateConfirmationPhrase(data.intent as ResolvedIntent);
    resetPlaybackState(data.experimentId);

    // Fire-and-forget the streaming audio generator
    (async () => {
      try {
        const stream = streamTTSChunks(data.experimentId, confirmationPhrase);
        for await (const chunk of stream) {
          // In a real environment, send `chunk` to WebSocket/WebRTC client
        }
      } catch (err) {
        console.error('TTS Stream error:', err);
      }
    })();

    return intentEvent;
  });

// ─── getExperimentEvents (#27) ──────────────────────────────────────────────

const GetExperimentEventsSchema = z.object({
  experimentId: z.string().min(1),
});

/**
 * Queries and streams the full chronological TelemetryEvent and VoiceIntentLog sequence.
 */
export const getExperimentEvents = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetExperimentEventsSchema.parse(data))
  .handler(async ({ data }) => {
    const [telemetry, intents] = await Promise.all([
      getTelemetryEventsByExperiment(data.experimentId, { limit: 1000 }),
      getVoiceAuditEvents(data.experimentId, { limit: 1000 }),
    ]);

    const combined = [
      ...telemetry.map(t => ({ ...t, _eventType: 'telemetry' })),
      ...intents.map(i => ({ ...i, _eventType: 'intentLog' })),
    ];

    // Interleave by chronological timestamp
    combined.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
      experimentId: data.experimentId,
      totalEvents: combined.length,
      events: combined,
    };
  });

// ─── logCompensatingEvent (#28) ─────────────────────────────────────────────

const LogCompensatingEventSchema = z.object({
  experimentId: z.string().min(1),
  targetEventId: z.string().min(1),
  correctionPayload: z.record(z.unknown()),
});

/**
 * Appends a corrective record without updating or deleting any historical database rows.
 * Provides immutable auditing of intent overrides or offline reconciliation corrections.
 */
export const logCompensatingEvent = createServerFn({ method: 'POST' })
  .validator((data: unknown) => LogCompensatingEventSchema.parse(data))
  .handler(async ({ data }) => {
    const event = await logTelemetryEvent({
      experimentId: data.experimentId,
      type: EventType.STATE_CHANGE,
      rawPayload: {
        isCorrection: true,
        targetEventId: data.targetEventId,
        correction: data.correctionPayload,
      } as Prisma.InputJsonValue,
    });

    return event;
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

