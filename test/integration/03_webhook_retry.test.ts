/**
 * test/integration/03_webhook_retry.test.ts
 *
 * Pillar 3: Webhook Authentication & Retry Tests
 * Verifies HMAC security, rejection of tampered payloads, and utterance recovery.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { handleVoicePipelineWebhook } from '../../src/server/webhooks/voice-pipeline';
import { startExperiment } from '../../src/server/functions/experiment';
import { retryFailedUtterance, getVoiceAuditLogs } from '../../src/server/functions/voice';
import { callFn } from './helper';
import { EventType } from '../../src/server/db/repositories';

describe('Pillar 3: Webhook Authentication & Retry Tests', () => {
  const livekitSecret = 'test-livekit-hmac-secret-12345';
  const kochSecret = 'test-koch-api-key-98765';
  let experimentId: string;

  beforeEach(async () => {
    process.env.LIVEKIT_API_SECRET = livekitSecret;
    process.env.KOCH_API_KEY_SECRET = kochSecret;

    const exp = await callFn<any, any>(startExperiment, { name: 'Webhook Test Run' });
    experimentId = exp.id;
  });

  it('should accept properly HMAC-SHA256 signed webhook payloads', async () => {
    const payload = {
      event: 'transcript_ready',
      experimentId,
      transcript: 'add tube TB-202',
      frameTimestamp: new Date().toISOString(),
    };

    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = 'sha256=' + createHmac('sha256', livekitSecret).update(rawBody).digest('hex');

    const res = await handleVoicePipelineWebhook({
      rawBody,
      body: payload,
      headers: {
        'x-livekit-signature': signature,
        'x-koch-api-key': kochSecret,
      },
    });

    expect(res.status).toBe(200);
    expect((res as any).json.ok).toBe(true);
    expect((res as any).json.eventId).toBeDefined();
  });

  it('should reject webhooks with missing, invalid, or tampered HMAC signatures', async () => {
    const payload = {
      event: 'transcript_ready',
      experimentId,
      transcript: 'abort experiment',
      frameTimestamp: new Date().toISOString(),
    };

    const rawBody = Buffer.from(JSON.stringify(payload));
    const tamperedSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    // 1. Tampered signature
    const resTampered = await handleVoicePipelineWebhook({
      rawBody,
      body: payload,
      headers: {
        'x-livekit-signature': tamperedSignature,
        'x-koch-api-key': kochSecret,
      },
    });
    expect(resTampered.status).toBe(401);

    // 2. Missing signature
    const resMissing = await handleVoicePipelineWebhook({
      rawBody,
      body: payload,
      headers: {
        'x-koch-api-key': kochSecret,
      },
    });
    expect(resMissing.status).toBe(401);

    // 3. Wrong API Key
    const validSignature = 'sha256=' + createHmac('sha256', livekitSecret).update(rawBody).digest('hex');
    const resWrongKey = await handleVoicePipelineWebhook({
      rawBody,
      body: payload,
      headers: {
        'x-livekit-signature': validSignature,
        'x-koch-api-key': 'wrong-key',
      },
    });
    expect(resWrongKey.status).toBe(401);
  });

  it('should allow retryFailedUtterance to re-dispatch unparsed or failed audio transcripts', async () => {
    // Retry a failed utterance log with corrected text
    const recoveredEvent = await callFn<any, any>(retryFailedUtterance, {
      experimentId,
      logId: 'failed_log_audio_gap_01',
      correctedTranscript: 'mark plate 1 well C7',
    });

    expect(recoveredEvent).toBeDefined();
    expect(recoveredEvent.type).toBe(EventType.INTENT);
    expect((recoveredEvent.rawPayload as any).originalLogId).toBe('failed_log_audio_gap_01');

    // Check voice audit logs include the reprocessed event
    const auditLogs = await callFn<any, any>(getVoiceAuditLogs, {
      experimentId,
      limit: 10,
    });
    expect(auditLogs.totalEvents).toBeGreaterThanOrEqual(1);
  });
});
