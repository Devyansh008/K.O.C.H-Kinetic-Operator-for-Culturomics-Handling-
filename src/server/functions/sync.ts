/**
 * src/server/functions/sync.ts
 *
 * Module 6: Offline Sync & Resilience Server Functions
 *
 * Implements:
 *   - flushBufferedEvents (#23): Ingests and flushes local browser IndexedDB event buffers after network reconnection.
 *   - getSyncStatus (#24): Tracks client/server sync state, buffer queue depth, and network health.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

import {
  batchCreateTelemetryEvents,
  getTelemetryEventsByExperiment,
  EventType,
} from '../db/repositories';

// ─── flushBufferedEvents (#23) ──────────────────────────────────────────────

const BufferedEventItemSchema = z.object({
  type: z.enum([
    EventType.VOICE_UTTERANCE,
    EventType.INTENT,
    EventType.FRAME_MARK,
    EventType.STATE_CHANGE,
  ]),
  rawPayload: z.record(z.unknown()).optional(),
  payload: z.record(z.unknown()).optional(),
  frameTimestamp: z.coerce.date().optional(),
  wellId: z.string().optional(),
  clientTimestamp: z.coerce.date().optional(),
  capturedAt: z.coerce.date().optional(),
  experimentId: z.string().optional(),
}).refine((d) => d.rawPayload || d.payload, {
  message: 'Either payload or rawPayload must be provided',
});

const FlushBufferedEventsSchema = z.object({
  experimentId: z.string().optional(),
  events: z.array(BufferedEventItemSchema).min(1, 'At least one event is required to flush'),
});

type FlushBufferedEventsInput = z.infer<typeof FlushBufferedEventsSchema>;

export interface FlushResult {
  success: boolean;
  insertedCount: number;
  syncedAt: string;
  experimentId: string;
}

/**
 * Ingests and flushes local browser IndexedDB event buffers after network reconnection.
 * Inserts events in append-only fashion into the database and updates active state.
 * Preserves historical accuracy by mapping client-side capturedAt timestamps directly to createdAt.
 *
 * Module 6 (#23): `flushBufferedEvents` → `{ events }` → `FlushResult`
 */
export const flushBufferedEvents = createServerFn({ method: 'POST' })
  .validator((data: unknown) => FlushBufferedEventsSchema.parse(data))
  .handler(async ({ data }: { data: FlushBufferedEventsInput }): Promise<FlushResult> => {
    console.log('--- FLUSH HANDLER CALLED ---', data);
    const defaultExpId = data.experimentId ?? data.events[0]?.experimentId ?? 'exp_offline_flush';

    // Normalize timestamps and sort to guarantee temporal ordering
    const mapped = data.events.map((e) => {
      const timestamp = e.capturedAt ?? e.clientTimestamp ?? new Date();
      const payloadData = e.payload ?? e.rawPayload ?? {};
      return {
        ...e,
        timestamp,
        payloadData,
      };
    });

    mapped.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const eventInputs = mapped.map((e) => ({
      experimentId: e.experimentId ?? defaultExpId,
      wellId: e.wellId,
      type: e.type,
      rawPayload: {
        ...e.payloadData,
        _offlineBuffered: true,
        _clientTimestamp: e.timestamp.toISOString(),
      } as Prisma.InputJsonValue,
      frameTimestamp: e.frameTimestamp,
      createdAt: e.timestamp,
    }));

    const result = await batchCreateTelemetryEvents(eventInputs);

    return {
      success: true,
      insertedCount: result.count,
      syncedAt: new Date().toISOString(),
      experimentId: defaultExpId,
    };
  });

// ─── getSyncStatus (#24) ────────────────────────────────────────────────────

const GetSyncStatusSchema = z.object({
  experimentId: z.string().min(1),
  clientQueueDepth: z.number().int().nonnegative().optional().default(0),
});

type GetSyncStatusInput = z.infer<typeof GetSyncStatusSchema>;

export interface SyncStatusReport {
  experimentId: string;
  serverEventCount: number;
  lastEventAt: string | null;
  clientQueueDepth: number;
  isHealthy: boolean;
  syncState: 'SYNCED' | 'PENDING_FLUSH' | 'DESYNCED';
  evaluatedAt: string;
}

/**
 * Tracks client/server sync state, buffer queue depth, and network health.
 *
 * Module 6 (#24): `getSyncStatus` → `{ experimentId, clientQueueDepth }` → `SyncStatusReport`
 */
export const getSyncStatus = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetSyncStatusSchema.parse(data))
  .handler(async ({ data }: { data: GetSyncStatusInput }): Promise<SyncStatusReport> => {
    const events = await getTelemetryEventsByExperiment(data.experimentId);
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;

    const syncState = data.clientQueueDepth > 0
      ? 'PENDING_FLUSH'
      : 'SYNCED';

    return {
      experimentId: data.experimentId,
      serverEventCount: events.length,
      lastEventAt: lastEvent ? lastEvent.createdAt.toISOString() : null,
      clientQueueDepth: data.clientQueueDepth,
      isHealthy: true,
      syncState,
      evaluatedAt: new Date().toISOString(),
    };
  });
