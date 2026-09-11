/**
 * src/server/webhooks/voice-pipeline.ts
 *
 * LiveKit / AssemblyAI Voice Pipeline Webhook Gateway for Project K.O.C.H.
 *
 * Architecture (PRD §5.2 / §8 — Third-Party Integrations):
 *   LiveKit Cloud (or Pipecat Cloud) manages the WebRTC audio transport and
 *   plugs AssemblyAI in as the STT engine. When a transcript + intent event
 *   is ready, the pipeline POSTs a webhook callback to this handler.
 *   The handler:
 *     1. Authenticates the request via HMAC-SHA256 signature header using
 *        LIVEKIT_API_SECRET (industry-standard webhook auth for LiveKit).
 *     2. Validates and normalises the payload.
 *     3. Resolves the raw transcript to a structured ResolvedIntent.
 *     4. Delegates to the ingestVoiceIntent server function logic (repositories
 *        + state manager) — the same path as a direct server function call.
 *
 * Endpoint:
 *   POST /api/webhooks/voice-pipeline
 *   Header: X-LiveKit-Signature: sha256=<hmac-hex>
 *   Header: X-Koch-Api-Key: <KOCH_API_KEY_SECRET>     (internal secondary check)
 *
 * IMPORTANT: This module exports a plain async handler function — it is NOT
 * a TanStack Start `createServerFn`. It is mounted as an API route handler
 * in src/routes/api/voice-pipeline.ts (to be created in a later milestone).
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

import {
  logTelemetryEvent,
  EventType,
} from '../db/repositories';

import {
  updateActiveState,
  type ActiveCoordinate,
} from '../services/state';

// ─── Intent resolution ────────────────────────────────────────────────────────

/**
 * Resolves a raw AssemblyAI transcript string into a structured intent object.
 *
 * This is a keyword-matching resolver sufficient for M2 (PRD §11 — Milestones).
 * It will be replaced with an LLM-based NLU classifier in M3.
 *
 * Pattern: "mark plate <N> well <COORD>" → MARK_WELL
 *           "add tube <ID>"              → ADD_TUBE
 *           "start timer"                → START_TIMER
 *           (anything else)              → UNKNOWN
 */
export function resolveIntent(transcript: string): ResolvedIntentPayload {
  const t = transcript.trim().toLowerCase();

  // MARK_WELL: "mark plate 4 well C7"
  const markWellMatch = t.match(/mark\s+plate\s+(\S+)\s+well\s+([a-h]\d+)/i);
  if (markWellMatch) {
    return {
      action: 'MARK_WELL_PENDING',
      plateLabel: `Plate ${markWellMatch[1]}`,
      wellCoordinate: markWellMatch[2].toUpperCase(),
    };
  }

  // ADD_TUBE: "add tube <ID>"
  const addTubeMatch = t.match(/add\s+tube\s+(\S+)/i);
  if (addTubeMatch) {
    return { action: 'ADD_TUBE', tubeId: addTubeMatch[1] };
  }

  // START_TIMER
  if (t.includes('start timer') || t.includes('lap timer')) {
    return { action: 'START_TIMER' };
  }

  return { action: 'UNKNOWN', raw: transcript };
}

// Intermediate type — MARK_WELL_PENDING is resolved to MARK_WELL after DB lookup
type ResolvedIntentPayload =
  | { action: 'MARK_WELL_PENDING'; plateLabel: string; wellCoordinate: string }
  | { action: 'ADD_TUBE'; tubeId: string }
  | { action: 'START_TIMER' }
  | { action: 'UNKNOWN'; raw: string };

// ─── Webhook payload schema ───────────────────────────────────────────────────

/**
 * Shape of the JSON body POSTed by LiveKit/Pipecat Cloud when an AssemblyAI
 * transcript event fires.
 *
 * Reference: https://docs.livekit.io/home/server/webhooks/
 */
const VoicePipelineWebhookSchema = z.object({
  /** LiveKit event type — we only care about "transcript_ready" */
  event: z.string(),
  /** Experiment session identifier passed as room metadata by the client */
  experimentId: z.string().cuid(),
  /** AssemblyAI transcript text */
  transcript: z.string(),
  /**
   * Optional: video frame timestamp in ISO-8601 from the client's stream
   * at the moment the utterance ended (for frame/voice correlation).
   */
  frameTimestamp: z.string().datetime().optional(),
  /**
   * Room name from LiveKit (stored in rawPayload for audit purposes).
   */
  roomName: z.string().optional(),
});

export type VoicePipelineWebhookPayload = z.infer<typeof VoicePipelineWebhookSchema>;

// ─── HMAC signature verification ─────────────────────────────────────────────

/**
 * Verifies the X-LiveKit-Signature header against the raw request body.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param rawBody          Raw request body Buffer
 * @param signatureHeader  Value of X-LiveKit-Signature header (format: "sha256=<hex>")
 * @param secret           LIVEKIT_API_SECRET from environment
 * @returns                true if the signature is valid
 */
export function verifyLiveKitSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader.startsWith('sha256=')) return false;

  const receivedSig = Buffer.from(signatureHeader.slice(7), 'hex');
  const expectedSig = Buffer.from(
    createHmac('sha256', secret).update(rawBody).digest('hex'),
    'hex',
  );

  // Buffers must be same length before timingSafeEqual
  if (receivedSig.length !== expectedSig.length) return false;

  return timingSafeEqual(receivedSig, expectedSig);
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export interface WebhookHandlerRequest {
  /** Raw request body bytes (for HMAC verification) */
  rawBody: Buffer;
  /** Parsed JSON body */
  body: unknown;
  headers: {
    'x-livekit-signature'?: string;
    'x-koch-api-key'?: string;
  };
}

export interface WebhookHandlerResponse {
  status: number;
  json: Record<string, unknown>;
}

/**
 * Main webhook handler.
 * Mounted at POST /api/webhooks/voice-pipeline.
 *
 * Auth:
 *   - Primary:   HMAC-SHA256 via X-LiveKit-Signature (LiveKit standard)
 *   - Secondary: X-Koch-Api-Key matches KOCH_API_KEY_SECRET (internal safety net)
 *
 * On success: persists two TelemetryEvent rows (VOICE_UTTERANCE + INTENT)
 * and updates the in-memory active state, then returns { ok: true }.
 *
 * On auth failure: returns HTTP 401 immediately — no DB access attempted.
 * On validation error: returns HTTP 400 with error detail.
 * On unexpected error: returns HTTP 500 — callers should retry.
 */
export async function handleVoicePipelineWebhook(
  req: WebhookHandlerRequest,
): Promise<WebhookHandlerResponse> {
  const livekitSecret = process.env.LIVEKIT_API_SECRET ?? '';
  const kochApiKeySecret = process.env.KOCH_API_KEY_SECRET ?? '';

  // ── Auth check 1: HMAC signature ──────────────────────────────────────────
  const sigHeader = req.headers['x-livekit-signature'] ?? '';
  if (!verifyLiveKitSignature(req.rawBody, sigHeader, livekitSecret)) {
    console.warn('[VoicePipelineWebhook] Invalid LiveKit HMAC signature — rejecting.');
    return { status: 401, json: { error: 'Invalid signature' } };
  }

  // ── Auth check 2: internal API key ────────────────────────────────────────
  if (req.headers['x-koch-api-key'] !== kochApiKeySecret) {
    console.warn('[VoicePipelineWebhook] Invalid KOCH API key — rejecting.');
    return { status: 401, json: { error: 'Unauthorized' } };
  }

  // ── Parse & validate payload ──────────────────────────────────────────────
  const parseResult = VoicePipelineWebhookSchema.safeParse(req.body);
  if (!parseResult.success) {
    return {
      status: 400,
      json: { error: 'Invalid payload', details: parseResult.error.flatten() },
    };
  }

  const payload = parseResult.data;

  // Skip non-transcript events (LiveKit sends other event types too)
  if (payload.event !== 'transcript_ready') {
    return { status: 200, json: { ok: true, skipped: true } };
  }

  try {
    const frameTimestamp = payload.frameTimestamp
      ? new Date(payload.frameTimestamp)
      : new Date();

    // ── Step 1: Persist raw utterance ────────────────────────────────────────
    await logTelemetryEvent({
      experimentId: payload.experimentId,
      type: EventType.VOICE_UTTERANCE,
      rawPayload: {
        transcript: payload.transcript,
        roomName: payload.roomName ?? null,
      } as Prisma.InputJsonValue,
      frameTimestamp,
    });

    // ── Step 2: Resolve intent ────────────────────────────────────────────────
    const intent = resolveIntent(payload.transcript);

    // ── Step 3: Persist intent event ─────────────────────────────────────────
    const intentEvent = await logTelemetryEvent({
      experimentId: payload.experimentId,
      type: EventType.INTENT,
      rawPayload: intent as unknown as Prisma.InputJsonValue,
      frameTimestamp,
    });

    // ── Step 4: Update active state ───────────────────────────────────────────
    switch (intent.action) {
      case 'MARK_WELL_PENDING': {
        // At webhook time we have plateLabel + wellCoordinate but not DB IDs.
        // We store what we know; the full resolution (plateId, wellId) happens
        // when the operator's session has an active plate in state.
        // For now, record a partial coordinate — full lookup is done by the
        // ingestVoiceIntent server function when called with resolved IDs.
        const partialCoord: ActiveCoordinate = {
          plateLabel: intent.plateLabel,
          plateId: '', // resolved by client using active plate context
          wellCoordinate: intent.wellCoordinate,
          wellId: '', // resolved by client using active well context
        };
        updateActiveState(payload.experimentId, { activeCoordinate: partialCoord });
        break;
      }
      case 'ADD_TUBE': {
        updateActiveState(payload.experimentId, {
          meta: { lastTubeAdded: intent.tubeId },
        });
        break;
      }
      case 'START_TIMER': {
        updateActiveState(payload.experimentId, {
          timerMarks: [new Date().toISOString()],
        });
        break;
      }
      default:
        break;
    }

    console.info(
      `[VoicePipelineWebhook] Processed experiment=${payload.experimentId} ` +
        `intent=${intent.action} eventId=${intentEvent.id}`,
    );

    return { status: 200, json: { ok: true, eventId: intentEvent.id } };
  } catch (err) {
    console.error('[VoicePipelineWebhook] Handler error:', err);
    return { status: 500, json: { error: 'Internal server error' } };
  }
}
