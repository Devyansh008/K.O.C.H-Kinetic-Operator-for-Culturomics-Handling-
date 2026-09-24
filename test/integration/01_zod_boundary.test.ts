/**
 * test/integration/01_zod_boundary.test.ts
 *
 * Pillar 1: Zod Boundary & Runtime Validation Tests
 * Verifies strict input validation across all server functions.
 */

import { describe, it, expect } from 'vitest';
import { callFn } from './helper';

import {
  startExperiment,
  getExperiment,
  listExperiments,
  updateExperimentStatus,
  archiveExperiment,
  getActiveState,
} from '../../src/server/functions/experiment';

import {
  configurePlateLayout,
  getPlateLayout,
  updateWellState,
  batchUpdateWells,
  getWellHistory,
} from '../../src/server/functions/plate';

import {
  ingestVoiceIntent,
  ingestFrameMark,
  getExperimentEvents,
  logCompensatingEvent,
} from '../../src/server/functions/telemetry';

import {
  getVoiceAuditLogs,
  retryFailedUtterance,
  streamVoiceSession,
} from '../../src/server/functions/voice';

import {
  ingestCameraFrame,
  getCameraBufferStatus,
} from '../../src/server/functions/camera';

import {
  requestColonyDetection,
  getVisionDetections,
  getRecipeRecommendation,
} from '../../src/server/functions/perception';

import {
  queryPathwayDatabase,
} from '../../src/server/functions/pathways';

import {
  flushBufferedEvents,
  getSyncStatus,
} from '../../src/server/functions/sync';

import {
  generateElnReport,
  downloadElnReport,
  exportStandardized,
} from '../../src/server/functions/eln';

import {
  getSystemMetrics,
  getQuotaMonitoring,
} from '../../src/server/functions/observability';

describe('Pillar 1: Zod Boundary & Runtime Validation Tests', () => {
  it('Module 1: rejects invalid experiment creation, retrieval, and status payloads', async () => {
    // Empty name
    await expect(callFn(startExperiment, { name: '' })).rejects.toThrow();

    // Empty ID
    await expect(callFn(getExperiment, { experimentId: '' })).rejects.toThrow();

    // Invalid limit / negative page
    await expect(callFn(listExperiments, { page: -1, limit: 500 })).rejects.toThrow();

    // Invalid status enum
    await expect(callFn(updateExperimentStatus, { experimentId: 'exp_1', status: 'INVALID_STATUS' })).rejects.toThrow();

    // Valid experiment creation passes boundary
    const exp = await callFn<any, any>(startExperiment, { name: 'Zod Test Experiment' });
    expect(exp).toBeDefined();
    expect(exp.id).toBeDefined();
    expect(exp.name).toBe('Zod Test Experiment');
  });

  it('Module 2: rejects malformed plate layouts and well coordinates', async () => {
    const exp = await callFn<any, any>(startExperiment, { name: 'Plate Zod Test' });

    // Invalid well count (e.g. 15 wells - not 24/48/96/384)
    await expect(
      callFn(configurePlateLayout, { experimentId: exp.id, label: 'Plate 1', wellCount: 15 }),
    ).rejects.toThrow();

    // Invalid empty coordinate
    await expect(
      callFn(updateWellState, { experimentId: exp.id, plateId: 'plate_1', coordinate: '' }),
    ).rejects.toThrow();

    // Valid plate configuration
    const plate = await callFn<any, any>(configurePlateLayout, {
      experimentId: exp.id,
      label: 'Plate 1',
      wellCount: 24,
      media: 'LB Agar',
    });
    expect(plate.wells).toHaveLength(24);
  });

  it('Module 3: rejects malformed voice intents and logs', async () => {
    const exp = await callFn<any, any>(startExperiment, { name: 'Voice Zod Test' });

    // Empty transcript
    await expect(
      callFn(ingestVoiceIntent, { experimentId: exp.id, transcript: '', intent: {} }),
    ).rejects.toThrow();

    // Confidence out of range (< 0 or > 1)
    await expect(
      callFn(getVoiceAuditLogs, { experimentId: exp.id, minConfidence: 2.5 }),
    ).rejects.toThrow();

    // Missing required transcripts
    await expect(
      callFn(retryFailedUtterance, { experimentId: exp.id, logId: 'log_1' }),
    ).rejects.toThrow();
  });

  it('Module 4: rejects invalid camera frames and perception requests', async () => {
    // Empty base64
    await expect(
      callFn(ingestCameraFrame, { experimentId: 'exp_1', base64Data: '', width: 640, height: 480, rotationDeg: 0 }),
    ).rejects.toThrow();

    // Invalid negative width
    await expect(
      callFn(ingestCameraFrame, { experimentId: 'exp_1', base64Data: 'data:image/jpeg;base64,abc', width: -100 }),
    ).rejects.toThrow();

    // Empty wellId for colony detection
    await expect(
      callFn(requestColonyDetection, { wellId: '', frameRef: 'frame_1' }),
    ).rejects.toThrow();
  });

  it('Module 5: validates pathway database queries and recipe recommendations', async () => {
    // Empty taxon name
    await expect(
      callFn(queryPathwayDatabase, { taxonName: '' }),
    ).rejects.toThrow();

    // Empty wellId
    await expect(
      callFn(getRecipeRecommendation, { wellId: '' }),
    ).rejects.toThrow();

    // Valid pathway query
    const res = await callFn<any, any>(queryPathwayDatabase, { taxonName: 'Escherichia' });
    expect(res.targetTaxa).toBe('Escherichia');
  });

  it('Module 6: validates offline sync event batches', async () => {
    // Empty events array
    await expect(
      callFn(flushBufferedEvents, { experimentId: 'exp_1', events: [] }),
    ).rejects.toThrow();

    // Negative clientQueueDepth
    await expect(
      callFn(getSyncStatus, { experimentId: 'exp_1', clientQueueDepth: -5 }),
    ).rejects.toThrow();
  });

  it('Module 7: validates ELN report formats and standardized exports', async () => {
    // Invalid report format
    await expect(
      callFn(generateElnReport, { experimentId: 'exp_1', format: 'INVALID' }),
    ).rejects.toThrow();

    // Invalid export format (must be ISA_TAB or JSON)
    await expect(
      callFn(exportStandardized, { experimentId: 'exp_1', format: 'PDF' }),
    ).rejects.toThrow();
  });

  it('Module 8: validates telemetry event queries and compensating events', async () => {
    // Empty targetEventId for compensating event
    await expect(
      callFn(logCompensatingEvent, { experimentId: 'exp_1', targetEventId: '', correctionPayload: {} }),
    ).rejects.toThrow();

    // Invalid correction payload
    await expect(
      callFn(logCompensatingEvent, { experimentId: 'exp_1', targetEventId: 'evt_1' }),
    ).rejects.toThrow();
  });

  it('Module 9 & 10: validates active state and observability metrics', async () => {
    // Empty experimentId for active state
    await expect(
      callFn(getActiveState, { experimentId: '' }),
    ).rejects.toThrow();

    // Invalid timeWindowMinutes (< 1)
    await expect(
      callFn(getSystemMetrics, { timeWindowMinutes: 0 }),
    ).rejects.toThrow();

    // Valid system metrics call
    const metrics = await callFn<any, any>(getSystemMetrics, { timeWindowMinutes: 60 });
    expect(metrics.serverStatus).toBe('HEALTHY');
    expect(metrics.memoryUsageMb.heapUsed).toBeGreaterThan(0);
  });
});
