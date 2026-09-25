/**
 * test/integration/full-31-endpoints.test.ts
 *
 * End-to-end integration test validating ALL 31 API endpoints across 10 modules
 * for Project K.O.C.H. (Kinetic Operator for Culturomics & Handling).
 */

delete process.env.CLOUD_VISION_ENDPOINT;
delete process.env.CLOUD_VISION_API_KEY;

// Import all 10 module server functions directly
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
  generateWellCoordinates,
} from '../../src/server/functions/plate';

import {
  handleVoicePipelineWebhook,
  resolveIntent,
} from '../../src/server/webhooks/voice-pipeline';

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

import { createHmac } from 'crypto';
import { EventType, ExperimentStatus } from '../../src/server/db/repositories';

// ─── Test Harness ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
    failures.push(message);
  }
}

function assertNotNull<T>(value: T | null | undefined, message: string): T {
  if (value !== null && value !== undefined) {
    console.log(`  [PASS] ${message}`);
    passed++;
    return value;
  }
  console.error(`  [FAIL] (null/undefined): ${message}`);
  failed++;
  failures.push(message);
  throw new Error(`Assertion failed: ${message}`);
}

function banner(title: string): void {
  console.log(`\n========================================================================`);
  console.log(`  ${title}`);
  console.log(`========================================================================`);
}

import { runWithStartContext } from '@tanstack/start-storage-context';

// ─── Helper to execute ServerFn in Node test runner ───────────────────────────
async function callFn<TInput, TOutput>(
  serverFn: any,
  data: TInput,
): Promise<TOutput> {
  const dummyContext = {
    getRouter: () => ({}) as any,
    request: new Request('http://localhost:3000'),
    startOptions: {},
    contextAfterGlobalMiddlewares: {},
    executedRequestMiddlewares: new Set(),
    handlerType: 'serverFn' as const,
  };

  return await runWithStartContext(dummyContext as any, async () => {
    const res = await serverFn({ data });
    return res;
  });
}

// ─── Main Test Runner ────────────────────────────────────────────────────────

async function runAll31EndpointsTest(): Promise<void> {
  console.log('\nStarting Full 31-Endpoint Architecture Test for Project K.O.C.H...\n');

  // ============================================================================
  banner('Module 1: Experiments (6 Endpoints)');
  // ============================================================================

  // #1: startExperiment
  const expName = `E2E Culturomics Run ${Date.now()}`;
  const experiment = await callFn<any, any>(startExperiment, { name: expName });

  assert(experiment && experiment.id.length > 0, '#1 startExperiment - created experiment with ID');
  assert(experiment.status === ExperimentStatus.ACTIVE, '#1 startExperiment - initial status is ACTIVE');

  // #2: getExperiment
  const retrievedExp = await callFn<any, any>(getExperiment, { experimentId: experiment.id });
  assertNotNull(retrievedExp, '#2 getExperiment - successfully retrieved experiment by ID');
  assert(retrievedExp?.name === expName, '#2 getExperiment - name matches');

  // #3: listExperiments
  const expList = await callFn<any, any>(listExperiments, { page: 1, limit: 10, status: ExperimentStatus.ACTIVE, search: 'Culturomics' });
  assert(expList.experiments.length > 0, '#3 listExperiments - returned active experiments');
  assert(expList.total >= 1, '#3 listExperiments - total count is >= 1');
  assert(expList.experiments.some((e: any) => e.id === experiment.id), '#3 listExperiments - contains current run');

  // #4: updateExperimentStatus
  const updatedExp = await callFn<any, any>(updateExperimentStatus, { experimentId: experiment.id, status: ExperimentStatus.COMPLETED });
  assert(updatedExp.status === ExperimentStatus.COMPLETED, '#4 updateExperimentStatus - updated to COMPLETED');
  // Revert back to ACTIVE for subsequent tests
  await callFn<any, any>(updateExperimentStatus, { experimentId: experiment.id, status: ExperimentStatus.ACTIVE });

  // #5: archiveExperiment
  const tempExp = await callFn<any, any>(startExperiment, { name: 'Temp Exp for Archiving' });
  const archivedExp = await callFn<any, any>(archiveExperiment, { experimentId: tempExp.id, reason: 'Test archive completed' });
  assert(archivedExp.status === ExperimentStatus.ARCHIVED, '#5 archiveExperiment - status set to ARCHIVED with reason');

  // #6: exportStandardized (ISA-Tab & JSON)
  const jsonExport = await callFn<any, any>(exportStandardized, { experimentId: experiment.id, format: 'JSON' });
  assert(jsonExport.format === 'JSON', '#6 exportStandardized - JSON format generated');
  assert(jsonExport.storageUrl.startsWith('export://'), '#6 exportStandardized - JSON export saved with export:// storage URI');

  const isaTabExport = await callFn<any, any>(exportStandardized, { experimentId: experiment.id, format: 'ISA_TAB' });
  assert(isaTabExport.format === 'ISA_TAB', '#6 exportStandardized - ISA-Tab format generated');
  assert(isaTabExport.storageUrl.startsWith('export://'), '#6 exportStandardized - ISA-Tab export saved with export:// storage URI');


  // ============================================================================
  banner('Module 2: Plate Layout & Well Tracking (5 Endpoints)');
  // ============================================================================

  // #7: configurePlateLayout
  const plate = await callFn<any, any>(configurePlateLayout, {
    experimentId: experiment.id,
    label: 'Plate 1',
    wellCount: 24,
    media: 'LB Agar + Kanamycin',
  });
  assert(plate.wells.length === 24, '#7 configurePlateLayout - created plate with 24 wells and media');

  // #8: getPlateLayout
  const fetchedPlate = await callFn<any, any>(getPlateLayout, { plateId: plate.id });
  assertNotNull(fetchedPlate, '#8 getPlateLayout - fetched plate layout with wells');
  assert(fetchedPlate?.wells.length === 24, '#8 getPlateLayout - wells count matches');

  // #9: updateWellState
  const wellUpdateRes = await callFn<any, any>(updateWellState, {
    experimentId: experiment.id,
    plateId: plate.id,
    coordinate: 'C3',
    state: { opticalDensity600: 0.42 },
    media: 'Nutrient Broth + 2% Glucose',
    note: 'Inoculated from glycerol stock',
  });
  assert(wellUpdateRes.success === true && wellUpdateRes.coordinate === 'C3', '#9 updateWellState - updated well C3 state');

  // #10: batchUpdateWells
  const batchRes = await callFn<any, any>(batchUpdateWells, {
    experimentId: experiment.id,
    plateId: plate.id,
    updates: [
      { coordinate: 'A1', contents: 'Negative Control', status: 'UNINOCULATED' },
      { coordinate: 'A2', contents: 'Strain DSM-201', status: 'INOCULATED' },
    ],
    capturedAt: new Date().toISOString(),
  });
  assert(batchRes.success === true && batchRes.updatedCount === 2, '#10 batchUpdateWells - batch updated 2 wells');

  // #11: getWellHistory
  const wellHistory = await callFn<any, any>(getWellHistory, {
    plateId: plate.id,
    coordinate: 'C3',
  });
  assert(wellHistory.events.length >= 1, '#11 getWellHistory - retrieved chronological well events by coordinate');
  assert(wellHistory.well?.coordinate === 'C3', '#11 getWellHistory - well coordinate is C3');


  // ============================================================================
  banner('Module 3: Voice Intent & Webhooks (5 Endpoints)');
  // ============================================================================

  // #12: POST /api/webhooks/livekit-transcript
  const livekitSecret = 'test-livekit-secret';
  const kochSecret = 'test-koch-key';
  process.env.LIVEKIT_API_SECRET = livekitSecret;
  process.env.KOCH_API_KEY_SECRET = kochSecret;

  const webhookBody = {
    event: 'transcript_ready',
    experimentId: experiment.id,
    transcript: 'mark plate 1 well C3',
    frameTimestamp: new Date().toISOString(),
  };
  const rawBody = Buffer.from(JSON.stringify(webhookBody));
  const signature = 'sha256=' + createHmac('sha256', livekitSecret).update(rawBody).digest('hex');

  const webhookResponse = await handleVoicePipelineWebhook({
    rawBody,
    body: webhookBody,
    headers: {
      'x-livekit-signature': signature,
      'x-koch-api-key': kochSecret,
    },
  });
  assert(webhookResponse.status === 200, '#12 webhook /api/webhooks/livekit-transcript - accepted signed webhook');

  // #13: ingestVoiceIntent
  const voiceIntentEvent = await callFn<any, any>(ingestVoiceIntent, {
    experimentId: experiment.id,
    transcript: 'add tube TB-409',
    intent: { action: 'ADD_TUBE', tubeId: 'TB-409' },
  });
  assert(voiceIntentEvent.type === EventType.INTENT, '#13 ingestVoiceIntent - persisted INTENT event');

  // #14: getVoiceAuditLogs
  const voiceAudit = await callFn<any, any>(getVoiceAuditLogs, {
    experimentId: experiment.id,
    limit: 50,
    minConfidence: 0.1,
  });
  assert(voiceAudit.totalEvents >= 1 && Array.isArray(voiceAudit.entries), '#14 getVoiceAuditLogs - retrieved voice audit log report');
  assert(typeof voiceAudit.averageConfidence === 'number', '#14 getVoiceAuditLogs - average confidence computed');

  // #15: retryFailedUtterance
  const retryResult = await callFn<any, any>(retryFailedUtterance, {
    experimentId: experiment.id,
    logId: 'failed_log_101',
    correctedTranscript: 'mark plate 1 well C3',
  });
  assert(retryResult.type === EventType.INTENT, '#15 retryFailedUtterance - reprocessed and logged recovery event');

  // #16: streamVoiceSession
  const sessionInfo = await callFn<any, any>(streamVoiceSession, {
    experimentId: experiment.id,
    participantIdentity: 'operator-1',
  });
  assert(sessionInfo.sessionToken.length > 0, '#16 streamVoiceSession - generated voice session credentials');
  assert(sessionInfo.status === 'CONNECTED', '#16 streamVoiceSession - session status is CONNECTED');


  // ============================================================================
  banner('Module 4: Camera & Vision Telemetry (4 Endpoints)');
  // ============================================================================

  // #17: WebSocket /api/ws/camera (ingestCameraFrame & getCameraBufferStatus)
  const cameraFrame = await callFn<any, any>(ingestCameraFrame, {
    experimentId: experiment.id,
    base64Data: 'data:image/jpeg;base64,mockrawjpegdata==',
    width: 640,
    height: 480,
    rotationDeg: 0,
  });
  assert(cameraFrame.frameId.startsWith('frame_'), '#17 ingestCameraFrame - buffered chunked RGB frame');

  const bufferStats = await callFn<any, any>(getCameraBufferStatus, { experimentId: experiment.id });
  assert(bufferStats.bufferedFrameCount >= 1, '#17 getCameraBufferStatus - buffer stats verified');

  // #18: ingestFrameMark
  const wellC3 = fetchedPlate?.wells.find((w: any) => w.coordinate === 'C3');
  assertNotNull(wellC3, 'Found well C3 for frame marking');

  const frameMarkEvent = await callFn<any, any>(ingestFrameMark, {
    experimentId: experiment.id,
    wellId: wellC3?.id,
    frameTimestamp: new Date(),
  });
  assert(frameMarkEvent.type === EventType.FRAME_MARK, '#18 ingestFrameMark - correlated and logged FRAME_MARK event');

  // #19: requestColonyDetection
  const detection = await callFn<any, any>(requestColonyDetection, {
    wellId: wellC3?.id,
    frameRef: 'mock://frame_c3_001.jpg',
  });
  assert(detection.id.length > 0 && detection.confidence > 0, '#19 requestColonyDetection - returned micro-colony detection');

  // #20: getVisionDetections
  const detections = await callFn<any, any>(getVisionDetections, {
    wellId: wellC3?.id,
  });
  assert(detections.length >= 1, '#20 getVisionDetections - fetched colony detections for well');


  // ============================================================================
  banner('Module 5: Pathways & Recipes (2 Endpoints)');
  // ============================================================================

  // #21: queryPathwayDatabase
  const pathwayRes = await callFn<any, any>(queryPathwayDatabase, {
    taxonName: 'Clostridium',
    missingNutrients: ['Thiamine', 'Cobalamin'],
    carbonSource: 'Cellobiose',
  });
  assert(pathwayRes.targetTaxa === 'Clostridium', '#21 queryPathwayDatabase - queried taxa pathways');
  assert(pathwayRes.recommendedMediaComposition.requiredNutrients.length > 0, '#21 queryPathwayDatabase - suggested essential nutrients');
  assert(pathwayRes.auxotrophicGapsIdentified.length === 2, '#21 queryPathwayDatabase - identified auxotrophic gaps');

  // #22: getRecipeRecommendation
  const recipeRec = await callFn<any, any>(getRecipeRecommendation, {
    wellId: wellC3?.id,
  });
  assert(recipeRec.wellId === wellC3?.id, '#22 getRecipeRecommendation - computed recommendation for well');
  assert(recipeRec.voiceConfirmation.length > 0, '#22 getRecipeRecommendation - generated concise voice confirmation');


  // ============================================================================
  banner('Module 6: Offline Sync & Resilience (2 Endpoints)');
  // ============================================================================

  // #23: flushBufferedEvents
  const flushResult = await callFn<any, any>(flushBufferedEvents, {
    experimentId: experiment.id,
    events: [
      {
        type: EventType.VOICE_UTTERANCE,
        payload: { transcript: 'offline voice command' },
        capturedAt: new Date(Date.now() - 5000),
      },
      {
        type: EventType.INTENT,
        payload: { action: 'START_TIMER' },
        capturedAt: new Date(Date.now() - 3000),
      },
    ],
  });
  assert(flushResult.success === true && flushResult.insertedCount === 2, '#23 flushBufferedEvents - flushed 2 buffered offline events');

  // #24: getSyncStatus
  const syncStatus = await callFn<any, any>(getSyncStatus, {
    experimentId: experiment.id,
    clientQueueDepth: 0,
  });
  assert(syncStatus.syncState === 'SYNCED', '#24 getSyncStatus - sync state is SYNCED');
  assert(syncStatus.serverEventCount > 0, '#24 getSyncStatus - tracked server event count');


  // ============================================================================
  banner('Module 7: Automated ELN Reports (2 Endpoints)');
  // ============================================================================

  // #25: generateElnReport
  const elnReportRecord = await callFn<any, any>(generateElnReport, {
    experimentId: experiment.id,
    format: 'MARKDOWN',
  });
  assert(elnReportRecord.id.length > 0, '#25 generateElnReport - generated and saved ELN report record');

  // #26: downloadElnReport
  const downloadedReport = await callFn<any, any>(downloadElnReport, {
    experimentId: experiment.id,
    format: 'MARKDOWN',
  });
  assert(downloadedReport.content.includes('K.O.C.H. Electronic Lab Notebook'), '#26 downloadElnReport - returned ELN report content');
  assert(downloadedReport.mimeType.includes('markdown'), '#26 downloadElnReport - correct MIME type');


  // ============================================================================
  banner('Module 8: Event Stream & Audit Trail (2 Endpoints)');
  // ============================================================================

  // #27: getExperimentEvents
  const eventStream = await callFn<any, any>(getExperimentEvents, {
    experimentId: experiment.id,
    limit: 100,
  });
  assert(eventStream.events.length > 0, '#27 getExperimentEvents - retrieved chronological telemetry event stream');

  // #28: logCompensatingEvent
  const compensatingEvent = await callFn<any, any>(logCompensatingEvent, {
    experimentId: experiment.id,
    targetEventId: 'mock-target-id',
    correctionPayload: { reason: 'Correct operator tube ID input error', oldTube: 'TB-01', newTube: 'TB-02' },
  });
  assert(compensatingEvent.type === EventType.STATE_CHANGE, '#28 logCompensatingEvent - logged compensating event to preserve audit trail');


  // ============================================================================
  banner('Module 9: Active State Sync (1 Endpoint)');
  // ============================================================================

  // #29: getActiveState
  const activeState = await callFn<any, any>(getActiveState, {
    experimentId: experiment.id,
  });
  assertNotNull(activeState, '#29 getActiveState - retrieved active state snapshot');
  assert(activeState?.experimentId === experiment.id, '#29 getActiveState - experiment ID matches');


  // ============================================================================
  banner('Module 10: System Observability & Metrics (2 Endpoints)');
  // ============================================================================

  // #30: getSystemMetrics
  const systemMetrics = await callFn<any, any>(getSystemMetrics, {
    timeWindowMinutes: 60,
  });
  assert(systemMetrics.serverStatus === 'HEALTHY', '#30 getSystemMetrics - returned server status HEALTHY');
  assert(systemMetrics.memoryUsageMb.heapUsed > 0, '#30 getSystemMetrics - tracked memory usage');

  // #31: getQuotaMonitoring
  const quotaMonitoring = await callFn<any, any>(getQuotaMonitoring, {});
  assert(quotaMonitoring.overallStatus === 'NOMINAL', '#31 getQuotaMonitoring - verified nominal $0 free-tier API quotas');
  assert(quotaMonitoring.livekit.status === 'NOMINAL', '#31 getQuotaMonitoring - LiveKit quota is nominal');
  assert(quotaMonitoring.cloudVision.status === 'NOMINAL', '#31 getQuotaMonitoring - Cloud Vision quota is nominal');


  // ============================================================================
  banner('TEST RESULTS SUMMARY');
  // ============================================================================
  console.log(`\nTotal Assertions Passed: ${passed}`);
  console.log(`Total Assertions Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nFailures:\n' + failures.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  } else {
    console.log('\n🌟 ALL 31 API ENDPOINTS PASSED DIRECT SERVER FUNCTION CALLS WITH ZERO REGRESSIONS! 🌟\n');
  }
}

import { test } from 'vitest';

test('All 31 API endpoints', async () => {
  await runAll31EndpointsTest();
}, 30000);
