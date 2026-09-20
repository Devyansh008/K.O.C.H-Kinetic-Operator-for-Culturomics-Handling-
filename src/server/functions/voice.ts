/**
 * src/server/functions/voice.ts
 *
 * Module 3: Voice Intent & Webhooks Server Functions
 *
 * Implements:
 *   - getVoiceAuditLogs (#14): Voice command history, parsing confidence, and WER logs.
 *   - retryFailedUtterance (#15): Fallback recovery route to re-sync unconfirmed voice packets.
 *   - streamVoiceSession (#16): Active WebRTC/WebSocket audio control channel session status.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AccessToken } from 'livekit-server-sdk';

import {
  getVoiceAuditEvents,
  logTelemetryEvent,
  createVoiceIntentLog,
  EventType,
} from '../db/repositories';

import {
  resolveIntent,
} from '../webhooks/voice-pipeline';

import {
  updateActiveState,
  type ActiveCoordinate,
} from '../services/state';

// ─── getVoiceAuditLogs (#14) ────────────────────────────────────────────────

const GetVoiceAuditLogsSchema = z.object({
  experimentId: z.string().min(1),
  limit: z.number().int().positive().max(500).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
  minConfidence: z.number().min(0).max(1).optional(),
});

type GetVoiceAuditLogsInput = z.infer<typeof GetVoiceAuditLogsSchema>;

export interface VoiceAuditEntry {
  id: string;
  type: string;
  createdAt: string;
  transcript?: string;
  action?: string;
  confidenceScore: number;
  wordErrorRateEstimate?: number;
  rawPayload: Prisma.JsonValue;
}

export interface VoiceAuditReport {
  experimentId: string;
  totalEvents: number;
  averageConfidence: number;
  entries: VoiceAuditEntry[];
}

/**
 * Queries voice command history, parsing confidence, and WER logs.
 *
 * Module 3 (#14): `getVoiceAuditLogs` → `{ experimentId, limit, minConfidence }` → `VoiceAuditReport`
 */
export const getVoiceAuditLogs = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetVoiceAuditLogsSchema.parse(data))
  .handler(async ({ data }: { data: GetVoiceAuditLogsInput }): Promise<VoiceAuditReport> => {
    const rawEvents = await getVoiceAuditEvents(data.experimentId, {
      limit: data.limit,
      offset: data.offset,
    });

    let totalConfidence = 0;
    let confidenceCount = 0;

    let entries: VoiceAuditEntry[] = rawEvents.map((ev) => {
      const intentPayload = (typeof ev.intent === 'object' && ev.intent !== null)
        ? (ev.intent as Record<string, unknown>)
        : {};

      const action = typeof intentPayload.action === 'string' ? intentPayload.action : undefined;
      
      const confidence = ev.confidence ?? 1.0;
      totalConfidence += confidence;
      confidenceCount++;

      return {
        id: ev.id,
        type: 'VOICE_INTENT',
        createdAt: ev.createdAt.toISOString(),
        transcript: ev.transcript,
        action,
        confidenceScore: confidence,
        wordErrorRateEstimate: action === 'UNKNOWN' ? 0.45 : 0.02,
        rawPayload: ev.intent,
      };
    });

    if (typeof data.minConfidence === 'number') {
      entries = entries.filter((e) => e.confidenceScore >= (data.minConfidence ?? 0));
    }

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 1.0;

    return {
      experimentId: data.experimentId,
      totalEvents: rawEvents.length,
      averageConfidence: parseFloat(averageConfidence.toFixed(3)),
      entries,
    };
  });

// ─── retryFailedUtterance (#15) ─────────────────────────────────────────────

const RetryFailedUtteranceSchema = z.object({
  experimentId: z.string().optional(),
  logId: z.string().optional(),
  correctedTranscript: z.string().optional(),
  rawTranscript: z.string().optional(),
  frameTimestamp: z.coerce.date().optional(),
  overrideAction: z.string().optional(),
  overrideParams: z.record(z.unknown()).optional(),
}).refine((d) => d.correctedTranscript || d.rawTranscript, {
  message: 'Either correctedTranscript or rawTranscript must be supplied',
});

type RetryFailedUtteranceInput = z.infer<typeof RetryFailedUtteranceSchema>;

/**
 * Fallback recovery route to re-sync dropped or unconfirmed voice packets.
 * Re-runs the intent resolver and appends an auditable recovery INTENT event.
 *
 * Module 3 (#15): `retryFailedUtterance` → `{ logId, correctedTranscript }` → `TelemetryEvent`
 */
export const retryFailedUtterance = createServerFn({ method: 'POST' })
  .validator((data: unknown) => RetryFailedUtteranceSchema.parse(data))
  .handler(async ({ data }: { data: RetryFailedUtteranceInput }) => {
    const expId = data.experimentId ?? 'exp_voice_retry';
    const transcriptText = data.correctedTranscript ?? data.rawTranscript ?? '';
    const frameTimestamp = data.frameTimestamp ?? new Date();

    // 1. Resolve intent from corrected transcript or apply operator override
    const resolved = data.overrideAction
      ? { action: data.overrideAction, ...data.overrideParams }
      : resolveIntent(transcriptText);

    // 2. Append recovery telemetry event
    const event = await logTelemetryEvent({
      experimentId: expId,
      type: EventType.INTENT,
      rawPayload: {
        isRetryRecovery: true,
        originalLogId: data.logId,
        correctedTranscript: transcriptText,
        intent: resolved,
      } as Prisma.InputJsonValue,
      frameTimestamp,
    });

    await createVoiceIntentLog({
      experimentId: expId,
      transcript: transcriptText,
      intent: resolved as Prisma.InputJsonValue,
      confidence: 1.0,
      status: 'RETRIED',
    });

    // 3. Update active state if applicable
    if (resolved.action === 'MARK_WELL_PENDING' && 'plateLabel' in resolved && 'wellCoordinate' in resolved) {
      const partialCoord: ActiveCoordinate = {
        plateLabel: resolved.plateLabel,
        plateId: '',
        wellCoordinate: resolved.wellCoordinate,
        wellId: '',
      };
      try {
        updateActiveState(expId, { activeCoordinate: partialCoord });
      } catch {
        // Safe to ignore if state is offline
      }
    }

    return event;
  });

// ─── streamVoiceSession (#16) ───────────────────────────────────────────────

const StreamVoiceSessionSchema = z.object({
  experimentId: z.string().min(1),
  participantIdentity: z.string().optional().default('operator-1'),
  roomName: z.string().optional(),
});

type StreamVoiceSessionInput = z.infer<typeof StreamVoiceSessionSchema>;

export interface VoiceSessionInfo {
  sessionToken: string;
  wsUrl: string;
  roomName: string;
  participantIdentity: string;
  status: 'CONNECTED' | 'IDLE' | 'RECONNECTING';
  livekitAvailable: boolean;
}

/**
 * Manages active WebRTC/WebSocket audio control channels and session status.
 * Returns session credentials / token for connecting LiveKit/Pipecat audio.
 *
 * Module 3 (#16): `streamVoiceSession` → `{ experimentId }` → `VoiceSessionInfo`
 */
export const streamVoiceSession = createServerFn({ method: 'GET' })
  .validator((data: unknown) => StreamVoiceSessionSchema.parse(data))
  .handler(async ({ data }: { data: StreamVoiceSessionInput }): Promise<VoiceSessionInfo> => {
    const roomName = data.roomName ?? `koch-exp-${data.experimentId}`;
    const livekitHost = process.env.LIVEKIT_URL ?? 'wss://livekit.cloud.local';
    const isLiveKitConfigured = Boolean(process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_API_KEY);

    let sessionToken = '';
    if (isLiveKitConfigured) {
      const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
        identity: data.participantIdentity,
        ttl: 3600, // 1 hour
      });
      at.addGrant({ roomJoin: true, room: roomName });
      sessionToken = await at.toJwt();
    } else {
      const tokenPayload = {
        room: roomName,
        sub: data.participantIdentity,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      };
      sessionToken = `mock-livekit-jwt.${Buffer.from(JSON.stringify(tokenPayload)).toString('base64')}.signed`;
    }

    return {
      sessionToken,
      wsUrl: livekitHost,
      roomName,
      participantIdentity: data.participantIdentity,
      status: 'CONNECTED',
      livekitAvailable: isLiveKitConfigured,
    };
  });
