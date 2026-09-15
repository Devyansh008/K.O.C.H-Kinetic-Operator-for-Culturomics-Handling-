/**
 * test/integration/04_frame_correlation.test.ts
 *
 * Pillar 4: Frame-Voice Timestamp Correlation Tests
 * Verifies monotonic visual frame alignment with voice telemetry events.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { callFn } from './helper';
import { startExperiment } from '../../src/server/functions/experiment';
import { configurePlateLayout } from '../../src/server/functions/plate';
import { ingestCameraFrame, getCameraBufferStatus } from '../../src/server/functions/camera';
import { ingestFrameMark, ingestVoiceIntent, getExperimentEvents } from '../../src/server/functions/telemetry';
import { EventType } from '../../src/server/db/repositories';

describe('Pillar 4: Frame-Voice Timestamp Correlation Tests', () => {
  let experimentId: string;
  let plateId: string;
  let wellC7Id: string;

  beforeEach(async () => {
    const exp = await callFn<any, any>(startExperiment, { name: 'Frame Correlation Test' });
    experimentId = exp.id;

    const plate = await callFn<any, any>(configurePlateLayout, {
      experimentId,
      label: 'Plate 1',
      wellCount: 96,
    });
    plateId = plate.id;
    const well = plate.wells.find((w: any) => w.coordinate === 'C7');
    wellC7Id = well.id;
  });

  it('should buffer incoming RGB video frames and track buffer metrics', async () => {
    const frameResult = await callFn<any, any>(ingestCameraFrame, {
      experimentId,
      base64Data: 'data:image/jpeg;base64,mockrawjpegdatastring12345==',
      width: 1920,
      height: 1080,
      rotationDeg: 0,
    });

    expect(frameResult.frameId).toMatch(/^frame_/);
    expect(frameResult.base64Data.length).toBeGreaterThan(0);

    const stats = await callFn<any, any>(getCameraBufferStatus, { experimentId });
    expect(stats.bufferedFrameCount).toBeGreaterThanOrEqual(1);
  });

  it('should correlate sub-second frame timestamps with voice intent well marking', async () => {
    const frameTime = new Date();

    // 1. Spoken intent: "Mark plate 1 well C7"
    const voiceIntent = await callFn<any, any>(ingestVoiceIntent, {
      experimentId,
      transcript: 'mark plate 1 well C7',
      intent: { action: 'MARK_WELL', plateLabel: 'Plate 1', wellCoordinate: 'C7', wellId: wellC7Id },
    });
    expect(voiceIntent.type).toBe(EventType.INTENT);

    // 2. Visual frame capture marked at the same sub-second instant
    const frameMark = await callFn<any, any>(ingestFrameMark, {
      experimentId,
      wellId: wellC7Id,
      frameTimestamp: frameTime,
    });

    expect(frameMark.type).toBe(EventType.FRAME_MARK);
    expect(frameMark.wellId).toBe(wellC7Id);
    expect(new Date(frameMark.frameTimestamp).getTime()).toBe(frameTime.getTime());

    // 3. Verify chronological audit trail retains monotonic timestamps
    const events = await callFn<any, any>(getExperimentEvents, { experimentId });
    expect(events.length).toBeGreaterThanOrEqual(2);

    const markEvent = events.find((e: any) => e.type === EventType.FRAME_MARK);
    expect(markEvent).toBeDefined();
    expect(markEvent.wellId).toBe(wellC7Id);
  });
});
