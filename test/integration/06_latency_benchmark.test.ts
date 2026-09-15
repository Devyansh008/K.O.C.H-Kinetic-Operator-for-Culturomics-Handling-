/**
 * test/integration/06_latency_benchmark.test.ts
 *
 * Pillar 6: Sub-500ms Latency & Load Benchmark
 * Asserts real-time cleanroom responsiveness under concurrent load.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { callFn } from './helper';
import { startExperiment, getActiveState } from '../../src/server/functions/experiment';
import { configurePlateLayout } from '../../src/server/functions/plate';
import { ingestCameraFrame } from '../../src/server/functions/camera';
import { ingestVoiceIntent } from '../../src/server/functions/telemetry';

describe('Pillar 6: Sub-500ms Latency & Load Benchmark', () => {
  let experimentId: string;

  beforeEach(async () => {
    const exp = await callFn<any, any>(startExperiment, { name: 'Latency Benchmark Run' });
    experimentId = exp.id;

    await callFn(configurePlateLayout, {
      experimentId,
      label: 'Plate 1',
      wellCount: 96,
    });
  });

  it('should process ingestVoiceIntent in <500ms under concurrent camera frame load', async () => {
    // 1. Fire concurrent background camera frames simulating 30 FPS video streaming
    const framePromises = Array.from({ length: 15 }).map((_, i) =>
      callFn(ingestCameraFrame, {
        experimentId,
        base64Data: `data:image/jpeg;base64,frame_payload_sample_${i}==`,
        width: 1280,
        height: 720,
        rotationDeg: 0,
      }),
    );

    // 2. Measure high-priority voice intent processing latency
    const startTime = performance.now();

    const voiceResult = await callFn<any, any>(ingestVoiceIntent, {
      experimentId,
      transcript: 'mark plate 1 well H12',
      intent: { action: 'MARK_WELL', plateLabel: 'Plate 1', wellCoordinate: 'H12' },
    });

    const elapsedMs = performance.now() - startTime;

    // Await camera background loads
    await Promise.all(framePromises);

    expect(voiceResult).toBeDefined();
    expect(voiceResult.id).toBeDefined();
    // Non-negotiable cleanroom responsiveness threshold: < 500 ms
    expect(elapsedMs).toBeLessThan(500);
  });

  it('should retrieve active state snapshots concurrently in <100ms', async () => {
    const iterations = 20;
    const startTime = performance.now();

    const results = await Promise.all(
      Array.from({ length: iterations }).map(() =>
        callFn(getActiveState, { experimentId }),
      ),
    );

    const totalElapsedMs = performance.now() - startTime;
    const avgLatencyMs = totalElapsedMs / iterations;

    expect(results).toHaveLength(iterations);
    expect((results[0] as any)?.experimentId).toBe(experimentId);
    expect(avgLatencyMs).toBeLessThan(100);
  });
});
