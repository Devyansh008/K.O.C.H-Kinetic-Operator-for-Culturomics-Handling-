/**
 * test/integration/02_event_immutability.test.ts
 *
 * Pillar 2: Immutable Event Stream & Persistence Tests
 * Verifies append-only guarantees and compensating event audit trails.
 */

import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/server/db/client';
import { callFn } from './helper';
import { logCompensatingEvent, getExperimentEvents } from '../../src/server/functions/telemetry';
import { EventType } from '../../src/server/db/repositories';

describe('Pillar 2: Immutable Event Stream & Persistence Tests', () => {
  it('should prohibit direct UPDATE or DELETE operations on TelemetryEvent rows', async () => {
    const experiment = await prisma.experiment.create({
      data: { name: 'Audit Test Exp' },
    });

    const event = await prisma.telemetryEvent.create({
      data: {
        experimentId: experiment.id,
        type: EventType.VOICE_UTTERANCE,
        rawPayload: { transcript: 'mark plate 1 well C7' },
      },
    });

    expect(event.id).toBeDefined();

    // Verify updating/deleting via repository/mock throws error to protect immutability
    await expect((prisma.telemetryEvent as any).update({
      where: { id: event.id },
      data: { rawPayload: { transcript: 'tampered transcript' } },
    })).rejects.toThrow(/append-only/i);

    await expect((prisma.telemetryEvent as any).delete({
      where: { id: event.id },
    })).rejects.toThrow(/append-only/i);
  });

  it('should prohibit direct UPDATE or DELETE operations on VoiceIntentLog rows', async () => {
    const experiment = await prisma.experiment.create({
      data: { name: 'Voice Audit Immutability Test' },
    });

    const voiceLog = await prisma.voiceIntentLog.create({
      data: {
        experimentId: experiment.id,
        transcript: 'add tube TB-101',
        intent: { action: 'ADD_TUBE', tubeId: 'TB-101' },
        confidence: 0.98,
      },
    });

    expect(voiceLog.id).toBeDefined();

    await expect((prisma.voiceIntentLog as any).update({
      where: { id: voiceLog.id },
      data: { confidence: 0.5 },
    })).rejects.toThrow(/append-only/i);

    await expect((prisma.voiceIntentLog as any).delete({
      where: { id: voiceLog.id },
    })).rejects.toThrow(/append-only/i);
  });

  it('should append compensating events without modifying historical rows', async () => {
    const experiment = await prisma.experiment.create({
      data: { name: 'Compensating Event Immutability Test' },
    });

    // 1. Initial event creation
    const initialEvent = await prisma.telemetryEvent.create({
      data: {
        experimentId: experiment.id,
        type: EventType.STATE_CHANGE,
        rawPayload: { activeCoordinate: 'C7', status: 'INOCULATED' },
      },
    });

    // 2. Log compensating event to correct human operator error
    const compensating = await callFn<any, any>(logCompensatingEvent, {
      experimentId: experiment.id,
      targetEventId: initialEvent.id,
      correctionPayload: { reason: 'Operator misidentified well coordinate C7 instead of C8', activeCoordinate: 'C8' },
    });

    expect(compensating.type).toBe(EventType.STATE_CHANGE);

    // 3. Assert both records exist and initial record was preserved in full
    const events = await callFn<any, any>(getExperimentEvents, {
      experimentId: experiment.id,
    });

    expect(events.events.length).toBe(2);
    expect(events.events[0].id).toBe(initialEvent.id);
    expect((events.events[0].rawPayload as any).activeCoordinate).toBe('C7');
    expect((events.events[1].rawPayload as any).correction.activeCoordinate).toBe('C8');
    expect((events.events[1].rawPayload as any).reason).toContain('Operator misidentified');
  });
});
